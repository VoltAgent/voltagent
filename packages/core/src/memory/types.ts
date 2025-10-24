/**
 * Memory V2 Type Definitions
 * Clean separation between conversation memory and telemetry
 */

import type { UIMessage } from "ai";
import type { z } from "zod";

// ============================================================================
// Core Types (Re-exported from existing memory system)
// ============================================================================

/**
 * Extended UIMessage type with storage metadata
 */
export type StoredUIMessage = UIMessage & {
  createdAt: Date;
  userId: string;
  conversationId: string;
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
 * Options for getting messages
 */
export type GetMessagesOptions = {
  limit?: number;
  before?: Date;
  after?: Date;
  roles?: string[];
};

/**
 * Memory options for MemoryManager
 */

// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type MemoryOptions = {};

// ============================================================================
// Workflow State Types
// ============================================================================

/**
 * Workflow state entry for suspension and resumption
 * Stores only the essential state needed to resume a workflow
 */
export interface WorkflowStateEntry {
  /** Unique execution ID */
  id: string;
  /** Workflow definition ID */
  workflowId: string;
  /** Workflow name for reference */
  workflowName: string;
  /** Current status */
  status: "running" | "suspended" | "completed" | "cancelled" | "error";
  /** Original input to the workflow */
  input?: unknown;
  /** Execution context */
  context?: Array<[string | symbol, unknown]>;
  /** Suspension metadata including checkpoint data */
  suspension?: {
    suspendedAt: Date;
    reason?: string;
    stepIndex: number;
    lastEventSequence?: number;
    checkpoint?: {
      stepExecutionState?: any;
      completedStepsData?: any[];
    };
    suspendData?: any;
  };
  /**
   * Stream events collected during execution
   * Used for timeline visualization in UI
   */
  events?: Array<{
    id: string;
    type: string;
    name?: string;
    from?: string;
    startTime: string;
    endTime?: string;
    status?: string;
    input?: any;
    output?: any;
    metadata?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }>;
  /** Final output of the workflow execution */
  output?: unknown;
  /** Cancellation metadata */
  cancellation?: {
    cancelledAt: Date;
    reason?: string;
  };
  /** User ID if applicable */
  userId?: string;
  /** Conversation ID if applicable */
  conversationId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Working Memory Types
// ============================================================================

/**
 * Working memory scope - conversation or user level
 */
export type WorkingMemoryScope = "conversation" | "user";

/**
 * Simple memory update modes
 */
export type MemoryUpdateMode = "replace" | "append";

/**
 * Options for updating working memory (simplified)
 */
export type WorkingMemoryUpdateOptions = {
  /** How to update the memory (default: "replace") */
  mode?: MemoryUpdateMode;
};

/**
 * Working memory configuration
 * Auto-detects format: schema → JSON, template → markdown
 */
export type WorkingMemoryConfig = {
  enabled: boolean;
  scope?: WorkingMemoryScope; // default: 'conversation'
} & (
  | { template: string; schema?: never } // Markdown template
  | { schema: z.ZodObject<any>; template?: never } // Zod schema for JSON
  | { template?: never; schema?: never } // No template/schema, free-form
);

// ============================================================================
// Memory V2 Specific Types
// ============================================================================

/**
 * Memory V2 configuration options
 */
export interface MemoryConfig {
  /**
   * Storage adapter for conversations and messages
   */
  storage: StorageAdapter;

  /**
   * Optional embedding adapter for semantic operations
   */
  embedding?: EmbeddingAdapter;

  /**
   * Optional vector adapter for similarity search
   */
  vector?: VectorAdapter;

  /**
   * Enable caching for embeddings
   * @default false
   */
  enableCache?: boolean;

  /**
   * Maximum number of embeddings to cache
   * @default 1000
   */
  cacheSize?: number;

  /**
   * Cache TTL in milliseconds
   * @default 3600000 (1 hour)
   */
  cacheTTL?: number;

  /**
   * Working memory configuration
   * Enables agents to maintain important context
   */
  workingMemory?: WorkingMemoryConfig;
}

/**
 * Metadata about the underlying storage adapter
 */
export interface MemoryStorageMetadata {
  /** Name of the configured storage adapter */
  adapter: string;
}

/**
 * Summary of working memory configuration exposed to the UI
 */
export interface WorkingMemorySummary {
  /** Whether working memory support is enabled */
  enabled: boolean;
  /** Scope of working memory persistence */
  scope?: WorkingMemoryScope;
  /** Output format (markdown/json) */
  format: "markdown" | "json" | null;
  /** Indicates if a template is configured */
  hasTemplate: boolean;
  /** Indicates if a schema is configured */
  hasSchema: boolean;
  /** Template content if configured */
  template?: string | null;
  /** Simplified schema field map if configured */
  schema?: Record<string, string> | null;
}

// ============================================================================
// Vector Search Types
// ============================================================================

/**
 * Document type for RAG operations
 */
export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Search options for semantic search
 */
export interface SearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

/**
 * Search result from vector operations
 */
export interface SearchResult {
  id: string;
  score: number;
  content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Vector item for batch operations
 */
export interface VectorItem {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Adapter Interfaces
// ============================================================================

/**
 * Storage Adapter Interface
 * Handles persistence of conversations and messages
 */
export interface StorageAdapter {
  // Message operations
  addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void>;
  addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void>;
  getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
  ): Promise<UIMessage[]>;
  clearMessages(userId: string, conversationId?: string): Promise<void>;

  // Conversation operations
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  getConversations(resourceId: string): Promise<Conversation[]>;
  getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]>;
  queryConversations(options: ConversationQueryOptions): Promise<Conversation[]>;
  updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;

  // Working Memory operations
  getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null>;

  setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void>;

  deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void>;

  // Workflow State operations
  getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null>;
  setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void>;
  updateWorkflowState(executionId: string, updates: Partial<WorkflowStateEntry>): Promise<void>;
  getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]>;
}

/**
 * Embedding Adapter Interface
 * Handles text to vector conversions
 */
export interface EmbeddingAdapter {
  /**
   * Embed a single text
   */
  embed(text: string): Promise<number[]>;

  /**
   * Embed multiple texts in batch
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get embedding dimensions
   */
  getDimensions(): number;

  /**
   * Get model name
   */
  getModelName(): string;
}

/**
 * Vector Adapter Interface
 * Handles vector storage and similarity search
 */
export interface VectorAdapter {
  /**
   * Store a single vector
   */
  store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Store multiple vectors in batch
   */
  storeBatch(items: VectorItem[]): Promise<void>;

  /**
   * Search for similar vectors
   */
  search(
    vector: number[],
    options?: {
      limit?: number;
      filter?: Record<string, unknown>;
      threshold?: number;
    },
  ): Promise<SearchResult[]>;

  /**
   * Delete a vector by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete multiple vectors by IDs
   */
  deleteBatch(ids: string[]): Promise<void>;

  /**
   * Clear all vectors
   */
  clear(): Promise<void>;
}
