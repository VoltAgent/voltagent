import type { BaseMessage } from "../agent/providers/base/types";
import type { NewTimelineEvent } from "../events/types";
import type { WorkflowHistoryEntry, WorkflowStepHistoryEntry } from "../workflow/context";
import type { WorkflowStats, WorkflowTimelineEvent } from "../workflow/types";

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
 * Options for filtering messages when retrieving from memory
 */
export type MessageFilterOptions = {
  /**
   * User identifier
   */
  userId?: string;

  /**
   * Conversation identifier
   */
  conversationId?: string;

  /**
   * Maximum number of messages to retrieve
   */
  limit?: number;

  /**
   * Only retrieve messages before this timestamp
   */
  before?: number;

  /**
   * Only retrieve messages after this timestamp
   */
  after?: number;

  /**
   * Only retrieve messages with this role
   */
  role?: BaseMessage["role"];
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
 * Memory interface for storing and retrieving messages
 */
export type Memory = {
  /**
   * Add a message to memory
   */
  addMessage(message: BaseMessage, conversationId?: string): Promise<void>;

  /**
   * Get messages from memory
   */
  getMessages(options: MessageFilterOptions): Promise<BaseMessage[]>;

  /**
   * Clear messages from memory
   */
  clearMessages(options: { userId: string; conversationId?: string }): Promise<void>;

  /**
   * Create a new conversation
   */
  createConversation(conversation: CreateConversationInput): Promise<Conversation>;

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
   * Get all messages for a specific conversation
   */
  getConversationMessages(
    conversationId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<MemoryMessage[]>;

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

  /**
   * Add or update a history entry
   * @param key Entry ID
   * @param value Entry data
   * @param agentId Agent ID for filtering
   */
  addHistoryEntry(key: string, value: any, agentId: string): Promise<void>;

  /**
   * Update an existing history entry
   * @param key Entry ID
   * @param value Updated entry data
   * @param agentId Agent ID for filtering
   */
  updateHistoryEntry(key: string, value: any, agentId: string): Promise<void>;

  /**
   * Add a history step
   * @param key Step ID
   * @param value Step data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void>;

  /**
   * Update a history step
   * @param key Step ID
   * @param value Updated step data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  updateHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void>;

  /**
   * Get a history entry by ID
   * @param key Entry ID
   * @returns The history entry or undefined if not found
   */
  getHistoryEntry(key: string): Promise<any | undefined>;

  /**
   * Get a history step by ID
   * @param key Step ID
   * @returns The history step or undefined if not found
   */
  getHistoryStep(key: string): Promise<any | undefined>;

  /**
   * Get all history entries for an agent
   * @param agentId Agent ID
   * @returns Array of all history entries for the agent
   */
  getAllHistoryEntriesByAgent(agentId: string): Promise<any[]>;

  /**
   * Add a timeline event
   * This is part of the new immutable event system.
   * @param key Event ID (UUID)
   * @param value Timeline event data with immutable structure
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  addTimelineEvent(
    key: string,
    value: NewTimelineEvent,
    historyId: string,
    agentId: string,
  ): Promise<void>;

  // Workflow History Operations
  storeWorkflowHistory(entry: WorkflowHistoryEntry): Promise<void>;
  getWorkflowHistory(id: string): Promise<WorkflowHistoryEntry | null>;
  getWorkflowHistoryByWorkflowId(workflowId: string): Promise<WorkflowHistoryEntry[]>;
  updateWorkflowHistory(id: string, updates: Partial<WorkflowHistoryEntry>): Promise<void>;
  deleteWorkflowHistory(id: string): Promise<void>;

  // Workflow Steps Operations
  storeWorkflowStep(step: WorkflowStepHistoryEntry): Promise<void>;
  getWorkflowStep(id: string): Promise<WorkflowStepHistoryEntry | null>;
  getWorkflowSteps(workflowHistoryId: string): Promise<WorkflowStepHistoryEntry[]>;
  updateWorkflowStep(id: string, updates: Partial<WorkflowStepHistoryEntry>): Promise<void>;
  deleteWorkflowStep(id: string): Promise<void>;

  // Workflow Timeline Events Operations
  storeWorkflowTimelineEvent(event: WorkflowTimelineEvent): Promise<void>;
  getWorkflowTimelineEvent(id: string): Promise<WorkflowTimelineEvent | null>;
  getWorkflowTimelineEvents(workflowHistoryId: string): Promise<WorkflowTimelineEvent[]>;
  deleteWorkflowTimelineEvent(id: string): Promise<void>;

  // Query Operations
  getAllWorkflowIds(): Promise<string[]>;
  getWorkflowStats(workflowId: string): Promise<WorkflowStats>;

  // Bulk Operations
  getWorkflowHistoryWithStepsAndEvents(id: string): Promise<WorkflowHistoryEntry | null>;
  deleteWorkflowHistoryWithRelated(id: string): Promise<void>;

  // Cleanup Operations
  cleanupOldWorkflowHistories(workflowId: string, maxEntries: number): Promise<number>;
};

/**
 * Memory-specific message type
 */
export type MemoryMessage = BaseMessage & {
  id: string; // Unique identifier for the message
  type: "text" | "tool-call" | "tool-result"; // Type of the message
  createdAt: string; // ISO date when the message was created
};
