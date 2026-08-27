/**
 * Redis Storage Adapter for Memory
 * Stores conversations and messages in Redis using strings, hashes and sorted sets
 */

import { randomUUID } from "node:crypto";
import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type {
  Conversation,
  ConversationQueryOptions,
  ConversationStepRecord,
  CreateConversationInput,
  GetConversationStepsOptions,
  GetMessagesOptions,
  StorageAdapter,
  WorkflowRunQuery,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import { type ChainableCommander, Redis, type RedisOptions } from "ioredis";

/**
 * Redis configuration options for Memory
 */
export interface RedisMemoryOptions {
  /**
   * Redis connection configuration
   * Can be either a connection string (e.g. "redis://localhost:6379")
   * or an ioredis options object
   */
  connection: string | RedisOptions;

  /**
   * Prefix for all Redis keys managed by this adapter
   * @default "voltagent"
   */
  keyPrefix?: string;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Message payload stored in Redis (dates are serialized as ISO strings)
 */
type StoredMessage = UIMessage & {
  userId: string;
  conversationId: string;
  createdAt: string;
};

/**
 * Redis Storage Adapter for Memory
 * Low-latency storage for conversations, messages, working memory and workflow state
 *
 * Key layout (assuming the default "voltagent" prefix):
 * - `voltagent:conv:{id}`                    STRING  serialized conversation
 * - `voltagent:convs:all`                    ZSET    conversation ids scored by creation time
 * - `voltagent:convs:resource:{resourceId}`  ZSET    conversation ids per resource
 * - `voltagent:convs:user:{userId}`          ZSET    conversation ids per user
 * - `voltagent:msgs:{conversationId}`        ZSET    message ids scored by creation time
 * - `voltagent:msgdata:{conversationId}`     HASH    message id -> serialized message
 * - `voltagent:steps:{conversationId}`       ZSET    step ids scored by creation time
 * - `voltagent:stepdata:{conversationId}`    HASH    step id -> serialized step
 * - `voltagent:wm:conv:{conversationId}`     STRING  working memory (conversation scope)
 * - `voltagent:wm:user:{userId}`             STRING  working memory (user scope)
 * - `voltagent:wf:state:{executionId}`       STRING  serialized workflow state
 * - `voltagent:wf:all`                       ZSET    execution ids scored by creation time
 * - `voltagent:wf:idx:{workflowId}`          ZSET    execution ids per workflow
 * - `voltagent:wf:suspended:{workflowId}`    SET     suspended execution ids per workflow
 */
export class RedisMemoryAdapter implements StorageAdapter {
  private client: Redis;
  private keyPrefix: string;
  private debug: boolean;
  private lastMessageScore = 0;

  constructor(options: RedisMemoryOptions) {
    this.keyPrefix = options.keyPrefix ?? "voltagent";
    this.debug = options.debug ?? false;

    // ioredis accepts both a connection string and an options object;
    // the branches are needed because its constructor overloads don't take a union
    this.client =
      typeof options.connection === "string"
        ? new Redis(options.connection)
        : new Redis(options.connection);

    // Swallow client error events so they don't crash the process;
    // surface them through debug logging instead
    this.client.on("error", (error) => {
      this.log("Redis client error:", error.message);
    });

    this.log("Redis Memory V2 adapter initialized");
  }

  /**
   * Log debug messages
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[Redis Memory V2]", ...args);
    }
  }

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return randomUUID();
  }

  /**
   * Build a fully prefixed Redis key
   */
  private key(...parts: string[]): string {
    return [this.keyPrefix, ...parts].join(":");
  }

  /**
   * Parse JSON written by this adapter, tolerating corrupted or manually
   * modified entries instead of throwing
   */
  private safeParse<T>(raw: string, context: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      this.log(`Failed to parse ${context}:`, error);
      return null;
    }
  }

  /**
   * Execute a pipeline and throw if any of its commands failed,
   * so partial multi-key writes never go unnoticed
   */
  private async execChecked(pipeline: ChainableCommander): Promise<[Error | null, unknown][]> {
    const results = await pipeline.exec();
    if (!results) {
      return [];
    }
    for (const [error] of results) {
      if (error) {
        throw error;
      }
    }
    return results;
  }

  /**
   * Build the Redis key for working memory entries, validating that the
   * identifier required by the scope is present
   */
  private workingMemoryKey(
    scope: WorkingMemoryScope,
    conversationId?: string,
    userId?: string,
  ): string {
    if (scope === "conversation") {
      if (!conversationId) {
        throw new Error('conversationId is required when working memory scope is "conversation"');
      }
      return this.key("wm", "conv", conversationId);
    }
    if (!userId) {
      throw new Error('userId is required when working memory scope is "user"');
    }
    return this.key("wm", "user", userId);
  }

  /**
   * Fetch conversations by id in a single pipeline round trip
   */
  private async getConversationsByIds(ids: string[]): Promise<Conversation[]> {
    if (ids.length === 0) {
      return [];
    }
    const pipeline = this.client.pipeline();
    for (const id of ids) {
      pipeline.get(this.key("conv", id));
    }
    const results = await this.execChecked(pipeline);

    const conversations: Conversation[] = [];
    for (const [, raw] of results) {
      if (typeof raw !== "string") continue;
      const conversation = this.safeParse<Conversation>(raw, "conversation");
      if (conversation) {
        conversations.push(conversation);
      }
    }
    return conversations;
  }

  /**
   * Sort conversations the same way the SQL adapters do
   */
  private sortConversations(
    conversations: Conversation[],
    orderBy: "created_at" | "updated_at" | "title" = "updated_at",
    orderDirection: "ASC" | "DESC" = "DESC",
  ): Conversation[] {
    const sorted = [...conversations].sort((a, b) => {
      if (orderBy === "title") {
        return a.title.localeCompare(b.title);
      }
      const aTime = Date.parse(orderBy === "created_at" ? a.createdAt : a.updatedAt);
      const bTime = Date.parse(orderBy === "created_at" ? b.createdAt : b.updatedAt);
      return aTime - bTime;
    });
    if (orderDirection === "DESC") {
      sorted.reverse();
    }
    return sorted;
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Monotonic score for message ordering, so messages written within the
   * same millisecond keep their insertion order in the sorted set
   */
  private nextMessageScore(time: number): number {
    this.lastMessageScore = Math.max(time, this.lastMessageScore + 1);
    return this.lastMessageScore;
  }

  /**
   * Queue the Redis commands needed to persist a single message
   */
  private enqueueMessage(
    pipeline: ChainableCommander,
    message: UIMessage,
    userId: string,
    conversationId: string,
  ): void {
    const messageId = message.id || this.generateId();
    const createdAt = new Date();
    const entry: StoredMessage = {
      ...message,
      id: messageId,
      userId,
      conversationId,
      createdAt: createdAt.toISOString(),
    };

    pipeline.zadd(
      this.key("msgs", conversationId),
      this.nextMessageScore(createdAt.getTime()),
      messageId,
    );
    pipeline.hset(this.key("msgdata", conversationId), messageId, safeStringify(entry));
  }

  async addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const pipeline = this.client.pipeline();
    this.enqueueMessage(pipeline, message, userId, conversationId);
    await this.execChecked(pipeline);

    this.log(`Added message to conversation ${conversationId}`);
  }

  /**
   * Add multiple messages in a single pipeline round trip
   */
  async addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (messages.length === 0) {
      return;
    }

    const pipeline = this.client.pipeline();
    for (const message of messages) {
      this.enqueueMessage(pipeline, message, userId, conversationId);
    }
    await this.execChecked(pipeline);

    this.log(`Added ${messages.length} messages to conversation ${conversationId}`);
  }

  /**
   * Get messages with optional filtering
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    const { limit, before, after, roles } = options || {};

    // Sorted set order is chronological (score, then member)
    const ids = await this.client.zrange(this.key("msgs", conversationId), 0, -1);
    const entries = await this.client.hgetall(this.key("msgdata", conversationId));

    const matched: Array<{ entry: StoredMessage; time: number }> = [];
    for (const id of ids) {
      const raw = entries[id];
      if (!raw) continue;
      const entry = this.safeParse<StoredMessage>(raw, "message");
      if (!entry) continue;
      if (entry.userId !== userId) continue;
      if (roles && roles.length > 0 && !roles.includes(entry.role)) continue;

      const time = Date.parse(entry.createdAt);
      if (before && time >= before.getTime()) continue;
      if (after && time <= after.getTime()) continue;

      matched.push({ entry, time });
    }

    // Most recent first, apply limit, then restore chronological order
    matched.reverse();
    const limited = limit && limit > 0 ? matched.slice(0, limit) : matched;
    limited.reverse();

    return limited.map(({ entry }) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
      metadata: {
        ...(entry.metadata || {}),
        createdAt: new Date(entry.createdAt),
      },
    }));
  }

  /**
   * Clear messages for a user, optionally scoped to a single conversation.
   * Matching the SQL adapters: when a conversation is given, only messages and
   * steps owned by the user are removed; other users' entries in the same
   * conversation are kept
   */
  async clearMessages(userId: string, conversationId?: string): Promise<void> {
    if (conversationId) {
      const [messageEntries, stepEntries] = await Promise.all([
        this.client.hgetall(this.key("msgdata", conversationId)),
        this.client.hgetall(this.key("stepdata", conversationId)),
      ]);

      const messageIds = Object.entries(messageEntries)
        .filter(([, raw]) => this.safeParse<StoredMessage>(raw, "message")?.userId === userId)
        .map(([id]) => id);
      const stepIds = Object.entries(stepEntries)
        .filter(
          ([, raw]) =>
            this.safeParse<ConversationStepRecord>(raw, "conversation step")?.userId === userId,
        )
        .map(([id]) => id);

      const pipeline = this.client.pipeline();
      if (messageIds.length > 0) {
        pipeline.zrem(this.key("msgs", conversationId), ...messageIds);
        pipeline.hdel(this.key("msgdata", conversationId), ...messageIds);
      }
      if (stepIds.length > 0) {
        pipeline.zrem(this.key("steps", conversationId), ...stepIds);
        pipeline.hdel(this.key("stepdata", conversationId), ...stepIds);
      }
      await this.execChecked(pipeline);

      this.log(`Cleared messages for user ${userId} in conversation ${conversationId}`);
      return;
    }

    // Clear messages for every conversation owned by the user
    const ids = await this.client.zrange(this.key("convs", "user", userId), 0, -1);
    const pipeline = this.client.pipeline();
    for (const id of ids) {
      pipeline.del(this.key("msgs", id));
      pipeline.del(this.key("msgdata", id));
      pipeline.del(this.key("steps", id));
      pipeline.del(this.key("stepdata", id));
    }

    await this.execChecked(pipeline);
    this.log(`Cleared messages for user ${userId}`);
  }

  /**
   * Delete specific messages by ID for a conversation
   * Only messages owned by the given user are removed, matching the SQL adapters
   */
  async deleteMessages(
    messageIds: string[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    const entries = await this.client.hgetall(this.key("msgdata", conversationId));
    const ownedIds = messageIds.filter((id) => {
      const raw = entries[id];
      if (!raw) return false;
      const entry = this.safeParse<StoredMessage>(raw, "message");
      return entry?.userId === userId;
    });

    if (ownedIds.length === 0) {
      return;
    }

    const pipeline = this.client.pipeline();
    pipeline.zrem(this.key("msgs", conversationId), ...ownedIds);
    pipeline.hdel(this.key("msgdata", conversationId), ...ownedIds);
    await this.execChecked(pipeline);

    this.log(`Deleted ${ownedIds.length} messages from conversation ${conversationId}`);
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: input.id,
      resourceId: input.resourceId,
      userId: input.userId,
      title: input.title,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    // Atomic "create if not exists" to avoid duplicate conversations on races
    const created = await this.client.set(
      this.key("conv", input.id),
      safeStringify(conversation),
      "NX",
    );
    if (created === null) {
      throw new ConversationAlreadyExistsError(input.id);
    }

    const score = Date.parse(now);
    const pipeline = this.client.pipeline();
    pipeline.zadd(this.key("convs", "all"), score, input.id);
    pipeline.zadd(this.key("convs", "resource", input.resourceId), score, input.id);
    pipeline.zadd(this.key("convs", "user", input.userId), score, input.id);
    await this.execChecked(pipeline);

    this.log(`Created conversation ${input.id}`);
    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const raw = await this.client.get(this.key("conv", id));
    if (!raw) {
      return null;
    }
    return this.safeParse<Conversation>(raw, `conversation ${id}`);
  }

  /**
   * Get conversations by resource ID
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    const ids = await this.client.zrange(this.key("convs", "resource", resourceId), 0, -1);
    const conversations = await this.getConversationsByIds(ids);
    return this.sortConversations(conversations);
  }

  /**
   * Get conversations by user ID
   */
  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    return this.queryConversations({ ...options, userId });
  }

  /**
   * Query conversations with filters
   */
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    // Pick the narrowest index available for the candidate set
    let indexKey: string;
    if (options.userId) {
      indexKey = this.key("convs", "user", options.userId);
    } else if (options.resourceId) {
      indexKey = this.key("convs", "resource", options.resourceId);
    } else {
      indexKey = this.key("convs", "all");
    }

    const ids = await this.client.zrange(indexKey, 0, -1);
    let conversations = await this.getConversationsByIds(ids);

    if (options.userId) {
      conversations = conversations.filter((c) => c.userId === options.userId);
    }
    if (options.resourceId) {
      conversations = conversations.filter((c) => c.resourceId === options.resourceId);
    }

    conversations = this.sortConversations(
      conversations,
      options.orderBy || "updated_at",
      options.orderDirection || "DESC",
    );

    const offset = options.offset ?? 0;
    if (options.limit && options.limit > 0) {
      return conversations.slice(offset, offset + options.limit);
    }
    return conversations.slice(offset);
  }

  /**
   * Count conversations with filters
   */
  async countConversations(options: ConversationQueryOptions): Promise<number> {
    const conversations = await this.queryConversations({
      userId: options.userId,
      resourceId: options.resourceId,
    });
    return conversations.length;
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    const existing = await this.getConversation(id);
    if (!existing) {
      throw new ConversationNotFoundError(id);
    }

    const updated: Conversation = {
      ...existing,
      title: updates.title !== undefined ? updates.title : existing.title,
      resourceId: updates.resourceId !== undefined ? updates.resourceId : existing.resourceId,
      userId: updates.userId !== undefined ? updates.userId : existing.userId,
      metadata: updates.metadata !== undefined ? updates.metadata : existing.metadata,
      updatedAt: new Date().toISOString(),
    };

    const pipeline = this.client.pipeline();
    pipeline.set(this.key("conv", id), safeStringify(updated));

    // Keep the secondary indexes in sync when indexed fields change
    if (updated.resourceId !== existing.resourceId) {
      pipeline.zrem(this.key("convs", "resource", existing.resourceId), id);
      pipeline.zadd(
        this.key("convs", "resource", updated.resourceId),
        Date.parse(updated.createdAt),
        id,
      );
    }
    if (updated.userId !== existing.userId) {
      pipeline.zrem(this.key("convs", "user", existing.userId), id);
      pipeline.zadd(this.key("convs", "user", updated.userId), Date.parse(updated.createdAt), id);
    }

    await this.execChecked(pipeline);

    this.log(`Updated conversation ${id}`);
    return updated;
  }

  /**
   * Delete a conversation and all of its associated data
   */
  async deleteConversation(id: string): Promise<void> {
    const conversation = await this.getConversation(id);

    const pipeline = this.client.pipeline();
    pipeline.del(this.key("conv", id));
    pipeline.del(this.key("msgs", id));
    pipeline.del(this.key("msgdata", id));
    pipeline.del(this.key("steps", id));
    pipeline.del(this.key("stepdata", id));
    pipeline.del(this.key("wm", "conv", id));

    if (conversation) {
      pipeline.zrem(this.key("convs", "all"), id);
      pipeline.zrem(this.key("convs", "resource", conversation.resourceId), id);
      pipeline.zrem(this.key("convs", "user", conversation.userId), id);
    }

    await this.execChecked(pipeline);

    this.log(`Deleted conversation ${id}`);
  }

  // ============================================================================
  // Conversation Steps Operations
  // ============================================================================

  async saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    if (steps.length === 0) {
      return;
    }

    const pipeline = this.client.pipeline();
    for (const step of steps) {
      const createdAt = step.createdAt ?? new Date().toISOString();
      pipeline.zadd(this.key("steps", step.conversationId), Date.parse(createdAt), step.id);
      pipeline.hset(
        this.key("stepdata", step.conversationId),
        step.id,
        safeStringify({ ...step, createdAt }),
      );
    }
    await this.execChecked(pipeline);

    this.log(`Saved ${steps.length} conversation steps`);
  }

  async getConversationSteps(
    userId: string,
    conversationId: string,
    options?: GetConversationStepsOptions,
  ): Promise<ConversationStepRecord[]> {
    const entries = await this.client.hgetall(this.key("stepdata", conversationId));

    const steps: ConversationStepRecord[] = [];
    for (const raw of Object.values(entries)) {
      const step = this.safeParse<ConversationStepRecord>(raw, "conversation step");
      if (!step) continue;
      if (step.userId !== userId) continue;
      if (options?.operationId && step.operationId !== options.operationId) continue;
      steps.push(step);
    }

    // Match the SQL adapters: chronological order by step index
    steps.sort(
      (a, b) => a.stepIndex - b.stepIndex || Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );

    if (options?.limit && options.limit > 0) {
      return steps.slice(0, options.limit);
    }
    return steps;
  }

  // ============================================================================
  // Working Memory Operations
  // ============================================================================

  /**
   * Get working memory
   */
  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null> {
    const key = this.workingMemoryKey(params.scope, params.conversationId, params.userId);
    return this.client.get(key);
  }

  /**
   * Set working memory
   */
  async setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    const key = this.workingMemoryKey(params.scope, params.conversationId, params.userId);
    await this.client.set(key, params.content);
    this.log(`Set working memory for ${params.scope} scope`);
  }

  /**
   * Delete working memory
   */
  async deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    const key = this.workingMemoryKey(params.scope, params.conversationId, params.userId);
    await this.client.del(key);
    this.log(`Deleted working memory for ${params.scope} scope`);
  }

  // ============================================================================
  // Workflow State Operations
  // ============================================================================

  /**
   * Revive dates after reading a serialized workflow state
   */
  private deserializeWorkflowState(raw: string): WorkflowStateEntry | null {
    const parsed = this.safeParse<WorkflowStateEntry>(raw, "workflow state");
    if (!parsed) {
      return null;
    }

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      suspension: parsed.suspension
        ? { ...parsed.suspension, suspendedAt: new Date(parsed.suspension.suspendedAt) }
        : undefined,
      cancellation: parsed.cancellation
        ? { ...parsed.cancellation, cancelledAt: new Date(parsed.cancellation.cancelledAt) }
        : undefined,
    };
  }

  /**
   * Get workflow state by execution ID
   */
  async getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    const raw = await this.client.get(this.key("wf", "state", executionId));
    if (!raw) {
      return null;
    }
    return this.deserializeWorkflowState(raw);
  }

  /**
   * Query workflow runs with filters
   */
  async queryWorkflowRuns(query: WorkflowRunQuery): Promise<WorkflowStateEntry[]> {
    const indexKey = query.workflowId
      ? this.key("wf", "idx", query.workflowId)
      : this.key("wf", "all");

    // Newest first, matching the SQL adapters
    const ids = await this.client.zrevrange(indexKey, 0, -1);
    if (ids.length === 0) {
      return [];
    }

    // Batch fetch all candidate states in a single round trip
    const pipeline = this.client.pipeline();
    for (const id of ids) {
      pipeline.get(this.key("wf", "state", id));
    }
    const results = await this.execChecked(pipeline);

    const states: WorkflowStateEntry[] = [];
    for (const [, raw] of results) {
      if (typeof raw !== "string") continue;
      const state = this.deserializeWorkflowState(raw);
      if (!state) continue;
      if (query.status && state.status !== query.status) continue;
      if (query.userId && state.userId !== query.userId) continue;
      if (query.from && state.createdAt < query.from) continue;
      if (query.to && state.createdAt > query.to) continue;
      if (query.metadata) {
        const matches = Object.entries(query.metadata).every(
          ([key, value]) => state.metadata?.[key] === value,
        );
        if (!matches) continue;
      }
      states.push(state);
    }

    const offset = query.offset ?? 0;
    if (query.limit && query.limit > 0) {
      return states.slice(offset, offset + query.limit);
    }
    return states.slice(offset);
  }

  /**
   * Set (upsert) workflow state
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    const existing = await this.getWorkflowState(executionId);

    const score = state.createdAt.getTime();
    const pipeline = this.client.pipeline();
    pipeline.set(this.key("wf", "state", executionId), safeStringify(state));
    pipeline.zadd(this.key("wf", "all"), score, executionId);
    pipeline.zadd(this.key("wf", "idx", state.workflowId), score, executionId);

    if (state.status === "suspended") {
      pipeline.sadd(this.key("wf", "suspended", state.workflowId), executionId);
    } else {
      pipeline.srem(this.key("wf", "suspended", state.workflowId), executionId);
    }

    // Clean up stale indexes if the workflow id ever changes for an execution
    if (existing && existing.workflowId !== state.workflowId) {
      pipeline.zrem(this.key("wf", "idx", existing.workflowId), executionId);
      pipeline.srem(this.key("wf", "suspended", existing.workflowId), executionId);
    }

    await this.execChecked(pipeline);

    this.log(`Saved workflow state ${executionId}`);
  }

  /**
   * Update workflow state
   */
  async updateWorkflowState(
    executionId: string,
    updates: Partial<WorkflowStateEntry>,
  ): Promise<void> {
    const existing = await this.getWorkflowState(executionId);
    if (!existing) {
      throw new Error(`Workflow state ${executionId} not found`);
    }

    const updated: WorkflowStateEntry = {
      ...existing,
      ...updates,
      // Index-driving fields are immutable to keep the Redis indexes consistent
      id: existing.id,
      workflowId: existing.workflowId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    await this.setWorkflowState(executionId, updated);
  }

  /**
   * Get suspended workflow states for a workflow
   */
  async getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    const ids = await this.client.smembers(this.key("wf", "suspended", workflowId));
    if (ids.length === 0) {
      return [];
    }

    const pipeline = this.client.pipeline();
    for (const id of ids) {
      pipeline.get(this.key("wf", "state", id));
    }
    const results = await this.execChecked(pipeline);

    const states: WorkflowStateEntry[] = [];
    for (const [, raw] of results) {
      if (typeof raw !== "string") continue;
      const state = this.deserializeWorkflowState(raw);
      // Guard against stale index entries
      if (state && state.status === "suspended") {
        states.push(state);
      }
    }

    return states.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Disconnect the Redis client; safe to call more than once
   */
  async disconnect(): Promise<void> {
    if (this.isEnded()) {
      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      // A concurrent disconnect() may have closed the connection first
      if (this.isEnded()) {
        return;
      }
      throw error;
    }

    this.log("Redis connection closed");
  }

  /**
   * Whether the client connection has been closed
   */
  private isEnded(): boolean {
    return this.client.status === "end";
  }

  /**
   * Alias for disconnect(), matching the close() convention of other adapters
   */
  async close(): Promise<void> {
    await this.disconnect();
  }
}
