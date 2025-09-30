/**
 * VoltOps Client Type Definitions
 *
 * All types related to VoltOps client functionality including
 * prompt management, telemetry, and API interactions.
 */

export type ManagedMemoryStatus = "provisioning" | "ready" | "failed";

import type { UIMessage } from "ai";
import type { BaseMessage } from "../agent/providers/base/types";
import type { SearchResult, VectorItem } from "../memory/adapters/vector/types";
import type {
  Conversation,
  ConversationQueryOptions,
  CreateConversationInput,
  GetMessagesOptions,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "../memory/types";
// VoltAgentExporter removed - migrated to OpenTelemetry

/**
 * Reference to a prompt in the VoltOps system
 */
export type PromptReference = {
  /** Name of the prompt */
  promptName: string;
  /** Specific version number (takes precedence over label) */
  version?: number;
  /** Label to fetch (e.g., 'latest', 'production', 'staging') */
  label?: string;
  /** Variables to substitute in the template */
  variables?: Record<string, any>;
  /** Per-prompt cache configuration (overrides global settings) */
  promptCache?: {
    enabled?: boolean;
    ttl?: number; // Cache TTL in seconds
    maxSize?: number; // Max cache entries (not applicable per-prompt, but kept for consistency)
  };
};

/**
 * Helper interface for prompt operations in agent instructions
 */
export type PromptHelper = {
  /** Get prompt content by reference */
  getPrompt: (reference: PromptReference) => Promise<PromptContent>;
};

/**
 * Enhanced dynamic value options with prompts support
 */
export interface DynamicValueOptions {
  /** User context map */
  context: Map<string | symbol, unknown>;
  /** Prompt helper (available when VoltOpsClient is configured) */
  prompts: PromptHelper;
}

/**
 * Dynamic value type for agent configuration
 */
export type DynamicValue<T> = (options: DynamicValueOptions) => Promise<T> | T;

/**
 * VoltOps client configuration options
 */
export type VoltOpsClientOptions = {
  /** Base URL of the VoltOps API (default: https://api.voltagent.dev) */
  baseUrl?: string;

  /**
   * Public API key for VoltOps authentication
   *
   * @description Your VoltOps public key used for API authentication and prompt management.
   * This key is safe to use in client-side applications as it only provides read access.
   *
   * @format Should start with `pk_` prefix (e.g., `pk_1234567890abcdef`)
   *
   * @example
   * ```typescript
   * publicKey: process.env.VOLTAGENT_PUBLIC_KEY
   * ```
   *
   *
   * @obtain Get your API keys from: https://console.voltagent.dev/settings/projects
   */
  publicKey?: string;

  /**
   * Secret API key for VoltOps authentication
   *
   * @description Your VoltOps secret key used for secure API operations and analytics.
   * This key provides full access to your VoltOps project and should be kept secure.
   *
   * @format Should start with `sk_` prefix (e.g., `sk_abcdef1234567890`)
   *
   * @example
   * ```typescript
   * secretKey: process.env.VOLTAGENT_SECRET_KEY
   * ```
   *
   *
   * @obtain Get your API keys from: https://console.voltagent.dev/settings/projects
   */
  secretKey?: string;
  /** Custom fetch implementation (optional) */
  fetch?: typeof fetch;
  // observability option removed - now handled by VoltAgentObservability
  /** Enable prompt management (default: true) */
  prompts?: boolean;
  /** Optional configuration for prompt caching */
  promptCache?: {
    enabled?: boolean;
    ttl?: number; // Cache TTL in seconds
    maxSize?: number; // Max cache entries
  };
};

/**
 * Cached prompt data for performance optimization
 */
export type CachedPrompt = {
  /** Prompt content */
  content: string;
  /** When the prompt was fetched */
  fetchedAt: number;
  /** Time to live in milliseconds */
  ttl: number;
};

/**
 * API response for prompt fetch operations
 * Simplified format matching the desired response structure
 */
export type PromptApiResponse = {
  /** Prompt name */
  name: string;
  /** Prompt type */
  type: "text" | "chat";
  /** Prompt content object */
  prompt: PromptContent;
  /** LLM configuration */
  config: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    supported_languages?: string[];
    [key: string]: any;
  };
  /** Prompt version number */
  version: number;
  /** Labels array */
  labels: string[];
  /** Tags array */
  tags: string[];
  /** Base prompt ID for tracking */
  prompt_id: string;
  /** PromptVersion ID (the actual entity ID) */
  prompt_version_id: string;
};

