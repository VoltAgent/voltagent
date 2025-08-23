import type { UIMessage } from "ai";

/**
 * Extended UIMessage type with storage metadata
 * Similar to Mastra's MastraMessageShared approach
 */
export type StoredUIMessage = UIMessage & {
  createdAt: Date;
  userId: string;
  conversationId: string;
};

/**
 * Memory options
 */
export type MemoryOptions = {
  /**
   * Maximum number of messages to store in the database
   * @default 100
   */
  storageLimit?: number;
};

/**
 * Conversation type
 */
export type Conversation = {
  id: string;
  resourceId: string;
  userId: string;
  title: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/**
 * Input type for creating a conversation
 */
export type CreateConversationInput = {
  id: string;
  resourceId: string;
  userId: string;
  title: string;
  metadata: Record<string, unknown>;
};

/**
 * Query builder options for conversations
 */
export type ConversationQueryOptions = {
  userId?: string;
  resourceId?: string;
  limit?: number;
  offset?: number;
  orderBy?: "created_at" | "updated_at" | "title";
  orderDirection?: "ASC" | "DESC";
};

/**
 * Memory interface for storing and retrieving messages and conversations
 * This is the public interface exposed to users
 */
export type Memory = {
  /**
   * Get messages from memory with optional filtering
   */
  getMessages(
    userId: string,
    conversationId: string,
    options?: { limit?: number; before?: Date; after?: Date; roles?: string[] },
  ): Promise<UIMessage[]>;

  /**
   * Get a conversation by ID
   */
  getConversation(id: string): Promise<Conversation | null>;

  /**
   * Get conversations for a resource
   */
  getConversations(resourceId: string): Promise<Conversation[]>;

  /**
   * Get conversations by user ID with query options
   */
  getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]>;

  /**
   * Get conversations with advanced query options
   */
  queryConversations(options: ConversationQueryOptions): Promise<Conversation[]>;

  /**
   * Update a conversation
   */
  updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation>;

  /**
   * Delete a conversation
   */
  deleteConversation(id: string): Promise<void>;
};
