/**
 * Rate limiting types and interfaces
 * Implements configurable rate limiting for LLM calls and tool executions
 */

/**
 * Available rate limiting strategies
 */
export type RateLimitStrategy = "fixed_window" | "token_bucket" | "leaky_bucket";

/**
 * Action to take when rate limit is exceeded
 * - 'delay': Wait until rate limit resets (queue the request)
 * - 'throw': Immediately throw RateLimitExceededError
 */
export type RateLimitExceededAction = "delay" | "throw";

/**
 * Scope for rate limiting
 * - 'global': Apply to all operations across all agents
 * - 'agent': Apply per agent instance
 * - 'tool': Apply per tool
 * - 'provider': Apply per LLM provider
 */
export type RateLimitScope = "global" | "agent" | "tool" | "provider";

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
 * Base configuration for a rate limiter
 */
export interface RateLimitConfig {
  /** Rate limiting strategy to use */
  strategy: RateLimitStrategy;
  /** Maximum number of requests per window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Action when limit is exceeded */
  onExceeded?: RateLimitExceededAction;
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
 */
export interface ProviderRateLimitConfig {
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
 * Complete rate limiting configuration for an agent
 */
export interface AgentRateLimitConfig {
  /** Global LLM rate limits for all providers */
  llm?: LLMRateLimitConfig;
  /** Per-tool rate limits (keyed by tool name) */
  tools?: Record<string, ToolRateLimitConfig>;
  /** Per-provider rate limits (keyed by provider name like 'openai', 'anthropic') */
  providers?: Record<string, ProviderRateLimitConfig>;
}

/**
 * Context for rate limit check
 */
export interface RateLimitContext {
  /** Agent ID */
  agentId: string;
  /** Operation type (llm or tool) */
  operationType: "llm" | "tool";
  /** Provider name (for LLM operations) */
  provider?: string;
  /** Model name (for LLM operations) */
  model?: string;
  /** Tool name (for tool operations) */
  toolName?: string;
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
 */
export interface RateLimitScopeId {
  /** Scope type */
  type: "global" | "agent" | "tool" | "provider";
  /** Agent ID (for agent/tool scopes) */
  agentId?: string;
  /** Tool name (for tool scope) */
  toolName?: string;
  /** Provider name (for provider scope) */
  provider?: string;
}
