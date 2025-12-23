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
  priority?: TrafficPriority;
  tenantId?: string;
  apiKeyId?: string;
  region?: string;
  endpoint?: string;
  tenantTier?: string;
  taskType?: string;
}

export type ProviderModelConcurrencyLimit =
  | number
  | Record<string, number>
  | ((metadata: TrafficRequestMetadata | undefined, key: string) => number | undefined);

export type TenantConcurrencyLimit =
  | number
  | Record<string, number>
  | ((tenantId: string, metadata: TrafficRequestMetadata | undefined) => number | undefined);

export interface TrafficRequest<TResponse> {
  tenantId: string;
  metadata?: TrafficRequestMetadata;
  execute: () => Promise<TResponse>;
  deadlineAt?: number;
  createFallbackRequest?: (modelId: string) => TrafficRequest<TResponse> | undefined;
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
   * Select a rate-limit strategy by provider/model.
   * Example:
   *  { providers: { openai: "window" }, models: { "openai::gpt-4o": "window" } }
   */
  rateLimitStrategy?: RateLimitStrategyConfig;
  logger?: Logger;
  fallbackChains?: Record<string, string[]>;
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
