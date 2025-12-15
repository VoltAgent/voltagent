import type { Logger } from "../logger";

type BivariantFunction<TArgs extends unknown[], TReturn> = {
  bivarianceHack(...args: TArgs): TReturn;
}["bivarianceHack"];

type UsageCounters = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
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
  logger?: Logger;
  fallbackChains?: Record<string, string[]>;
}

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

export type RateLimitKey = string;
export type RateLimitConfig = Record<RateLimitKey, RateLimitOptions>;

export type TenantUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};
