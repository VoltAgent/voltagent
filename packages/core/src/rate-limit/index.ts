/**
 * Rate Limiting Module
 *
 * Provides configurable rate limiting for LLM calls and tool executions.
 * Prevents exceeding API rate limits and enables cost control.
 */

export { RateLimitExceededError } from "./errors";
export { FixedWindowCounterLimiter } from "./limiters/fixed-window";
export { RateLimitManager } from "./manager";

export type {
  AgentRateLimitConfig,
  LLMRateLimitConfig,
  ProviderRateLimitConfig,
  RateLimitConfig,
  RateLimitContext,
  RateLimiter,
  RateLimitExceededAction,
  RateLimitScope,
  RateLimitScopeId,
  RateLimitStats,
  RateLimitStrategy,
  ToolRateLimitConfig,
} from "./types";
