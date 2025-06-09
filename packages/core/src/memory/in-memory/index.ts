import type { NewTimelineEvent } from "../../events/types";
import devLogger from "../../utils/internal/dev-logger";
import type {
  Conversation,
  ConversationQueryOptions,
  CreateConversationInput,
  Memory,
  MemoryMessage,
  MemoryOptions,
  MessageFilterOptions,
} from "../types";

/**
 * Options for configuring the InMemoryStorage
 */
export interface InMemoryStorageOptions extends MemoryOptions {
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

// Type for internal message storage with metadata
type MessageWithMetadata = MemoryMessage;

/**
 * A simple in-memory implementation of the Memory interface
 * Stores messages in memory, organized by user and conversation
 */
export class InMemoryStorage implements Memory {
  private storage: Record<string, Record<string, MessageWithMetadata[]>> = {};
  private conversations: Map<string, Conversation> = new Map();
  private historyEntries: Map<string, any> = new Map();
  private historySteps: Map<string, any> = new Map();
  private timelineEvents: Map<string, NewTimelineEvent> = new Map();
  private agentHistory: Record<string, string[]> = {};
  private options: InMemoryStorageOptions;

  /**
   * Create a new in-memory storage
   * @param options Configuration options
   */
  constructor(options: InMemoryStorageOptions = {}) {
    this.options = {
      storageLimit: options.storageLimit || 100,
      debug: options.debug || false,
    };
  }

  /**
   * Add a timeline event
   * @param key Event ID (UUID)
   * @param value Timeline event data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  public async addTimelineEvent(
    key: string,
    value: NewTimelineEvent,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    this.debug(`Adding timeline event ${key} for history ${historyId} and agent ${agentId}`, value);

    // Store the timeline event
    this.timelineEvents.set(key, {
      ...value,
      id: key,
    });

    // Link to the history entry
    const historyEntry = this.historyEntries.get(historyId);
    if (historyEntry) {
      // Initialize events array if it doesn't exist
      if (!historyEntry.events) {
        historyEntry.events = [];
      }

      // Add the event to the history entry
      historyEntry.events.push({
        ...value,
        id: key,
      });

      // Update the history entry
      await this.updateHistoryEntry(historyId, historyEntry, agentId);
    }
  }

  /**
   * Get a history entry by ID
   */
  public async getHistoryEntry(key: string): Promise<any | undefined> {
    this.debug(`Getting history entry with key ${key}`);
    const entry = this.historyEntries.get(key);

    // No need for additional processing - we already store complete objects
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }

  /**
   * Get a history step by ID
   */
  public async getHistoryStep(key: string): Promise<any | undefined> {
    this.debug(`Getting history step with key ${key}`);
    const step = this.historySteps.get(key);
    return step ? JSON.parse(JSON.stringify(step)) : undefined;
  }

  /**
   * Add a history entry
   */
  public async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    this.debug(`Adding history entry with key ${key} for agent ${agentId}`, value);

    // Make sure events and steps arrays exist
    if (!value.events) value.events = [];
    if (!value.steps) value.steps = [];

    // Store the entry directly
    this.historyEntries.set(key, {
      ...value,
      _agentId: agentId,
      updatedAt: new Date().toISOString(),
    });

    // Add to agent history index
    if (!this.agentHistory[agentId]) {
      this.agentHistory[agentId] = [];
    }

    if (!this.agentHistory[agentId].includes(key)) {
      this.agentHistory[agentId].push(key);
    }
  }

