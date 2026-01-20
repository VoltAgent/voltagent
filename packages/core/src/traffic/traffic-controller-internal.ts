import type { TrafficPriority, TrafficRequest, TrafficRequestType } from "./traffic-types";

export type Scheduler = (callback: () => void) => void;

export type DispatchDecision =
  | { kind: "dispatch" }
  | { kind: "skip" }
  | { kind: "wait"; wakeUpAt: number }
  | { kind: "blocked" }
  | { kind: "idle" };

export type CircuitStateStatus = "closed" | "open" | "half-open";

export interface CircuitState {
  status: CircuitStateStatus;
  failureTimestamps: number[];
  timeoutTimestamps: number[];
  openedAt?: number;
  trialInFlight?: boolean;
  nextProbeAt?: number;
}

export interface RateLimitWindowState {
  limit: number;
  remaining: number;
  resetAt: number;
  slotReservedForStream: number;
  nextAllowedAt: number;
}

type BivariantHandler<TArgs extends unknown[]> = {
  bivarianceHack(...args: TArgs): void;
}["bivarianceHack"];

export interface QueuedRequest<TResponse = unknown> {
  type: TrafficRequestType;
  request: TrafficRequest<TResponse>;
  resolve: BivariantHandler<[TResponse | PromiseLike<TResponse>]>;
  reject: BivariantHandler<[reason?: unknown]>;
  attempt: number;
  priority: TrafficPriority;
  tenantId: string;
  enqueuedAt: number;
  dispatchedAt?: number;
  estimatedTokens?: number;
  reservedTokens?: number;
  queueTimeoutDisabled?: boolean;

  tenantConcurrencyKey?: string;
  providerModelConcurrencyKey?: string;

  rateLimitKey?: string;
  etaMs?: number;

  circuitKey?: string;
  circuitStatus?: CircuitStateStatus;

  extractUsage?: TrafficRequest<TResponse>["extractUsage"];
}
