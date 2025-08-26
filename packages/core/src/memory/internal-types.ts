import type { UIMessage } from "ai";
import type { NewTimelineEvent } from "../events/types";
import type {
  WorkflowHistoryEntry,
  WorkflowStats,
  WorkflowStepHistoryEntry,
  WorkflowTimelineEvent,
} from "../workflow/types";
import type { Conversation, CreateConversationInput, Memory } from "./types";

/**
 * Internal Memory interface that extends the public Memory interface
 * with additional methods for framework usage
 */
export interface InternalMemory extends Memory {
  /**
   * Add a single UIMessage to memory
   */
  addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void>;

  /**
   * Add multiple UIMessages to memory
   */
  addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void>;

  /**
   * Clear messages from memory
   */
  clearMessages(userId: string, conversationId?: string): Promise<void>;

  /**
   * Create a new conversation
   */
  createConversation(conversation: CreateConversationInput): Promise<Conversation>;

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
   * Get all history entries for an agent with pagination
   * @param agentId Agent ID
   * @param page Page number (0-based)
   * @param limit Number of entries per page
   * @returns Object with entries array and total count
   */
  getAllHistoryEntriesByAgent(
    agentId: string,
    page: number,
    limit: number,
  ): Promise<{
    entries: any[];
    total: number;
  }>;

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
}
