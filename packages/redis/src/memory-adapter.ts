/**
 * Redis Storage Adapter for VoltAgent Memory
 * Provides fast, in-memory persistence for conversations, messages,
 * working memory, and workflow state using Redis.
 */

import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type {
  Conversation,
  ConversationQueryOptions,
  ConversationStepRecord,
  CreateConversationInput,
  GetConversationStepsOptions,
  GetMessagesOptions,
  OperationContext,
  StorageAdapter,
  WorkflowRunQuery,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import Redis, { type RedisOptions } from "ioredis";

// ============================================================================
// Configuration
// ============================================================================

export interface RedisMemoryOptions {
  /**
   * Redis connection configuration.
   * Can be a connection URL string or ioredis options object.
   */
  connection: string | RedisOptions;

  /**
   * Key prefix for all Redis keys.
   * @default "voltagent"
   */
  keyPrefix?: string;

  /**
   * Whether to enable debug logging.
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// Adapter
// ============================================================================

export class RedisMemoryAdapter implements StorageAdapter {
  private client: Redis;
  private prefix: string;
  private debug: boolean;

  constructor(options: RedisMemoryOptions) {
    this.prefix = options.keyPrefix ?? "voltagent";
    this.debug = options.debug ?? false;

    if (typeof options.connection === "string") {
      this.client = new Redis(options.connection);
    } else {
      this.client = new Redis(options.connection);
    }
  }

  // ── Key helpers ──────────────────────────────────────────────────────

  private key(...parts: string[]): string {
    return [this.prefix, ...parts].join(":");
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[RedisMemory] ${message}`, data ? safeStringify(data) : "");
    }
  }

  // ── Conversation operations ──────────────────────────────────────────

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const existing = await this.client.exists(this.key("conv", input.id));
    if (existing) {
      throw new ConversationAlreadyExistsError(input.id);
    }

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: input.id,
      resourceId: input.resourceId,
      userId: input.userId,
      title: input.title,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const pipeline = this.client.pipeline();
    pipeline.set(this.key("conv", input.id), safeStringify(conversation));
    pipeline.zadd(this.key("convs:resource", input.resourceId), Date.now(), input.id);
    pipeline.zadd(this.key("convs:user", input.userId), Date.now(), input.id);
    pipeline.zadd(this.key("convs:all"), Date.now(), input.id);
    await pipeline.exec();

    this.log("createConversation", { id: input.id });
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const data = await this.client.get(this.key("conv", id));
    if (!data) return null;
    return JSON.parse(data) as Conversation;
  }

  async getConversations(resourceId: string): Promise<Conversation[]> {
    const ids = await this.client.zrevrange(this.key("convs:resource", resourceId), 0, -1);
    return this.getConversationsByIds(ids);
  }

  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    const ids = await this.client.zrevrange(this.key("convs:user", userId), 0, -1);
    const conversations = await this.getConversationsByIds(ids);
    return this.applyQueryOptions(conversations, { ...options, userId });
  }

  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    let ids: string[];

    if (options.userId) {
      ids = await this.client.zrevrange(this.key("convs:user", options.userId), 0, -1);
    } else if (options.resourceId) {
      ids = await this.client.zrevrange(this.key("convs:resource", options.resourceId), 0, -1);
    } else {
      ids = await this.client.zrevrange(this.key("convs:all"), 0, -1);
    }

    const conversations = await this.getConversationsByIds(ids);
    return this.applyQueryOptions(conversations, options);
  }

  async countConversations(options: ConversationQueryOptions): Promise<number> {
    const conversations = await this.queryConversations({
      ...options,
      limit: undefined,
      offset: undefined,
    });
    return conversations.length;
  }

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
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.client.set(this.key("conv", id), safeStringify(updated));
    this.log("updateConversation", { id });
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    const conversation = await this.getConversation(id);
    if (!conversation) return;

    const pipeline = this.client.pipeline();
    pipeline.del(this.key("conv", id));
    pipeline.del(this.key("msgs", id));
    pipeline.del(this.key("steps", id));
    pipeline.zrem(this.key("convs:resource", conversation.resourceId), id);
    pipeline.zrem(this.key("convs:user", conversation.userId), id);
    pipeline.zrem(this.key("convs:all"), id);
    await pipeline.exec();

    this.log("deleteConversation", { id });
  }

  // ── Message operations ───────────────────────────────────────────────

  async addMessage(
    message: UIMessage,
    userId: string,
    conversationId: string,
    _context?: OperationContext,
  ): Promise<void> {
    const createdAt = (message as UIMessage & { createdAt?: Date }).createdAt ?? new Date();
    const entry = safeStringify({
      ...message,
      userId,
      conversationId,
      createdAt: createdAt.toISOString(),
    });
    await this.client.zadd(this.key("msgs", conversationId), createdAt.getTime(), entry);
    this.log("addMessage", { id: message.id, conversationId });
  }

  async addMessages(
    messages: UIMessage[],
    userId: string,
    conversationId: string,
    context?: OperationContext,
  ): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message, userId, conversationId, context);
    }
  }

  async getMessages(
    _userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
    _context?: OperationContext,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    let entries: string[];

    if (options?.before || options?.after) {
      const min = options.after ? options.after.getTime() : "-inf";
      const max = options.before ? options.before.getTime() : "+inf";
      entries = await this.client.zrangebyscore(this.key("msgs", conversationId), min, max);
    } else {
      entries = await this.client.zrange(this.key("msgs", conversationId), 0, -1);
    }

    let messages = entries.map((entry) => {
      const parsed = JSON.parse(entry);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
      } as UIMessage<{ createdAt: Date }>;
    });

    if (options?.roles) {
      messages = messages.filter((m) => options.roles?.includes(m.role));
    }

    if (options?.limit) {
      messages = messages.slice(-options.limit);
    }

    return messages;
  }

  async clearMessages(
    userId: string,
    conversationId?: string,
    _context?: OperationContext,
  ): Promise<void> {
    if (conversationId) {
      await this.client.del(this.key("msgs", conversationId));
    } else {
      // Clear all messages for the user's conversations
      const convIds = await this.client.zrange(this.key("convs:user", userId), 0, -1);
      if (convIds.length > 0) {
        const pipeline = this.client.pipeline();
        for (const id of convIds) {
          pipeline.del(this.key("msgs", id));
        }
        await pipeline.exec();
      }
    }

    this.log("clearMessages", { userId, conversationId });
  }

  async deleteMessages(
    messageIds: string[],
    _userId: string,
    conversationId: string,
    _context?: OperationContext,
  ): Promise<void> {
    const key = this.key("msgs", conversationId);
    const entries = await this.client.zrange(key, 0, -1);
    const idsToDelete = new Set(messageIds);

    const pipeline = this.client.pipeline();
    for (const entry of entries) {
      const parsed = JSON.parse(entry);
      if (idsToDelete.has(parsed.id)) {
        pipeline.zrem(key, entry);
      }
    }
    await pipeline.exec();

    this.log("deleteMessages", { messageIds, conversationId });
  }

  // ── Conversation steps ───────────────────────────────────────────────

  async saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    if (steps.length === 0) return;

    const pipeline = this.client.pipeline();
    for (const step of steps) {
      const score = new Date(step.createdAt).getTime();
      pipeline.zadd(this.key("steps", step.conversationId), score, safeStringify(step));
    }
    await pipeline.exec();

    this.log("saveConversationSteps", { count: steps.length });
  }

  async getConversationSteps(
    _userId: string,
    conversationId: string,
    options?: GetConversationStepsOptions,
  ): Promise<ConversationStepRecord[]> {
    const entries = await this.client.zrange(this.key("steps", conversationId), 0, -1);
    let steps = entries.map((e) => JSON.parse(e) as ConversationStepRecord);

    if (options?.operationId) {
      steps = steps.filter((s) => s.operationId === options.operationId);
    }

    if (options?.limit) {
      steps = steps.slice(-options.limit);
    }

    return steps;
  }

  // ── Working memory ───────────────────────────────────────────────────

  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null> {
    const scopeKey =
      params.scope === "conversation" ? `conv:${params.conversationId}` : `user:${params.userId}`;
    return this.client.get(this.key("wm", scopeKey));
  }

  async setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    const scopeKey =
      params.scope === "conversation" ? `conv:${params.conversationId}` : `user:${params.userId}`;
    await this.client.set(this.key("wm", scopeKey), params.content);
  }

  async deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    const scopeKey =
      params.scope === "conversation" ? `conv:${params.conversationId}` : `user:${params.userId}`;
    await this.client.del(this.key("wm", scopeKey));
  }

  // ── Workflow state ───────────────────────────────────────────────────

  async getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    const data = await this.client.get(this.key("wf", executionId));
    if (!data) return null;
    return this.deserializeWorkflowState(JSON.parse(data));
  }

  async queryWorkflowRuns(query: WorkflowRunQuery): Promise<WorkflowStateEntry[]> {
    // Get all workflow execution IDs
    let ids: string[];
    if (query.workflowId) {
      ids = await this.client.zrevrange(this.key("wf:idx", query.workflowId), 0, -1);
    } else {
      ids = await this.client.zrevrange(this.key("wf:all"), 0, -1);
    }

    const results: WorkflowStateEntry[] = [];
    for (const id of ids) {
      const state = await this.getWorkflowState(id);
      if (!state) continue;
      if (query.status && state.status !== query.status) continue;
      if (query.userId && state.userId !== query.userId) continue;
      if (query.from && state.createdAt < query.from) continue;
      if (query.to && state.createdAt > query.to) continue;
      results.push(state);
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    const pipeline = this.client.pipeline();
    pipeline.set(this.key("wf", executionId), safeStringify(state));
    pipeline.zadd(this.key("wf:idx", state.workflowId), state.createdAt.getTime(), executionId);
    pipeline.zadd(this.key("wf:all"), state.createdAt.getTime(), executionId);
    if (state.status === "suspended") {
      pipeline.sadd(this.key("wf:suspended", state.workflowId), executionId);
    }
    await pipeline.exec();
  }

  async updateWorkflowState(
    executionId: string,
    updates: Partial<WorkflowStateEntry>,
  ): Promise<void> {
    const existing = await this.getWorkflowState(executionId);
    if (!existing) return;

    const updated = { ...existing, ...updates, updatedAt: new Date() };

    const pipeline = this.client.pipeline();
    pipeline.set(this.key("wf", executionId), safeStringify(updated));

    // Update suspended index
    if (updates.status && updates.status !== "suspended") {
      pipeline.srem(this.key("wf:suspended", existing.workflowId), executionId);
    } else if (updates.status === "suspended") {
      pipeline.sadd(this.key("wf:suspended", existing.workflowId), executionId);
    }

    await pipeline.exec();
  }

  async getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    const ids = await this.client.smembers(this.key("wf:suspended", workflowId));
    const results: WorkflowStateEntry[] = [];
    for (const id of ids) {
      const state = await this.getWorkflowState(id);
      if (state && state.status === "suspended") {
        results.push(state);
      }
    }
    return results;
  }

  // ── Cleanup ──────────────────────────────────────────────────────────

  /**
   * Disconnect the Redis client. Call this when shutting down.
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private async getConversationsByIds(ids: string[]): Promise<Conversation[]> {
    if (ids.length === 0) return [];

    const pipeline = this.client.pipeline();
    for (const id of ids) {
      pipeline.get(this.key("conv", id));
    }
    const results = await pipeline.exec();
    if (!results) return [];

    const conversations: Conversation[] = [];
    for (const [err, data] of results) {
      if (!err && data) {
        conversations.push(JSON.parse(data as string) as Conversation);
      }
    }
    return conversations;
  }

  private applyQueryOptions(
    conversations: Conversation[],
    options: ConversationQueryOptions,
  ): Conversation[] {
    let result = [...conversations];

    if (options.userId) {
      result = result.filter((c) => c.userId === options.userId);
    }
    if (options.resourceId) {
      result = result.filter((c) => c.resourceId === options.resourceId);
    }

    const orderBy = options.orderBy ?? "created_at";
    const direction = options.orderDirection ?? "DESC";
    result.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      if (orderBy === "title") {
        aVal = a.title;
        bVal = b.title;
      } else if (orderBy === "updated_at") {
        aVal = a.updatedAt;
        bVal = b.updatedAt;
      } else {
        aVal = a.createdAt;
        bVal = b.createdAt;
      }
      const cmp = aVal.localeCompare(bVal);
      return direction === "ASC" ? cmp : -cmp;
    });

    const offset = options.offset ?? 0;
    if (options.limit) {
      result = result.slice(offset, offset + options.limit);
    } else if (offset > 0) {
      result = result.slice(offset);
    }

    return result;
  }

  private deserializeWorkflowState(raw: Record<string, unknown>): WorkflowStateEntry {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt as string),
      updatedAt: new Date(raw.updatedAt as string),
    } as WorkflowStateEntry;
  }
}
