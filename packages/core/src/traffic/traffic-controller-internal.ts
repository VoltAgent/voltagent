import type { TrafficPriority, TrafficRequest, TrafficRequestType } from "./traffic-types";

export type Scheduler = (callback: () => void) => void;

export type DispatchDecision =
  | { kind: "dispatch" }
  | { kind: "skip" }
  | { kind: "wait"; wakeUpAt?: number };

export type CircuitStateStatus = "closed" | "open" | "half-open";

export interface CircuitState {
  status: CircuitStateStatus;
  failureTimestamps: number[];
  openedAt?: number;
  trialInFlight?: boolean;
}

export interface RateLimitWindowState {
  limit: number;
  remaining: number;
  resetAt: number;
  reserved: number;
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

  rateLimitKey?: string;
  etaMs?: number;

  circuitKey?: string;
  circuitStatus?: CircuitStateStatus;

  extractUsage?: TrafficRequest<TResponse>["extractUsage"];
}
