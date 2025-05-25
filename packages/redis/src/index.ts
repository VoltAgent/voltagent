import type {
  Memory,
  Conversation,
  CreateConversationInput,
  MessageFilterOptions,
  MemoryMessage,
} from "@voltagent/core";
import type { BaseMessage } from "@voltagent/core";
import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import { RedisMemoryOptions } from "./types";
import { ADD_MESSAGE_SCRIPT } from "./utils";

interface StoredMessage {
  type: "inline" | "compressed";
  data?: MemoryMessage;
  compressedData?: string; // Base64 encoded compressed data for JSON storage
  originalSize?: number;
  compressedSize?: number;
  algorithm?: "gzip";
}
/**
 * Redis memory storage implementation using node-redis
 */
export class RedisMemory implements Memory {
  private redis: RedisClientType;
  private keyPrefix: string;
  private options: RedisMemoryOptions;
  private gzipAsync = promisify(gzip);
  private gunzipAsync = promisify(gunzip);

  constructor(options: RedisMemoryOptions = {}) {
    this.options = {
      keyPrefix: "voltagent:",
      compressionThreshold: 10 * 1024, // 10KB
      maxFetchLimit: 1000,
      messageTtl: 0,
      conversationTtl: 0,
      historyTtl: 0,
      debug: false,
      storageLimit: 1000,
      ...options,
    };

    this.keyPrefix = this.options.keyPrefix!;

    if (typeof this.options.connection === "string") {
      this.redis = createClient({
        url: this.options.connection,
        commandsQueueMaxLength: 1000,
        socket: {
          connectTimeout: 60000,
          keepAlive: true,
          keepAliveInitialDelay: 30000,
        },
      }) as RedisClientType;
    } else if (this.options.connection) {
      const connectionOptions = this.options.connection;

      const baseSocketOptions = {
        connectTimeout: 60000,
        ...(connectionOptions.socket || {}),
      };

      // Only add keepAlive if not in TLS mode
      if (!baseSocketOptions.tls) {
        (baseSocketOptions as any).keepAlive = true;
        (baseSocketOptions as any).keepAliveInitialDelay = 30000;
      }

      this.redis = createClient({
        ...connectionOptions,
        commandsQueueMaxLength: 1000,
        socket: baseSocketOptions,
      }) as RedisClientType;
    } else {
      // Default connection using environment variables
      this.redis = createClient({
        commandsQueueMaxLength: 1000,
        socket: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          connectTimeout: 60000,
          keepAlive: true,
          keepAliveInitialDelay: 30000,
        },
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB || "0"),
      }) as RedisClientType;
    }

    // Handle Redis connection events
    this.redis.on("error", (err: Error) => {
      if (this.options.debug) {
        console.error("[RedisMemory] Connection error:", err);
      }
    });

    this.redis.on("connect", () => {
      if (this.options.debug) {
        console.log("[RedisMemory] Connected to Redis");
      }
    });

    this.redis.on("ready", () => {
      if (this.options.debug) {
        console.log("[RedisMemory] Redis connection ready");
      }
    });

    // Auto-connect
    this.redis.connect().catch((err: Error) => {
      if (this.options.debug) {
        console.error("[RedisMemory] Failed to connect:", err);
      }
    });
  }

  private debug(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[RedisMemory] ${message}`, ...args);
    }
  }

  // Use hash-tags for cluster safety
  private generateMessageKey(userId: string, conversationId: string): string {
    return `${this.keyPrefix}{${userId}:${conversationId}}:msg`;
  }

  private generateMessageMetaKey(userId: string, conversationId: string): string {
    return `${this.keyPrefix}{${userId}:${conversationId}}:meta`;
  }

  private generateConversationKey(conversationId: string): string {
    return `${this.keyPrefix}conv:${conversationId}`;
  }

  private generateConversationIndexKey(resourceId: string): string {
    return `${this.keyPrefix}conv:idx:${resourceId}`;
  }

  private generateHistoryKey(key: string): string {
    return `${this.keyPrefix}hist:${key}`;
  }

  private generateHistoryAgentIndexKey(agentId: string): string {
    return `${this.keyPrefix}hist:agent:${agentId}`;
  }

  private generateHistoryEventKey(historyId: string, eventKey: string): string {
    return `${this.keyPrefix}hist:events:${historyId}:${eventKey}`;
  }

  private generateHistoryEventsIndexKey(historyId: string): string {
    return `${this.keyPrefix}hist:events:idx:${historyId}`;
  }

  private generateHistoryStepKey(historyId: string, stepKey: string): string {
    return `${this.keyPrefix}hist:steps:${historyId}:${stepKey}`;
  }

  private generateHistoryStepsIndexKey(historyId: string): string {
    return `${this.keyPrefix}hist:steps:idx:${historyId}`;
  }

  private determineStorageStrategy(message: MemoryMessage): {
    type: "inline" | "compressed";
    size: number;
  } {
    const serialized = JSON.stringify(message);
    const size = Buffer.byteLength(serialized, "utf8");

    return {
      type: size < this.options.compressionThreshold! ? "inline" : "compressed",
      size,
    };
  }

  private async compressMessage(message: MemoryMessage): Promise<StoredMessage> {
    const json = JSON.stringify(message);
    const buffer = Buffer.from(json, "utf8");
    const compressed = await this.gzipAsync(buffer);

    return {
      type: "compressed",
      compressedData: compressed.toString("base64"),
      originalSize: buffer.length,
      compressedSize: compressed.length,
      algorithm: "gzip",
    };
  }

  private async decompressMessage(stored: StoredMessage): Promise<MemoryMessage> {
    if (stored.type === "inline") {
      return stored.data!;
    }

    const buffer = Buffer.from(stored.compressedData!, "base64");
    const decompressed = await this.gunzipAsync(buffer);
    return JSON.parse(decompressed.toString("utf8"));
  }

  /**
   * Convert BaseMessage to MemoryMessage
   */
  private convertToMemoryMessage(message: BaseMessage): MemoryMessage {
    // If it's already a MemoryMessage, return as is
    if ("id" in message && "type" in message && "createdAt" in message) {
      return message as MemoryMessage;
    }

    // Convert BaseMessage to MemoryMessage
    return {
      id: crypto.randomUUID(),
      role: message.role,
      content: message.content,
      type: "text",
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Add a message to memory with atomic operations and metadata tracking.
   * @param message - The message to store (BaseMessage format)
   * @param userId - User identifier for message isolation (default: 'default')
   * @param conversationId - Conversation identifier for message grouping (default: 'default')
   *
   * @see ADD_MESSAGE_SCRIPT for detailed explanation of the Lua script operations
   */
  async addMessage(
    message: BaseMessage,
    userId: string = "default",
    conversationId: string = "default",
  ): Promise<void> {
    const memoryMessage = this.convertToMemoryMessage(message);
    const strategy = this.determineStorageStrategy(memoryMessage);

    let storedData: string;
    let compressionRatio = 1.0;

    if (strategy.type === "inline") {
      const stored: StoredMessage = { type: "inline", data: memoryMessage };
      storedData = JSON.stringify(stored);
    } else {
      const compressed = await this.compressMessage(memoryMessage);
      compressionRatio = compressed.compressedSize! / compressed.originalSize!;
      storedData = JSON.stringify(compressed);
    }

    const msgKey = this.generateMessageKey(userId, conversationId);
    const metaKey = this.generateMessageMetaKey(userId, conversationId);
    const timestamp = new Date().toISOString();

    this.debug(`Adding message for user ${userId} and conversation ${conversationId}`, {
      messageId: memoryMessage.id,
      size: strategy.size,
      type: strategy.type,
      compressionRatio,
    });

    await this.redis.eval(ADD_MESSAGE_SCRIPT, {
      keys: [msgKey, metaKey],
      arguments: [
        storedData,
        this.options.storageLimit!.toString(),
        timestamp,
        strategy.size.toString(),
        compressionRatio.toString(),
        this.options.messageTtl!.toString(),
      ],
    });
  }

  async getMessages(options: MessageFilterOptions = {}): Promise<BaseMessage[]> {
    const {
      userId = "default",
      conversationId = "default",
      limit = 50,
      before,
      after,
      role,
    } = options;

    // Apply safety limit
    const safeLimit = Math.min(limit, this.options.maxFetchLimit!);
    const msgKey = this.generateMessageKey(userId, conversationId);

    this.debug(`Getting messages for user ${userId} and conversation ${conversationId}`, options);

    // Get raw messages (newest first due to LPUSH)
    const rawMessages = await this.redis.lRange(msgKey, 0, safeLimit - 1);

    // Decompress and convert messages in parallel
    const messages = await Promise.all(
      rawMessages.map(async (msg: string) => {
        const stored: StoredMessage = JSON.parse(msg);
        return await this.decompressMessage(stored);
      }),
    );

    // Apply filters
    let filteredMessages = messages;

    if (role) {
      filteredMessages = filteredMessages.filter((m: MemoryMessage) => m.role === role);
    }

    if (before) {
      const beforeTime = new Date(before).getTime();
      filteredMessages = filteredMessages.filter(
        (m: MemoryMessage) => new Date(m.createdAt).getTime() < beforeTime,
      );
    }

    if (after) {
      const afterTime = new Date(after).getTime();
      filteredMessages = filteredMessages.filter(
        (m: MemoryMessage) => new Date(m.createdAt).getTime() > afterTime,
      );
    }

    // Sort by creation time (ascending - oldest first for conversation flow)
    filteredMessages.sort(
      (a: MemoryMessage, b: MemoryMessage) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Convert MemoryMessage back to BaseMessage for interface compliance
    return filteredMessages.map((m: MemoryMessage) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async clearMessages(options: {
    userId: string;
    conversationId?: string;
  }): Promise<void> {
    const { userId, conversationId } = options;

    this.debug(`Clearing messages for user ${userId}`, { conversationId });

    if (conversationId) {
      // Clear specific conversation using UNLINK for non-blocking deletion
      const msgKey = this.generateMessageKey(userId, conversationId);
      const metaKey = this.generateMessageMetaKey(userId, conversationId);

      await this.redis.multi().unlink(msgKey).unlink(metaKey).exec();
    } else {
      // Clear all conversations for user - use pattern matching
      const pattern = this.generateMessageKey(userId, "*");
      const metaPattern = this.generateMessageMetaKey(userId, "*");

      const msgKeys = await this.redis.keys(pattern);
      const metaKeys = await this.redis.keys(metaPattern);

      if (msgKeys.length > 0 || metaKeys.length > 0) {
        const pipeline = this.redis.multi();
        msgKeys.forEach((key: string) => pipeline.unlink(key));
        metaKeys.forEach((key: string) => pipeline.unlink(key));
        await pipeline.exec();
      }
    }
  }

  async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
    const now = new Date().toISOString();
    const timestamp = Date.now();

    const newConversation: Conversation = {
      id: conversation.id,
      resourceId: conversation.resourceId,
      title: conversation.title,
      metadata: conversation.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.debug(`Creating conversation ${conversation.id}`, newConversation);

    const convKey = this.generateConversationKey(conversation.id);
    const indexKey = this.generateConversationIndexKey(conversation.resourceId);

    await this.redis
      .multi()
      .hSet(convKey, {
        id: conversation.id,
        resourceId: conversation.resourceId,
        title: conversation.title,
        metadata: JSON.stringify(conversation.metadata),
        createdAt: now,
        updatedAt: now,
      })
      .zAdd(indexKey, { score: timestamp, value: conversation.id })
      .expire(convKey, this.options.conversationTtl! > 0 ? this.options.conversationTtl! : -1)
      .expire(indexKey, this.options.conversationTtl! > 0 ? this.options.conversationTtl! : -1)
      .exec();

    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    this.debug(`Getting conversation ${id}`);

    const convKey = this.generateConversationKey(id);
    const data = await this.redis.hGetAll(convKey);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      id: data.id,
      resourceId: data.resourceId,
      title: data.title,
      metadata: JSON.parse(data.metadata || "{}"),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async getConversations(resourceId: string): Promise<Conversation[]> {
    this.debug(`Getting conversations for resource ${resourceId}`);

    const indexKey = this.generateConversationIndexKey(resourceId);

    // Get conversation IDs sorted by update time (newest first)
    const conversationIds = await this.redis.zRange(indexKey, 0, -1, { REV: true });

    if (conversationIds.length === 0) {
      return [];
    }

    // Get all conversations in parallel
    const conversations = await Promise.all(
      conversationIds.map((id: string) => this.getConversation(id)),
    );

    // Filter out any null results and return
    return conversations.filter((conv: Conversation | null): conv is Conversation => conv !== null);
  }

  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    this.debug(`Updating conversation ${id}`, updates);

    const convKey = this.generateConversationKey(id);
    const existing = await this.getConversation(id);

    if (!existing) {
      throw new Error(`Conversation ${id} not found`);
    }

    const now = new Date().toISOString();
    const timestamp = Date.now();

    const updated: Conversation = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    const indexKey = this.generateConversationIndexKey(updated.resourceId);

    await this.redis
      .multi()
      .hSet(convKey, {
        resourceId: updated.resourceId,
        title: updated.title,
        metadata: JSON.stringify(updated.metadata),
        updatedAt: now,
      })
      .zAdd(indexKey, { score: timestamp, value: id })
      .exec();

    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    this.debug(`Deleting conversation ${id}`);

    const conversation = await this.getConversation(id);
    if (!conversation) {
      return; // Already deleted or doesn't exist
    }

    const convKey = this.generateConversationKey(id);
    const indexKey = this.generateConversationIndexKey(conversation.resourceId);

    // Also clear all messages for this conversation
    const msgPattern = `${this.keyPrefix}{*:${id}}:msg`;
    const metaPattern = `${this.keyPrefix}{*:${id}}:meta`;

    const msgKeys = await this.redis.keys(msgPattern);
    const metaKeys = await this.redis.keys(metaPattern);

    const pipeline = this.redis.multi().unlink(convKey).zRem(indexKey, id);

    msgKeys.forEach((key: string) => pipeline.unlink(key));
    metaKeys.forEach((key: string) => pipeline.unlink(key));

    await pipeline.exec();
  }

  async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    this.debug(`Adding history entry ${key} for agent ${agentId}`);

    const histKey = this.generateHistoryKey(key);
    const agentIndexKey = this.generateHistoryAgentIndexKey(agentId);
    const now = new Date().toISOString();

    await this.redis
      .multi()
      .hSet(histKey, {
        value: JSON.stringify(value),
        agentId: agentId,
        createdAt: now,
        updatedAt: now,
      })
      .sAdd(agentIndexKey, key)
      .expire(histKey, this.options.historyTtl! > 0 ? this.options.historyTtl! : -1)
      .expire(agentIndexKey, this.options.historyTtl! > 0 ? this.options.historyTtl! : -1)
      .exec();
  }

  async updateHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    this.debug(`Updating history entry ${key} for agent ${agentId}`);

    const histKey = this.generateHistoryKey(key);
    const now = new Date().toISOString();

    await this.redis.hSet(histKey, {
      value: JSON.stringify(value),
      agentId: agentId,
      updatedAt: now,
    });
  }

  async getHistoryEntry(key: string): Promise<any | undefined> {
    this.debug(`Getting history entry ${key}`);

    const histKey = this.generateHistoryKey(key);
    const data = await this.redis.hGetAll(histKey);

    if (!data || Object.keys(data).length === 0) {
      return undefined;
    }

    const parsedValue = JSON.parse(data.value || "{}");
    return {
      ...parsedValue,
      _agentId: data.agentId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    this.debug(`Getting all history entries for agent ${agentId}`);

    const agentIndexKey = this.generateHistoryAgentIndexKey(agentId);
    const keys = await this.redis.sMembers(agentIndexKey);

    if (keys.length === 0) {
      return [];
    }

    const entries = await Promise.all(keys.map((key: string) => this.getHistoryEntry(key)));

    return entries.filter((entry: any) => entry !== undefined);
  }

  async addHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    this.debug(`Adding history event ${key} for history ${historyId}`);

    const eventKey = this.generateHistoryEventKey(historyId, key);
    const indexKey = this.generateHistoryEventsIndexKey(historyId);
    const now = new Date().toISOString();

    await this.redis
      .multi()
      .hSet(eventKey, {
        value: JSON.stringify(value),
        historyId: historyId,
        agentId: agentId,
        createdAt: now,
      })
      .sAdd(indexKey, key)
      .expire(eventKey, this.options.historyTtl! > 0 ? this.options.historyTtl! : -1)
      .expire(indexKey, this.options.historyTtl! > 0 ? this.options.historyTtl! : -1)
      .exec();
  }

  async updateHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    this.debug(`Updating history event ${key} for history ${historyId}`);

    const eventKey = this.generateHistoryEventKey(historyId, key);
    const now = new Date().toISOString();

    await this.redis.hSet(eventKey, {
      value: JSON.stringify(value),
      historyId: historyId,
      agentId: agentId,
      updatedAt: now,
    });
  }

  async getHistoryEvent(key: string): Promise<any | undefined> {
    // We need historyId to construct the full key, but this method signature doesn't provide it
    // This is a limitation of the interface - we'll need to search across all possible keys
    this.debug(`Getting history event ${key} - searching across all histories`);

    // This is inefficient but matches the interface requirement
    const pattern = `${this.keyPrefix}hist:events:*:${key}`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return undefined;
    }

    // Return the first match
    const data = await this.redis.hGetAll(keys[0]);
    if (!data || Object.keys(data).length === 0) {
      return undefined;
    }

    return {
      ...JSON.parse(data.value || "{}"),
      historyId: data.historyId,
      agentId: data.agentId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void> {
    this.debug(`Adding history step ${key} for history ${historyId}`);

    const stepKey = this.generateHistoryStepKey(historyId, key);
    const indexKey = this.generateHistoryStepsIndexKey(historyId);
    const now = new Date().toISOString();

    await this.redis
      .multi()
      .hSet(stepKey, {
        value: JSON.stringify(value),
        historyId: historyId,
        agentId: agentId,
        createdAt: now,
      })
      .sAdd(indexKey, key)
      .expire(stepKey, this.options.historyTtl! > 0 ? this.options.historyTtl! : -1)
      .expire(indexKey, this.options.historyTtl! > 0 ? this.options.historyTtl! : -1)
      .exec();
  }

  /**
   * Update a history step
   */
  async updateHistoryStep(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    this.debug(`Updating history step ${key} for history ${historyId}`);

    const stepKey = this.generateHistoryStepKey(historyId, key);
    const now = new Date().toISOString();

    await this.redis.hSet(stepKey, {
      value: JSON.stringify(value),
      historyId: historyId,
      agentId: agentId,
      updatedAt: now,
    });
  }

  /**
   * Get a history step by ID
   */
  async getHistoryStep(key: string): Promise<any | undefined> {
    // We need historyId to construct the full key, but this method signature doesn't provide it
    // This is a limitation of the interface - we'll need to search across all possible keys
    this.debug(`Getting history step ${key} - searching across all histories`);

    // This is inefficient but matches the interface requirement
    const pattern = `${this.keyPrefix}hist:steps:*:${key}`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return undefined;
    }

    // Return the first match
    const data = await this.redis.hGetAll(keys[0]);
    if (!data || Object.keys(data).length === 0) {
      return undefined;
    }

    return {
      ...JSON.parse(data.value || "{}"),
      historyId: data.historyId,
      agentId: data.agentId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Get Redis connection status
   */
  getStatus(): string {
    return this.redis.isOpen ? "ready" : "closed";
  }

  /**
   * Get Redis instance for advanced operations
   */
  getRedisInstance(): RedisClientType {
    return this.redis;
  }
}