  /**
   * Update a history entry
   */
  public async updateHistoryEntry(key: string, value: any, agentId?: string): Promise<void> {
    this.debug(`Updating history entry with key ${key}`, value);

    const existingEntry = this.historyEntries.get(key);
    if (!existingEntry) {
      throw new Error(`History entry with key ${key} not found`);
    }

    // Ensure _agentId is preserved
    const effectiveAgentId = agentId || existingEntry._agentId;

    // Update the entry with the new values, preserving existing values not in the update
    this.historyEntries.set(key, {
      ...existingEntry,
      ...value,
      _agentId: effectiveAgentId,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Add a history step
   */
  public async addHistoryStep(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    this.debug(
      `Adding history step with key ${key} for history ${historyId} and agent ${agentId}`,
      value,
    );

    // Store the step separately
    this.historySteps.set(key, {
      ...value,
      id: key,
      historyId,
      agentId,
    });

    // Link to the history entry
    const historyEntry = this.historyEntries.get(historyId);
    if (!historyEntry) {
      throw new Error(`History entry with key ${historyId} not found`);
    }

    // Format the step object
    const stepObject = {
      id: key,
      type: value.type,
      name: value.name,
      content: value.content,
      arguments: value.arguments,
    };

    // Initialize steps array if it doesn't exist
    if (!historyEntry.steps) {
      historyEntry.steps = [];
    }

    // Add the complete step object directly to the history entry
    historyEntry.steps.push(stepObject);

    // Update the history entry
    await this.updateHistoryEntry(historyId, historyEntry, agentId);
  }

  /**
   * Update a history step
   */
  public async updateHistoryStep(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    this.debug(`Updating history step with key ${key}`, value);

    // Update the step in the separate storage
    const existingStep = this.historySteps.get(key);
    if (!existingStep) {
      throw new Error(`Step with key ${key} not found`);
    }

    this.historySteps.set(key, {
      ...existingStep,
      ...value,
      updatedAt: new Date().toISOString(),
    });

    // Get the history entry
    const historyEntry = this.historyEntries.get(historyId);
    if (!historyEntry || !Array.isArray(historyEntry.steps)) {
      throw new Error(`History entry with key ${historyId} not found or has no steps`);
    }

    // Find and update the step in the array
    const stepIndex = historyEntry.steps.findIndex((step: { id: string }) => step.id === key);
    if (stepIndex === -1) {
      throw new Error(`Step with key ${key} not found in history ${historyId}`);
    }

    // Update the step
    historyEntry.steps[stepIndex] = {
      ...historyEntry.steps[stepIndex],
      ...value,
    };

    // Update the history entry
    await this.updateHistoryEntry(historyId, historyEntry, agentId);
  }

  /**
   * Get all history entries for an agent
   */
  public async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    this.debug(`Getting all history entries for agent ${agentId}`);

    // Get all entry keys for this agent
    const entryKeys = this.agentHistory[agentId] || [];

    // Get all entries
    const entries = entryKeys.map((key) => this.historyEntries.get(key)).filter(Boolean);

    // Return deep copies of entries to prevent accidental modifications
    const result = entries.map((entry) => JSON.parse(JSON.stringify(entry)));

    // Sort by timestamp (newest first)
    return result.sort((a, b) => {
      const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
      const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

  /**
   * Log a debug message if debug is enabled
   * @param message Message to log
   * @param data Additional data to log
   */
  private debug(message: string, data?: unknown): void {
    if (this.options.debug) {
      devLogger.info(`[InMemoryStorage] ${message}`, data || "");
    }
  }

  /**
   * Get messages with filtering options
   * @param options Filtering options
   * @returns Filtered messages
   */
  public async getMessages(options: MessageFilterOptions = {}): Promise<MemoryMessage[]> {
    const {
      userId = "default",
      conversationId = "default",
      limit = this.options.storageLimit,
      before,
      after,
      role,
    } = options;

    this.debug(
      `Getting messages for user ${userId} and conversation ${conversationId} with options`,
      options,
    );

    // Get user's messages or create new empty object
    const userMessages = this.storage[userId] || {};

    // Get conversation's messages or create new empty array
    const messages = userMessages[conversationId] || [];

    // Apply filters
    let filteredMessages = messages;

    // Filter by role if specified
    if (role) {
      filteredMessages = filteredMessages.filter((m) => m.role === role);
    }

    // Filter by created timestamp if specified
    if (before) {
      filteredMessages = filteredMessages.filter(
        (m) => new Date(m.createdAt).getTime() < new Date(before).getTime(),
      );
    }

    if (after) {
      filteredMessages = filteredMessages.filter(
        (m) => new Date(m.createdAt).getTime() > new Date(after).getTime(),
      );
    }

    // Sort by created timestamp (ascending)
    filteredMessages.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Apply limit if specified
    if (limit && limit > 0 && filteredMessages.length > limit) {
      filteredMessages = filteredMessages.slice(-limit);
    }

    return filteredMessages;
  }

  /**
   * Add a message to the conversation history
   * @param message Message to add
   * @param userId User identifier (optional, defaults to "default")
   * @param conversationId Conversation identifier (optional, defaults to "default")
   */
  public async addMessage(
    message: MemoryMessage,
    userId = "default",
    conversationId = "default",
  ): Promise<void> {
    this.debug(`Adding message for user ${userId} and conversation ${conversationId}`, message);

    // Create user's messages container if it doesn't exist
    if (!this.storage[userId]) {
      this.storage[userId] = {};
    }

    // Create conversation's messages array if it doesn't exist
    if (!this.storage[userId][conversationId]) {
      this.storage[userId][conversationId] = [];
    }

    // Add the message with metadata
    this.storage[userId][conversationId].push(message);

    // Apply storage limit if specified
    if (this.options.storageLimit && this.options.storageLimit > 0) {
      const messages = this.storage[userId][conversationId];
      if (messages.length > this.options.storageLimit) {
        // Remove oldest messages to maintain limit
        this.storage[userId][conversationId] = messages.slice(-this.options.storageLimit);
      }
    }
  }

  /**
   * Clear all messages for a user and optionally a specific conversation
   * @param options Options specifying which messages to clear
   */
  public async clearMessages(options: { userId: string; conversationId?: string }): Promise<void> {
    const { userId, conversationId } = options;

    this.debug(
      `Clearing messages for user ${userId} ${conversationId ? `and conversation ${conversationId}` : ""}`,
    );

    // If user doesn't exist, nothing to clear
    if (!this.storage[userId]) {
      return;
    }

    // If conversationId specified, clear only that conversation
    if (conversationId) {
      this.storage[userId][conversationId] = [];
    } else {
      // Clear all conversations for the user
      this.storage[userId] = {};
    }
  }

  /**
   * Create a new conversation
   * @param conversation Conversation to create
   * @returns Created conversation
   */
  public async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
    const now = new Date().toISOString();

    const newConversation: Conversation = {
      id: conversation.id,
      resourceId: conversation.resourceId,
      userId: conversation.userId,
      title: conversation.title,
      metadata: conversation.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversation.id, newConversation);
    this.debug(`Created conversation ${conversation.id}`, newConversation);

    return newConversation;
  }

  /**
   * Get a conversation by ID
   * @param id Conversation ID
   * @returns Conversation or null if not found
   */
  public async getConversation(id: string): Promise<Conversation | null> {
    this.debug(`Getting conversation ${id}`);
    return this.conversations.get(id) || null;
  }

  /**
   * Get all conversations for a resource
   * @param resourceId Resource ID
   * @returns Array of conversations
   */
  public async getConversations(resourceId: string): Promise<Conversation[]> {
    this.debug(`Getting conversations for resource ${resourceId}`);

    // Filter and sort conversations (newest first)
    return Array.from(this.conversations.values())
      .filter((c) => c.resourceId === resourceId)
      .sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  /**
   * Get conversations by user ID with query options
   * @param userId User ID
   * @param options Query options
   * @returns Array of conversations
   */
  public async getConversationsByUserId(
    userId: string,
    options: Omit<ConversationQueryOptions, "userId"> = {},
  ): Promise<Conversation[]> {
    this.debug(`Getting conversations for user ${userId}`, options);

    const {
      resourceId,
      limit = 50,
      offset = 0,
      orderBy = "updated_at",
      orderDirection = "DESC",
    } = options;

    // Filter conversations by user ID
    let filtered = Array.from(this.conversations.values()).filter((c) => c.userId === userId);

    // Apply resource filter if specified
    if (resourceId) {
      filtered = filtered.filter((c) => c.resourceId === resourceId);
    }

    // Sort conversations
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case "created_at":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "updated_at":
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
      }

      if (orderDirection === "ASC") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });

    // Apply pagination
    if (limit > 0) {
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }

  /**
   * Query conversations with flexible filtering and pagination options
   *
   * This method provides a powerful way to search and filter conversations
   * with support for user-based filtering, resource filtering, pagination,
   * and custom sorting.
   *
   * @param options Query options for filtering and pagination
   * @param options.userId Optional user ID to filter conversations by specific user
   * @param options.resourceId Optional resource ID to filter conversations by specific resource
   * @param options.limit Maximum number of conversations to return (default: 50)
   * @param options.offset Number of conversations to skip for pagination (default: 0)
   * @param options.orderBy Field to sort by: 'created_at', 'updated_at', or 'title' (default: 'updated_at')
   * @param options.orderDirection Sort direction: 'ASC' or 'DESC' (default: 'DESC')
   *
   * @returns Promise that resolves to an array of conversations matching the criteria
   *
   * @example
   * ```typescript
   * // Get all conversations for a specific user
   * const userConversations = await storage.queryConversations({
   *   userId: 'user123',
   *   limit: 20
   * });
   *
   * // Get conversations for a resource with pagination
   * const resourceConversations = await storage.queryConversations({
   *   resourceId: 'chatbot-v1',
   *   limit: 10,
   *   offset: 20,
   *   orderBy: 'created_at',
   *   orderDirection: 'ASC'
   * });
   *
   * // Get all conversations (admin view)
   * const allConversations = await storage.queryConversations({
   *   limit: 100,
   *   orderBy: 'updated_at'
   * });
   * ```
   */
  public async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    this.debug("Querying conversations", options);

    const {
      userId,
      resourceId,
      limit = 50,
      offset = 0,
      orderBy = "updated_at",
      orderDirection = "DESC",
    } = options;

    // Start with all conversations
    let filtered = Array.from(this.conversations.values());

    // Apply user filter if specified
    if (userId) {
      filtered = filtered.filter((c) => c.userId === userId);
    }

    // Apply resource filter if specified
    if (resourceId) {
      filtered = filtered.filter((c) => c.resourceId === resourceId);
    }

    // Sort conversations
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case "created_at":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "updated_at":
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
      }

      if (orderDirection === "ASC") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });

