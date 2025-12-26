import type { Logger } from "../logger";

type BivariantFunction<TArgs extends unknown[], TReturn> = {
  bivarianceHack(...args: TArgs): TReturn;
}["bivarianceHack"];

type UsageCounters = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type RetryReason = "rateLimit" | "serverError" | "timeout";

export type RetryPlan = {
  delayMs: number;
  reason: RetryReason;
};

export type RetryPolicyContext = {
  error: unknown;
  attempt: number;
  metadata?: TrafficRequestMetadata;
  key?: string;
  logger?: Logger;
};

export type RetryPolicy = (context: RetryPolicyContext) => RetryPlan | undefined;

export type RetryPolicyConfig = {
  default?: RetryPolicy;
  providers?: Record<string, RetryPolicy>;
  models?: Record<string, RetryPolicy>;
};

export type TrafficRequestType = "text" | "stream";
export type TrafficPriority = "P0" | "P1" | "P2";

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

export type FallbackTarget = {
  provider?: string;
  model: string;
};

export type ShortResponseFallbackTarget = {
  kind: "short-response";
  text: string;
};

export type FallbackChainEntry = string | FallbackTarget | ShortResponseFallbackTarget;

export type FallbackPolicyMode = "fallback" | "wait";

export type FallbackPolicy = {
  mode: FallbackPolicyMode;
};

export type FallbackPolicyConfig = {
  defaultPolicyId?: string;
  policies?: Record<string, FallbackPolicy>;
  taskTypePolicyIds?: Record<string, string>;
};

export type ProviderModelConcurrencyLimit =
  | number
  | Record<string, number>
  | ((metadata: TrafficRequestMetadata | undefined, key: string) => number | undefined);

export type TenantConcurrencyLimit =
  | number
  | Record<string, number>
  | ((tenantId: string, metadata: TrafficRequestMetadata | undefined) => number | undefined);

export type PriorityBurstLimits = Partial<Record<TrafficPriority, number>>;
export type PriorityWeights = Partial<Record<TrafficPriority, number>>;

export type AdaptiveLimiterConfig = {
  windowMs?: number;
  threshold?: number;
  minPenaltyMs?: number;
  maxPenaltyMs?: number;
  penaltyMultiplier?: number;
  decayMs?: number;
};

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

export interface TrafficControllerOptions {
  maxConcurrent?: number;
  maxConcurrentPerProviderModel?: ProviderModelConcurrencyLimit;
  maxConcurrentPerTenant?: TenantConcurrencyLimit;
  rateLimits?: RateLimitConfig;
  priorityBurstLimits?: PriorityBurstLimits;
  priorityWeights?: PriorityWeights;
  adaptiveLimiter?: AdaptiveLimiterConfig;
  /**
   * Optional override for rate-limit key construction.
   * Useful when you need to add new metadata fields without changing core logic.
   */
  rateLimitKeyBuilder?: (metadata?: TrafficRequestMetadata) => string;
  /**
   * Optional retry policy overrides by provider/model.
   * Models keys can use the rate-limit key or provider::model.
   */
  retryPolicy?: RetryPolicyConfig;
  /**
   * Optional fallback policy selection by task type or explicit policy id.
   */
  fallbackPolicy?: FallbackPolicyConfig;
  /**
   * Select a rate-limit strategy by provider/model.
   * Example:
   *  { providers: { openai: "window" }, models: { "openai::gpt-4o": "window" } }
   */
  rateLimitStrategy?: RateLimitStrategyConfig;
  logger?: Logger;
  fallbackChains?: Record<string, FallbackChainEntry[]>;
}

export type RateLimitStrategyKind = "window" | "token-bucket";

export type RateLimitStrategyConfig = {
  providers?: Record<string, RateLimitStrategyKind>;
  models?: Record<string, RateLimitStrategyKind>;
};

export interface RateLimitOptions {
  requestsPerMinute: number;
  tokensPerMinute: number;
  burstSize?: number;
}

export type RateLimitKey = string;
export type RateLimitConfig = Record<RateLimitKey, RateLimitOptions>;

export type TenantUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};