/**
 * API client interface for prompt operations
 */
export interface PromptApiClient {
  /** Fetch a prompt by reference */
  fetchPrompt(reference: PromptReference): Promise<PromptApiResponse>;
}

/**
 * VoltOps prompt manager interface
 */
export interface VoltOpsPromptManager {
  /** Get prompt content by reference */
  getPrompt(reference: PromptReference): Promise<PromptContent>;
  /** Preload prompts for better performance */
  preload(references: PromptReference[]): Promise<void>;
  /** Clear cache */
  clearCache(): void;
  /** Get cache statistics */
  getCacheStats(): { size: number; entries: string[] };
}

/**
 * Main VoltOps client interface
 */
export interface VoltOpsClient {
  /** Prompt management functionality */
  prompts?: VoltOpsPromptManager;
  // observability removed - now handled by VoltAgentObservability
  /** Configuration options */
  options: VoltOpsClientOptions & { baseUrl: string };

  /** Create a prompt helper for agent instructions */
  createPromptHelper(agentId: string, historyEntryId?: string): PromptHelper;

  /** List managed memory databases available to the project */
  listManagedMemoryDatabases(): Promise<ManagedMemoryDatabaseSummary[]>;

  /** List credentials for a managed memory database */
  listManagedMemoryCredentials(databaseId: string): Promise<ManagedMemoryCredentialListResult>;

  /** Create a credential for a managed memory database */
  createManagedMemoryCredential(
    databaseId: string,
    input?: { name?: string },
  ): Promise<ManagedMemoryCredentialCreateResult>;

  /** Managed memory storage operations */
  managedMemory: ManagedMemoryVoltOpsClient;

  // Backward compatibility methods removed - migrated to OpenTelemetry
}

/**
 * Chat message structure compatible with BaseMessage
 */
export type ChatMessage = BaseMessage;

/**
 * Content of a prompt - either text or chat messages
 */
export interface PromptContent {
  type: "text" | "chat";
  text?: string;
  messages?: ChatMessage[];

  /**
   * Metadata about the prompt from VoltOps API
   * Available when prompt is fetched from VoltOps
   */
  metadata?: {
    /** Base prompt ID for tracking */
    prompt_id?: string;
    /** Specific PromptVersion ID (critical for analytics) */
    prompt_version_id?: string;
    /** Prompt name */
    name?: string;
    /** Prompt version number */
    version?: number;
    /** Labels array (e.g., 'production', 'staging', 'latest') */
    labels?: string[];
    /** Tags array for categorization */
    tags?: string[];
    /** LLM configuration from prompt */
    config?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      supported_languages?: string[];
      [key: string]: any;
    };
  };
}

export interface ManagedMemoryConnectionInfo {
  host: string;
  port: number;
  database: string;
  schema: string;
  tablePrefix: string;
  ssl: boolean;
}

export interface ManagedMemoryDatabaseSummary {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  schema_name: string;
  table_prefix: string;
  status: ManagedMemoryStatus;
  last_error?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  connection: ManagedMemoryConnectionInfo;
}