    // Apply pagination
    if (limit > 0) {
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }

  /**
   * Get messages for a specific conversation with pagination support
   *
   * This method retrieves all messages within a conversation, ordered chronologically
   * from oldest to newest. It supports pagination to handle large conversations
   * efficiently and avoid memory issues.
   *
   * @param conversationId The unique identifier of the conversation to retrieve messages from
   * @param options Optional pagination and filtering options
   * @param options.limit Maximum number of messages to return (default: 100)
   * @param options.offset Number of messages to skip for pagination (default: 0)
   *
   * @returns Promise that resolves to an array of messages in chronological order (oldest first)
   *
   * @example
   * ```typescript
   * // Get the first 50 messages in a conversation
   * const messages = await storage.getConversationMessages('conv-123', {
   *   limit: 50
   * });
   *
   * // Get messages with pagination (skip first 20, get next 30)
   * const olderMessages = await storage.getConversationMessages('conv-123', {
   *   limit: 30,
   *   offset: 20
   * });
   *
   * // Get all messages (use with caution for large conversations)
   * const allMessages = await storage.getConversationMessages('conv-123');
   *
   * // Process messages in batches
   * const batchSize = 100;
   * let offset = 0;
   * let hasMore = true;
   *
   * while (hasMore) {
   *   const batch = await storage.getConversationMessages('conv-123', {
   *     limit: batchSize,
   *     offset: offset
   *   });
   *
   *   // Process batch
   *   processBatch(batch);
   *
   *   hasMore = batch.length === batchSize;
   *   offset += batchSize;
   * }
   * ```
   *
   * @throws {Error} If the conversation ID is invalid or operation fails
   */
  public async getConversationMessages(
    conversationId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<MemoryMessage[]> {
    this.debug(`Getting messages for conversation ${conversationId}`, options);

    const { limit = 100, offset = 0 } = options;

    // Find messages across all users for this conversation
    const allMessages: MemoryMessage[] = [];

    for (const userId in this.storage) {
      const userMessages = this.storage[userId][conversationId] || [];
      allMessages.push(...userMessages);
    }

    // Sort by creation time
    allMessages.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Apply pagination
    if (limit > 0) {
      return allMessages.slice(offset, offset + limit);
    }

    return allMessages;
  }

  /**
   * Update a conversation
   * @param id Conversation ID
   * @param updates Updates to apply
   * @returns Updated conversation
   */
  public async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    this.debug(`Updating conversation ${id}`, updates);

    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }

    const updatedConversation: Conversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.conversations.set(id, updatedConversation);

    return updatedConversation;
  }

  /**
   * Delete a conversation by ID
   * @param id Conversation ID
   */
  public async deleteConversation(id: string): Promise<void> {
    // Delete all messages in the conversation
    for (const userId in this.storage) {
      delete this.storage[userId][id];
    }

    // Delete the conversation
    this.conversations.delete(id);
    this.debug(`Deleted conversation ${id}`);
  }
}
