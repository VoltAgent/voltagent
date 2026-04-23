/**
 * Rate limiting types and interfaces
 * Implements configurable rate limiting for LLM calls and tool executions
 */

/**
 * Available rate limiting strategies
 * - 'fixed_window': Simple counter that resets after a fixed time period (MVP implementation)
 */
export type RateLimitStrategy = "fixed_window";

/**
 * Action to take when rate limit is exceeded
 * - 'delay': Wait until rate limit resets (queue the request)
 * - 'throw': Immediately throw RateLimitExceededError
 */
export type RateLimitExceededAction = "delay" | "throw";

/**
 * Scope for rate limiting
 * - 'global': Apply to all LLM operations across all agents
 * - 'tool': Apply per tool per agent
 */
export type RateLimitScope = "global" | "tool";

/**
 * Statistics for current rate limit state
 */
export interface RateLimitStats {
  /** Number of requests remaining in current window */
  remaining: number;
  /** Total limit per window */
  limit: number;
  /** When the current window resets */
  resetAt: Date;
  /** Current request count in window */
  current: number;
}

/**
 * Configuration for LLM-specific rate limiting
 */
export interface LLMRateLimitConfig {
  /** Maximum requests per minute */
  maxRequestsPerMinute?: number;
  /** Maximum tokens per minute (future enhancement) */
  maxTokensPerMinute?: number;
  /** Rate limiting strategy */
  strategy?: RateLimitStrategy;
  /** Action when limit exceeded */
  onExceeded?: RateLimitExceededAction;
}

/**
 * Configuration for tool-specific rate limiting
 */
export interface ToolRateLimitConfig {
  /** Maximum requests per minute */
  maxRequestsPerMinute: number;
  /** Rate limiting strategy */
  strategy?: RateLimitStrategy;
  /** Action when limit exceeded */
  onExceeded?: RateLimitExceededAction;
}

/**
 * Configuration for provider-specific rate limiting
 * NOTE: Provider-specific limits are not currently implemented.
 * Use LLMRateLimitConfig global limits instead.
 */
// REMOVED: ProviderRateLimitConfig - not implemented in current version

/**
 * Complete rate limiting configuration for an agent
 */
export interface AgentRateLimitConfig {
  /** Global LLM rate limits for all providers */
  llm?: LLMRateLimitConfig;
  /** Per-tool rate limits (keyed by tool name) */
  tools?: Record<string, ToolRateLimitConfig>;
}

/**
 * Core rate limiter interface
 * All rate limiting strategies must implement this interface
 */
export interface RateLimiter {
  /**
   * Acquire permission to proceed with an operation
   * This method will either:
   * - Return immediately if under limit
   * - Wait (delay) until limit resets if onExceeded='delay'
   * - Throw RateLimitExceededError if onExceeded='throw'
   */
  acquire(): Promise<void>;

  /**
   * Check if operation can proceed without blocking
   * @returns true if under limit, false if over limit
   */
  check(): boolean;

  /**
   * Get current rate limit statistics
   */
  getStats(): RateLimitStats;

  /**
   * Reset the rate limiter state
   * Useful for testing or manual intervention
   */
  reset(): void;
}

/**
 * Scope identifier for rate limit manager
 * Identifies which rate limiter to use for a specific operation
 */
export interface RateLimitScopeId {
  /** Scope type - either global (all LLM calls) or tool-specific */
  type: "global" | "tool";
  /** Agent ID (required for tool scope) */
  agentId?: string;
  /** Tool name (required for tool scope) */
  toolName?: string;
}
