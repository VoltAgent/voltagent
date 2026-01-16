/* ============================================================
 * Imports
 * ============================================================ */

import type { Logger } from "../logger";

/* ============================================================
 * Utility & Helper Types
 * ============================================================ */

/**
 * Utility type to allow bivariant function parameters.
 * Used for callback-style APIs where strict variance is undesirable.
 */
type BivariantFunction<TArgs extends unknown[], TReturn> = {
  bivarianceHack(...args: TArgs): TReturn;
}["bivarianceHack"];

/* ============================================================
 * Primitive Domain Types
 * ============================================================ */
/**
 * Token usage counters optionally returned by providers.
 */
type UsageCounters = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

/**
 * Supported request execution modes.
 */
export type TrafficRequestType = "text" | "stream";

/**
 * Traffic priority levels.
 */
export type TrafficPriority = "P0" | "P1" | "P2";

/**
 * Canonical retry reasons across providers.
 */
export type RetryReason = "rateLimit" | "serverError" | "timeout";

/* ============================================================
 * Metadata Structures
 * ============================================================ */

/**
 * Metadata attached to inbound traffic requests.
 */
export interface TrafficRequestMetadata {
  agentId?: string;
  agentName?: string;
  model?: string;
  provider?: string;
  requestId?: string;
  priority?: TrafficPriority;
  tenantId?: string;
  apiKeyId?: string;
  region?: string;
  endpoint?: string;
  tenantTier?: string;
  taskType?: string;
  fallbackPolicyId?: string;
}

/**
 * Metadata produced after request execution.
 */
export type TrafficResponseMetadata = {
  rateLimitKey?: string;
  retryAfterMs?: number;
  rateLimitRemaining?: number;
  rateLimitResetAt?: number;
  rateLimitResetInMs?: number;
  queueEtaMs?: number;
  tenantId?: string;
  priority?: TrafficPriority;
  taskType?: string;
};

/* ============================================================
 * Retry System (policy-level)
 * ============================================================ */

/**
 * Result of retry policy evaluation.
 */
export type RetryPlan = {
  delayMs: number;
  reason: RetryReason;
};

/**
 * Context passed to retry policy functions.
 */
export type RetryPolicyContext = {
  error: unknown;
  attempt: number;
  metadata?: TrafficRequestMetadata;
  key?: string;
  logger?: Logger;
};

/**
 * Retry policy function signature.
 */
export type RetryPolicy = (context: RetryPolicyContext) => RetryPlan | undefined;

/**
 * Retry policy configuration with override scopes.
 */
export type RetryPolicyConfig = {
  default?: RetryPolicy;
  providerPolicyMap?: Record<string, RetryPolicy>;
  modelPolicyMap?: Record<string, RetryPolicy>;
};

/* ============================================================
 * Fallback System
 * ============================================================ */

/**
 * Provider/model switch fallback.
 */
export type FallbackTarget = {
  provider?: string;
  model: string;
};

/**
 * Static short-response fallback.
 */
export type ShortResponseFallbackTarget = {
  kind: "short-response";
  text: string;
};

/**
 * A single entry in a fallback chain.
 */
export type FallbackChainEntry = string | FallbackTarget | ShortResponseFallbackTarget;

/**
 * Fallback execution modes.
 */
export type FallbackPolicyMode = "fallback" | "wait";

/**
 * Fallback policy definition.
 */
export type FallbackPolicy = {
  mode: FallbackPolicyMode;
};

/**
 * Fallback policy configuration.
 */
export type FallbackPolicyConfig = {
  defaultPolicyId?: string;
  policies?: Record<string, FallbackPolicy>;
  taskTypePolicyIds?: Record<string, string>;
};

/* ============================================================
 * Rate Limiting & Concurrency
 * ============================================================ */

/**
 * Provider/model concurrency limits.
 */
export type ProviderModelConcurrencyLimit =
  | number
  | Record<string, number>
  | ((metadata: TrafficRequestMetadata | undefined, key: string) => number | undefined);

/**
 * Tenant-level concurrency limits.
 */
export type TenantConcurrencyLimit =
  | number
  | Record<string, number>
  | ((tenantId: string, metadata: TrafficRequestMetadata | undefined) => number | undefined);

/**
 * Priority-based burst limits.
 */
export type PriorityBurstLimits = Partial<Record<TrafficPriority, number>>;

/**
 * Priority-based scheduling weights.
 */
export type PriorityWeights = Partial<Record<TrafficPriority, number>>;

/**
 * Adaptive limiter tuning parameters.
 */
export type AdaptiveLimiterConfig = {
  windowMs?: number;
  threshold?: number;
  minPenaltyMs?: number;
  maxPenaltyMs?: number;
  penaltyMultiplier?: number;
  decayMs?: number;
};

/**
 * Rate limiting strategy kinds.
 */
export type RateLimitStrategyKind = "window" | "token-bucket";

/**
 * Strategy selection configuration.
 */
export type RateLimitStrategyConfig = {
  providers?: Record<string, RateLimitStrategyKind>;
  models?: Record<string, RateLimitStrategyKind>;
};

/**
 * Per-key rate limit options.
 */
export interface RateLimitOptions {
  requestsPerMinute: number;
  tokensPerMinute: number;
  burstSize?: number;
}

export type RateLimitKey = string;
export type RateLimitConfig = Record<RateLimitKey, RateLimitOptions>;

/**
 * Aggregated tenant token usage.
 */
export type TenantUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

/* ============================================================
 * Core Request Abstraction
 * ============================================================ */

/**
 * A single traffic-controlled request.
 */
export interface TrafficRequest<TResponse> {
  tenantId: string;
  metadata?: TrafficRequestMetadata;
  execute: () => Promise<TResponse>;
  deadlineAt?: number;
  maxQueueWaitMs?: number;
  estimatedTokens?: number;

  createFallbackRequest?: BivariantFunction<
    [target: FallbackChainEntry],
    TrafficRequest<TResponse> | undefined
  >;

  extractUsage?: BivariantFunction<
    [response: TResponse],
    Promise<UsageCounters | undefined> | UsageCounters | undefined
  >;
}

/* ============================================================
 * Top-Level Controller Configuration
 * ============================================================ */

/**
 * Traffic controller configuration.
 */
export interface TrafficControllerOptions {
  maxConcurrent?: number;
  maxConcurrentPerProviderModel?: ProviderModelConcurrencyLimit;
  maxConcurrentPerTenant?: TenantConcurrencyLimit;

  rateLimits?: RateLimitConfig;

  priorityBurstLimits?: PriorityBurstLimits;
  priorityWeights?: PriorityWeights;

  adaptiveLimiter?: AdaptiveLimiterConfig;

  rateLimitKeyBuilder?: (metadata?: TrafficRequestMetadata) => string;

  retryPolicy?: RetryPolicyConfig;

  fallbackPolicy?: FallbackPolicyConfig;

  rateLimitStrategy?: RateLimitStrategyConfig;

  logger?: Logger;

  fallbackChains?: Record<string, FallbackChainEntry[]>;
}
