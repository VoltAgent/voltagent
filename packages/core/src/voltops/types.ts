/**
 * VoltOps Client Type Definitions
 *
 * All types related to VoltOps client functionality including
 * prompt management, telemetry, and API interactions.
 */

import type { VoltAgentExporter } from "../telemetry/exporter";
import type { BaseMessage } from "../agent/providers/base/types";

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
  userContext: Map<string | symbol, unknown>;
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
   * publicKey: process.env.VOLTOPS_PUBLIC_KEY
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
   * secretKey: process.env.VOLTOPS_SECRET_KEY
   * ```
   *
   *
   * @obtain Get your API keys from: https://console.voltagent.dev/settings/projects
   */
  secretKey?: string;
  /** Custom fetch implementation (optional) */
  fetch?: typeof fetch;
  /** Enable observability export (default: true) */
  observability?: boolean;
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
  /** Observability exporter (for backward compatibility) */
  observability?: VoltAgentExporter;
  /** Configuration options */
  options: VoltOpsClientOptions & { baseUrl: string };

  /** Create a prompt helper for agent instructions */
  createPromptHelper(agentId: string, historyEntryId?: string): PromptHelper;

  /** Backward compatibility methods */
  exportHistoryEntry?: VoltAgentExporter["exportHistoryEntry"];
  exportHistoryEntryAsync?: VoltAgentExporter["exportHistoryEntryAsync"];
  exportTimelineEvent?: VoltAgentExporter["exportTimelineEvent"];
  exportTimelineEventAsync?: VoltAgentExporter["exportTimelineEventAsync"];
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
