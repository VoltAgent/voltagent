import type { NewTimelineEvent } from "../../events/types";
import type {
  Conversation,
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
  async addTimelineEvent(
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
  async getHistoryEntry(key: string): Promise<any | undefined> {
    this.debug(`Getting history entry with key ${key}`);
    const entry = this.historyEntries.get(key);

    // No need for additional processing - we already store complete objects
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }

  /**
   * Get a history step by ID
   */
  async getHistoryStep(key: string): Promise<any | undefined> {
    this.debug(`Getting history step with key ${key}`);
    const step = this.historySteps.get(key);
    return step ? JSON.parse(JSON.stringify(step)) : undefined;
  }

  /**
   * Add a history entry
   */
  async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
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
  async updateHistoryEntry(key: string, value: any, agentId?: string): Promise<void> {
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
  async addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void> {
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
  async updateHistoryStep(
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
  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
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
      console.log(`[InMemoryStorage] ${message}`, data || "");
    }
  }

  /**
   * Get messages with filtering options
   * @param options Filtering options
   * @returns Filtered messages
   */
  async getMessages(options: MessageFilterOptions = {}): Promise<MemoryMessage[]> {
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
  async addMessage(
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
  async clearMessages(options: { userId: string; conversationId?: string }): Promise<void> {
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
  async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
    const now = new Date().toISOString();

    const newConversation: Conversation = {
      id: conversation.id,
      resourceId: conversation.resourceId,
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
  async getConversation(id: string): Promise<Conversation | null> {
    this.debug(`Getting conversation ${id}`);
    return this.conversations.get(id) || null;
  }

  /**
   * Get all conversations for a resource
   * @param resourceId Resource ID
   * @returns Array of conversations
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    this.debug(`Getting conversations for resource ${resourceId}`);

    // Filter and sort conversations (newest first)
    return Array.from(this.conversations.values())
      .filter((c) => c.resourceId === resourceId)
      .sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  /**
   * Update a conversation
   * @param id Conversation ID
   * @param updates Updates to apply
   * @returns Updated conversation
   */
  async updateConversation(
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
  async deleteConversation(id: string): Promise<void> {
    // Delete all messages in the conversation
    for (const userId in this.storage) {
      delete this.storage[userId][id];
    }

    // Delete the conversation
    this.conversations.delete(id);
    this.debug(`Deleted conversation ${id}`);
  }
}
