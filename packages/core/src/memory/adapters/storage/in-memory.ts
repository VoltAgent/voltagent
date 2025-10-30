/**
 * In-Memory Storage Adapter for Memory V2
 * Stores conversations and messages in memory
 */

import { deepClone } from "@voltagent/internal/utils";
import type { UIMessage } from "ai";
import type { OperationContext } from "../../../agent/types";
import { ConversationAlreadyExistsError, ConversationNotFoundError } from "../../errors";
import type {
  Conversation,
  ConversationQueryOptions,
  CreateConversationInput,
  GetMessagesOptions,
  StorageAdapter,
  StoredUIMessage,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "../../types";

/**
 * UserInfo type for storing user-level data including working memory
 */
interface UserInfo {
  id: string;
  metadata?: {
    workingMemory?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-Memory Storage Adapter
 * Simple implementation for testing and development
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private storage: Record<string, Record<string, StoredUIMessage[]>> = {};
  private conversations: Map<string, Conversation> = new Map();
  private users: Map<string, UserInfo> = new Map();
  private workflowStates: Map<string, WorkflowStateEntry> = new Map();
  private workflowStatesByWorkflow: Map<string, Set<string>> = new Map();

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Add a single message
   */
  async addMessage(
    message: UIMessage,
    userId: string,
    conversationId: string,
    _context?: OperationContext,
  ): Promise<void> {
    // Create user's messages container if it doesn't exist
    if (!this.storage[userId]) {
      this.storage[userId] = {};
    }

    // Create conversation's messages array if it doesn't exist
    if (!this.storage[userId][conversationId]) {
      this.storage[userId][conversationId] = [];
    }

    // Create stored message with metadata
    const storedMessage: StoredUIMessage = {
      ...message,
      createdAt: new Date(),
      userId,
      conversationId,
    };

    // Add message to storage
    this.storage[userId][conversationId].push(storedMessage);
  }

  /**
   * Add multiple messages
   */
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

  /**
   * Get messages with optional filtering
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
    _context?: OperationContext,
  ): Promise<UIMessage[]> {
    const { limit = 100, before, after, roles } = options || {};

    // Get user's messages or return empty array
    const userMessages = this.storage[userId] || {};
    let messages = userMessages[conversationId] || [];

    // Apply role filter if provided
    if (roles && roles.length > 0) {
      messages = messages.filter((m) => roles.includes(m.role));
    }

    // Apply time filters if provided
    if (before) {
      messages = messages.filter((m) => m.createdAt.getTime() < before.getTime());
    }

    if (after) {
      messages = messages.filter((m) => m.createdAt.getTime() > after.getTime());
    }

    // Sort by creation time (oldest first for conversation flow)
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Apply limit if specified (take the most recent messages)
    if (limit && limit > 0 && messages.length > limit) {
      messages = messages.slice(-limit);
    }

    // Return as UIMessages (without storage metadata) and deep cloned
    return messages.map((msg) => {
      const cloned = deepClone(msg);
      // Remove storage-specific fields to return clean UIMessage
      const { createdAt, userId: msgUserId, conversationId: msgConvId, ...uiMessage } = cloned;
      return uiMessage as UIMessage;
    });
  }

  /**
   * Clear messages for a user
   */
  async clearMessages(
    userId: string,
    conversationId?: string,
    _context?: OperationContext,
  ): Promise<void> {
    if (!this.storage[userId]) {
      return;
    }

    if (conversationId) {
      // Clear messages for specific conversation
      if (this.storage[userId][conversationId]) {
        this.storage[userId][conversationId] = [];
      }
    } else {
      // Clear all messages for the user
      this.storage[userId] = {};
    }
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    // Check if conversation already exists
    if (this.conversations.has(input.id)) {
      throw new ConversationAlreadyExistsError(input.id);
    }

    // Deep clone input to prevent external mutations
    const clonedInput = deepClone(input);
    const now = new Date().toISOString();
    const conversation: Conversation = {
      ...clonedInput,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversation.id, conversation);
    return deepClone(conversation);
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const conversation = this.conversations.get(id);
    return conversation ? deepClone(conversation) : null;
  }

  /**
   * Get conversations for a resource
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    const conversations = Array.from(this.conversations.values()).filter(
      (c) => c.resourceId === resourceId,
    );
    return conversations.map((c) => deepClone(c));
  }

  /**
   * Get conversations by user ID with query options
   */
  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    return this.queryConversations({ ...options, userId });
  }

  /**
   * Query conversations with advanced options
   */
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    let conversations = Array.from(this.conversations.values());

    // Apply filters
    if (options.userId) {
      conversations = conversations.filter((c) => c.userId === options.userId);
    }

    if (options.resourceId) {
      conversations = conversations.filter((c) => c.resourceId === options.resourceId);
    }

    // Apply sorting
    if (options.orderBy) {
      const direction = options.orderDirection === "DESC" ? -1 : 1;
      conversations.sort((a, b) => {
        switch (options.orderBy) {
          case "created_at":
            return direction * a.createdAt.localeCompare(b.createdAt);
          case "updated_at":
            return direction * a.updatedAt.localeCompare(b.updatedAt);
          case "title":
            return direction * a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
    } else {
      // Default sort by created_at DESC
      conversations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    conversations = conversations.slice(offset, offset + limit);

    return conversations.map((c) => deepClone(c));
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }

    const updatedConversation: Conversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.conversations.set(id, updatedConversation);
    return deepClone(updatedConversation);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }

    // Delete conversation
    this.conversations.delete(id);

    // Delete associated messages
    for (const userId in this.storage) {
      if (this.storage[userId][id]) {
        delete this.storage[userId][id];
      }
    }
  }

  // ============================================================================
  // Working Memory Operations
  // ============================================================================

  /**
   * Get working memory content from metadata
   */
  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null> {
    if (params.scope === "conversation" && params.conversationId) {
      const conversation = this.conversations.get(params.conversationId);
      const workingMemory = conversation?.metadata?.workingMemory;
      return typeof workingMemory === "string" ? workingMemory : null;
    }

    if (params.scope === "user" && params.userId) {
      const user = this.users.get(params.userId);
      const workingMemory = user?.metadata?.workingMemory;
      return typeof workingMemory === "string" ? workingMemory : null;
    }

    return null;
  }

  /**
   * Set working memory content in metadata
   */
  async setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    if (params.scope === "conversation" && params.conversationId) {
      const conversation = this.conversations.get(params.conversationId);
      if (conversation) {
        if (!conversation.metadata) {
          conversation.metadata = {};
        }
        conversation.metadata.workingMemory = params.content;
        conversation.updatedAt = new Date().toISOString();
      }
    } else if (params.scope === "user" && params.userId) {
      let user = this.users.get(params.userId);
      if (!user) {
        user = {
          id: params.userId,
          metadata: { workingMemory: params.content },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.users.set(params.userId, user);
      } else {
        if (!user.metadata) {
          user.metadata = {};
        }
        user.metadata.workingMemory = params.content;
        user.updatedAt = new Date();
      }
    }
  }

  /**
   * Delete working memory from metadata
   */
  async deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    if (params.scope === "conversation" && params.conversationId) {
      const conversation = this.conversations.get(params.conversationId);
      if (conversation?.metadata) {
        conversation.metadata.workingMemory = undefined;
        conversation.updatedAt = new Date().toISOString();
      }
    } else if (params.scope === "user" && params.userId) {
      const user = this.users.get(params.userId);
      if (user?.metadata) {
        user.metadata.workingMemory = undefined;
        user.updatedAt = new Date();
      }
    }
  }

  // ============================================================================
  // Workflow State Operations
  // ============================================================================

  /**
   * Get workflow state by execution ID
   */
  async getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    const state = this.workflowStates.get(executionId);
    return state ? deepClone(state) : null;
  }

  /**
   * Set workflow state
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    const clonedState = deepClone(state);
    this.workflowStates.set(executionId, clonedState);

    // Update workflow index
    if (!this.workflowStatesByWorkflow.has(state.workflowId)) {
      this.workflowStatesByWorkflow.set(state.workflowId, new Set());
    }
    const workflowStates = this.workflowStatesByWorkflow.get(state.workflowId);
    if (workflowStates) {
      workflowStates.add(executionId);
    }
  }

  /**
   * Update workflow state
   */
  async updateWorkflowState(
    executionId: string,
    updates: Partial<WorkflowStateEntry>,
  ): Promise<void> {
    const existing = this.workflowStates.get(executionId);
    if (!existing) {
      throw new Error(`Workflow state ${executionId} not found`);
    }

    const updated: WorkflowStateEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.workflowStates.set(executionId, updated);
  }

  /**
   * Get suspended workflow states for a workflow
   */
  async getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    const executionIds = this.workflowStatesByWorkflow.get(workflowId);
    if (!executionIds) return [];

    const states: WorkflowStateEntry[] = [];
    for (const id of executionIds) {
      const state = this.workflowStates.get(id);
      if (state && state.status === "suspended") {
        states.push(deepClone(state));
      }
    }

    return states;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get storage statistics
   */
  getStats(): {
    totalConversations: number;
    totalUsers: number;
    totalMessages: number;
  } {
    let totalMessages = 0;
    for (const userId in this.storage) {
      for (const conversationId in this.storage[userId]) {
        totalMessages += this.storage[userId][conversationId].length;
      }
    }

    return {
      totalConversations: this.conversations.size,
      totalUsers: Object.keys(this.storage).length,
      totalMessages,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.storage = {};
    this.conversations.clear();
    this.users.clear();
    this.workflowStates.clear();
    this.workflowStatesByWorkflow.clear();
  }
}