export interface ManagedMemoryCredentialSummary {
  id: string;
  name: string;
  role: string;
  username: string;
  secret: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedMemoryCredentialListResult {
  connection: ManagedMemoryConnectionInfo;
  credentials: ManagedMemoryCredentialSummary[];
}

export interface ManagedMemoryCredentialCreateResult {
  connection: ManagedMemoryConnectionInfo;
  credential: ManagedMemoryCredentialSummary;
}

export interface ManagedMemoryAddMessageInput {
  conversationId: string;
  userId: string;
  message: UIMessage;
}

export interface ManagedMemoryAddMessagesInput {
  conversationId: string;
  userId: string;
  messages: UIMessage[];
}

export interface ManagedMemoryGetMessagesInput {
  conversationId: string;
  userId: string;
  options?: GetMessagesOptions;
}

export interface ManagedMemoryClearMessagesInput {
  userId: string;
  conversationId?: string;
}

export interface ManagedMemoryStoreVectorInput {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
  content?: string;
}

export interface ManagedMemoryStoreVectorsBatchInput {
  items: ManagedMemoryStoreVectorInput[];
}

export interface ManagedMemorySearchVectorsInput {
  vector: number[];
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

export interface ManagedMemoryDeleteVectorsInput {
  ids: string[];
}

export interface ManagedMemoryUpdateConversationInput {
  conversationId: string;
  updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>;
}

export interface ManagedMemoryWorkingMemoryInput {
  scope: WorkingMemoryScope;
  conversationId?: string;
  userId?: string;
}

export interface ManagedMemorySetWorkingMemoryInput extends ManagedMemoryWorkingMemoryInput {
  content: string;
}

export interface ManagedMemoryWorkflowStateUpdateInput {
  executionId: string;
  updates: Partial<WorkflowStateEntry>;
}

export interface ManagedMemoryMessagesClient {
  add(databaseId: string, input: ManagedMemoryAddMessageInput): Promise<void>;
  addBatch(databaseId: string, input: ManagedMemoryAddMessagesInput): Promise<void>;
  list(databaseId: string, input: ManagedMemoryGetMessagesInput): Promise<UIMessage[]>;
  clear(databaseId: string, input: ManagedMemoryClearMessagesInput): Promise<void>;
}

export interface ManagedMemoryConversationsClient {
  create(databaseId: string, input: CreateConversationInput): Promise<Conversation>;
  get(databaseId: string, conversationId: string): Promise<Conversation | null>;
  query(databaseId: string, options: ConversationQueryOptions): Promise<Conversation[]>;
  update(databaseId: string, input: ManagedMemoryUpdateConversationInput): Promise<Conversation>;
  delete(databaseId: string, conversationId: string): Promise<void>;
}

export interface ManagedMemoryWorkingMemoryClient {
  get(databaseId: string, input: ManagedMemoryWorkingMemoryInput): Promise<string | null>;
  set(databaseId: string, input: ManagedMemorySetWorkingMemoryInput): Promise<void>;
  delete(databaseId: string, input: ManagedMemoryWorkingMemoryInput): Promise<void>;
}

export interface ManagedMemoryWorkflowStatesClient {
  get(databaseId: string, executionId: string): Promise<WorkflowStateEntry | null>;
  set(databaseId: string, executionId: string, state: WorkflowStateEntry): Promise<void>;
  update(databaseId: string, input: ManagedMemoryWorkflowStateUpdateInput): Promise<void>;
  listSuspended(databaseId: string, workflowId: string): Promise<WorkflowStateEntry[]>;
}

export interface ManagedMemoryVectorsClient {
  store(databaseId: string, input: ManagedMemoryStoreVectorInput): Promise<void>;
  storeBatch(databaseId: string, input: ManagedMemoryStoreVectorsBatchInput): Promise<void>;
  search(databaseId: string, input: ManagedMemorySearchVectorsInput): Promise<SearchResult[]>;
  get(databaseId: string, vectorId: string): Promise<VectorItem | null>;
  delete(databaseId: string, vectorId: string): Promise<void>;
  deleteBatch(databaseId: string, input: ManagedMemoryDeleteVectorsInput): Promise<void>;
  clear(databaseId: string): Promise<void>;
  count(databaseId: string): Promise<number>;
}

export interface ManagedMemoryVoltOpsClient {
  messages: ManagedMemoryMessagesClient;
  conversations: ManagedMemoryConversationsClient;
  workingMemory: ManagedMemoryWorkingMemoryClient;
  workflowStates: ManagedMemoryWorkflowStatesClient;
  vectors: ManagedMemoryVectorsClient;
}
