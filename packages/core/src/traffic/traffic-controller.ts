/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";

/* ============================================================
 * Types
 * ============================================================
 */

type Scheduler = (callback: () => void) => void;

type BivariantHandler<TArgs extends unknown[]> = {
  bivarianceHack(...args: TArgs): void;
}["bivarianceHack"];

type BivariantFunction<TArgs extends unknown[], TReturn> = {
  bivarianceHack(...args: TArgs): TReturn;
}["bivarianceHack"];

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

interface QueuedRequest<TResponse = unknown> {
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

export interface TrafficControllerOptions {
  maxConcurrent?: number;
  rateLimits?: RateLimitConfig;
  logger?: Logger;
  fallbackChains?: Record<string, string[]>;
}

/* ============================================================
 * Rate limiting
 * ============================================================
 */

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

export type RateLimitKey = string;
export type RateLimitConfig = Record<RateLimitKey, RateLimitOptions>;

interface RateLimitWindowState {
  limit: number;
  remaining: number;
  resetAt: number;
  reserved: number;
  nextAllowedAt: number;
}

/* ============================================================
 * Circuit breaker
 * ============================================================
 */

type CircuitStateStatus = "closed" | "open" | "half-open";

interface CircuitState {
  status: CircuitStateStatus;
  failureTimestamps: number[];
  openedAt?: number;
  trialInFlight?: boolean;
}

/* ============================================================
 * Usage
 * ============================================================
 */

export type TenantUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type UsageCounters = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

/* ============================================================
 * Internal constants
 * ============================================================
 */

type RetryReason = "rateLimit" | "serverError" | "timeout";

const MAX_RETRY_ATTEMPTS = 3;
const TIMEOUT_RETRY_ATTEMPTS = 2;

const RATE_LIMIT_BASE_BACKOFF_MS = 500;
const SERVER_ERROR_BASE_BACKOFF_MS = 1000;
const TIMEOUT_BASE_BACKOFF_MS = 750;

const RATE_LIMIT_JITTER_FACTOR = 0.35;
const SERVER_ERROR_JITTER_FACTOR = 0.8;
const TIMEOUT_JITTER_FACTOR = 0.5;

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_FAILURE_WINDOW_MS = 10_000;
const CIRCUIT_COOLDOWN_MS = 30_000;

const RATE_LIMIT_EXHAUSTION_BUFFER = 1;
const RATE_LIMIT_PROBE_DELAY_MS = 50;
const RATE_LIMIT_MIN_PACE_INTERVAL_MS = 10;
const RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS = 10;

const DEFAULT_FALLBACK_CHAINS: Record<string, string[]> = {
  "gpt-4o": ["gpt-4o-mini", "gpt-3.5"],
};

/* ============================================================
 * Dispatch decisions
 * ============================================================
 */

type DispatchDecision =
  | { kind: "dispatch" }
  | { kind: "skip" }
  | { kind: "wait"; wakeUpAt?: number };

/* ============================================================
 * Traffic Controller
 * ============================================================
 */

export class TrafficController {
  /* ---------- Core ---------- */

  private readonly scheduler: Scheduler;
  private readonly maxConcurrent: number;
  private readonly logger: Logger;

  private readonly queues: Record<TrafficPriority, QueuedRequest[]> = {
    P0: [],
    P1: [],
    P2: [],
  };
  private readonly priorityOrder: TrafficPriority[] = ["P0", "P1", "P2"];

  private activeCount = 0;
  private drainScheduled = false;

  /* ---------- Rate limits ---------- */

  private readonly rateLimitStates = new Map<string, RateLimitWindowState>();
  private wakeUpTimeout?: ReturnType<typeof setTimeout>;
  private wakeUpAt?: number;

  /* ---------- Circuit breakers ---------- */

  private readonly circuitBreakers = new Map<string, CircuitState>();
  private readonly fallbackChains: Map<string, string[]>;

  /* ---------- Usage ---------- */

  private readonly tenantUsage = new Map<string, TenantUsage>();

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY;
    this.scheduler = this.createScheduler();
    this.fallbackChains = this.normalizeFallbackChains(options.fallbackChains);
    this.logger = new LoggerProxy({ component: "traffic-controller" }, options.logger);
  }

  /* ============================================================
   * Public API
   * ============================================================
   */

  handleText<TResponse>(request: TrafficRequest<TResponse>): Promise<TResponse> {
    return this.enqueue("text", request);
  }

  handleStream<TResponse>(request: TrafficRequest<TResponse>): Promise<TResponse> {
    return this.enqueue("stream", request);
  }

  getTenantUsage(tenantId: string): TenantUsage | undefined {
    const usage = this.tenantUsage.get(tenantId);
    return usage ? { ...usage } : undefined;
  }

  /* ============================================================
   * Scheduler & Queue
   * ============================================================
   */

  private createScheduler(): Scheduler {
    return typeof queueMicrotask === "function" ? queueMicrotask : (cb) => setTimeout(cb, 0);
  }

  private enqueue<TResponse>(
    type: TrafficRequestType,
    request: TrafficRequest<TResponse>,
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const priority = this.resolvePriority(request.metadata);
      this.queues[priority].push({
        type,
        request,
        resolve,
        reject,
        attempt: 1,
        priority,
        tenantId: request.tenantId,
        extractUsage: request.extractUsage,
      });
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.drainScheduled) return;
    this.drainScheduled = true;

    this.scheduler(() => {
      this.drainScheduled = false;
      this.drainQueue();
    });
  }

  private drainQueue(): void {
    while (true) {
      const decision = this.tryDispatchNext();
      if (decision.kind === "dispatch" || decision.kind === "skip") continue;
      if (decision.kind === "wait") {
        if (decision.wakeUpAt) this.scheduleRateLimitWakeUpAt(decision.wakeUpAt);
        return;
      }
      return;
    }
  }

  /* ============================================================
   * Dispatch
   * ============================================================
   */

  private tryDispatchNext(): DispatchDecision {
    const next = this.peekNext();
    if (!next) return { kind: "wait" };
    if (this.activeCount >= this.maxConcurrent) return { kind: "wait" };

    const circuit = this.resolveCircuit(next);
    if (circuit) return circuit;

    const rateLimit = this.resolveRateLimit(next);
    if (rateLimit) return rateLimit;

    this.startRequest(next);
    return { kind: "dispatch" };
  }

  private peekNext(): QueuedRequest | undefined {
    for (const p of this.priorityOrder) {
      if (this.queues[p].length > 0) return this.queues[p][0];
    }
    return undefined;
  }

  private startRequest(item: QueuedRequest): void {
    this.queues[item.priority].shift();
    this.activeCount++;
    this.markCircuitTrial(item);
    void this.executeRequest(item);
  }

  /* ============================================================
   * Execution
   * ============================================================
   */

  private async executeRequest<TResponse>(item: QueuedRequest<TResponse>): Promise<void> {
    try {
      const result = await item.request.execute();
      this.recordCircuitSuccess(item.request.metadata);
      this.recordUsage(item, result);
      item.resolve(result);
    } catch (error) {
      this.recordCircuitFailure(item.request.metadata, error);

      const retry = this.buildRetryPlan(error, item.attempt);
      if (retry) {
        this.scheduleRetry(item, retry);
      } else {
        item.reject(error);
      }
    } finally {
      this.releaseRateLimitReservation(item.rateLimitKey);
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.scheduleDrain();
    }
  }

  /* ============================================================
   * Retry logic
   * ============================================================
   */

  private scheduleRetry<TResponse>(
    item: QueuedRequest<TResponse>,
    plan: { delayMs: number; reason: RetryReason },
  ): void {
    setTimeout(() => {
      this.queues[item.priority].push({
        ...item,
        attempt: item.attempt + 1,
        rateLimitKey: undefined,
        etaMs: undefined,
        circuitKey: undefined,
        circuitStatus: undefined,
      });
      this.scheduleDrain();
    }, plan.delayMs);
  }

  private buildRetryPlan(
    error: unknown,
    attempt: number,
  ): { delayMs: number; reason: RetryReason } | undefined {
    const reason = this.getRetryReason(error);
    if (!reason) return undefined;

    const max = reason === "timeout" ? TIMEOUT_RETRY_ATTEMPTS : MAX_RETRY_ATTEMPTS;
    if (attempt >= max) return undefined;

    return {
      reason,
      delayMs: this.computeBackoffDelay(reason, attempt),
    };
  }

  /* ============================================================
   * Rate limiting (verbatim logic)
   * ============================================================
   */

  private resolveRateLimit(next: QueuedRequest): DispatchDecision | null {
    const key = this.buildRateLimitKey(next.request.metadata);
    const state = this.rateLimitStates.get(key);
    if (!state) return null;

    const now = Date.now();
    const effectiveRemaining = Math.max(0, state.remaining - state.reserved);
    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;

    if (effectiveRemaining <= RATE_LIMIT_EXHAUSTION_BUFFER) {
      if (now < probeAt) {
        return { kind: "wait", wakeUpAt: probeAt };
      }
      if (state.reserved > 0) {
        return { kind: "wait" };
      }
    }

    if (now < state.nextAllowedAt) {
      return { kind: "wait", wakeUpAt: Math.min(state.resetAt, state.nextAllowedAt) };
    }

    state.reserved += 1;
    next.rateLimitKey = key;

    const remainingWindowMs = Math.max(0, state.resetAt - now);
    const intervalMs = Math.max(
      RATE_LIMIT_MIN_PACE_INTERVAL_MS,
      Math.ceil(remainingWindowMs / Math.max(effectiveRemaining, 1)),
    );

    const candidateNext = Math.max(state.nextAllowedAt, now + intervalMs);
    if (
      state.nextAllowedAt <= now ||
      candidateNext >= state.nextAllowedAt + RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS
    ) {
      state.nextAllowedAt = candidateNext;
    }

    return null;
  }

  private scheduleRateLimitWakeUpAt(wakeUpAt: number): void {
    const now = Date.now();
    const target = Math.max(now, wakeUpAt);

    if (this.wakeUpTimeout && this.wakeUpAt !== undefined && this.wakeUpAt <= target) {
      return;
    }

    if (this.wakeUpTimeout) clearTimeout(this.wakeUpTimeout);

    this.wakeUpAt = target;
    this.wakeUpTimeout = setTimeout(
      () => {
        this.wakeUpTimeout = undefined;
        this.wakeUpAt = undefined;
        this.scheduleDrain();
      },
      Math.max(1, target - now),
    );
  }

  private releaseRateLimitReservation(key?: string): void {
    if (!key) return;
    const state = this.rateLimitStates.get(key);
    if (!state || state.reserved <= 0) return;
    state.reserved -= 1;
  }

  /* ============================================================
   * Circuit breakers (verbatim logic, linearized)
   * ============================================================
   */

  private resolveCircuit(next: QueuedRequest): DispatchDecision | null {
    const visited = new Set<string>();

    while (true) {
      const key = this.buildRateLimitKey(next.request.metadata);
      next.circuitKey = key;

      const model = next.request.metadata?.model;
      if (model) visited.add(model);

      const evaluation = this.evaluateCircuitState(key);
      next.circuitStatus = evaluation.state;

      if (evaluation.allowRequest) return null;

      const fallback = this.findFallbackModel(next.request.metadata, visited);
      if (!fallback || !next.request.createFallbackRequest) {
        next.reject(
          new CircuitBreakerOpenError(
            `Circuit open for ${key}`,
            next.request.metadata,
            evaluation.retryAfterMs,
          ),
        );
        return { kind: "skip" };
      }

      const fallbackRequest = next.request.createFallbackRequest(fallback);
      if (!fallbackRequest) return { kind: "skip" };

      next.request = fallbackRequest;
      next.attempt = 1;
      next.rateLimitKey = undefined;
      next.etaMs = undefined;
      next.circuitKey = undefined;
      next.circuitStatus = undefined;
    }
  }

  private evaluateCircuitState(key: string): {
    allowRequest: boolean;
    state: CircuitStateStatus;
    retryAfterMs?: number;
  } {
    const state = this.circuitBreakers.get(key);
    if (!state) return { allowRequest: true, state: "closed" };

    const now = Date.now();

    if (state.status === "open") {
      const elapsed = state.openedAt ? now - state.openedAt : 0;
      if (elapsed >= CIRCUIT_COOLDOWN_MS) {
        state.status = "half-open";
        state.trialInFlight = false;
        state.failureTimestamps = [];
        return { allowRequest: true, state: "half-open" };
      }
      return {
        allowRequest: false,
        state: "open",
        retryAfterMs: CIRCUIT_COOLDOWN_MS - elapsed,
      };
    }

    if (state.status === "half-open" && state.trialInFlight) {
      return { allowRequest: false, state: "half-open" };
    }

    return { allowRequest: true, state: state.status };
  }

  private findFallbackModel(
    metadata: TrafficRequestMetadata | undefined,
    visitedModels: Set<string>,
  ): string | undefined {
    const currentModel = metadata?.model;
    if (!currentModel) {
      return undefined;
    }

    const chain = this.fallbackChains.get(currentModel);
    if (!chain) {
      return undefined;
    }

    const provider = metadata?.provider;
    for (const candidate of chain) {
      if (visitedModels.has(candidate)) {
        continue;
      }

      const candidateKey = this.buildRateLimitKey({
        provider,
        model: candidate,
      });

      const evaluation = this.evaluateCircuitState(candidateKey);
      if (evaluation.allowRequest) {
        visitedModels.add(candidate);
        return candidate;
      }
    }

    return undefined;
  }

  private markCircuitTrial(item: QueuedRequest): void {
    const key = item.circuitKey;
    if (!key) return;
    const state = this.circuitBreakers.get(key);
    if (state && state.status === "half-open" && !state.trialInFlight) {
      state.trialInFlight = true;
    }
  }

  private recordCircuitSuccess(metadata?: TrafficRequestMetadata): void {
    const key = this.buildRateLimitKey(metadata);
    this.circuitBreakers.delete(key);
  }

  private recordCircuitFailure(metadata: TrafficRequestMetadata | undefined, error: unknown): void {
    const status = this.extractStatusCode(error);
    if (!this.isCircuitBreakerStatus(status)) {
      this.circuitBreakers.delete(this.buildRateLimitKey(metadata));
      return;
    }

    const key = this.buildRateLimitKey(metadata);
    const now = Date.now();
    const state =
      this.circuitBreakers.get(key) ??
      ({ status: "closed", failureTimestamps: [] } as CircuitState);

    state.failureTimestamps = state.failureTimestamps.filter(
      (t) => now - t <= CIRCUIT_FAILURE_WINDOW_MS,
    );
    state.failureTimestamps.push(now);

    if (
      state.status === "half-open" ||
      state.failureTimestamps.length >= CIRCUIT_FAILURE_THRESHOLD
    ) {
      state.status = "open";
      state.openedAt = now;
      state.trialInFlight = false;
    }

    this.circuitBreakers.set(key, state);
  }

  /* ============================================================
   * Usage
   * ============================================================
   */

  private recordUsage<TResponse>(item: QueuedRequest<TResponse>, result: TResponse): void {
    const extractor = item.extractUsage ?? item.request.extractUsage;
    if (!extractor) return;

    const usage = extractor(result);
    if (!usage) return;

    if (this.isPromiseLike(usage)) {
      void usage.then((u) => u && this.incrementTenantUsage(item.tenantId, u));
    } else {
      this.incrementTenantUsage(item.tenantId, usage);
    }
  }

  private incrementTenantUsage(tenantId: string, usage: UsageCounters): void {
    const current = this.tenantUsage.get(tenantId) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    const input = usage.inputTokens ?? 0;
    const output = usage.outputTokens ?? 0;
    const total = usage.totalTokens ?? input + output;

    this.tenantUsage.set(tenantId, {
      inputTokens: current.inputTokens + input,
      outputTokens: current.outputTokens + output,
      totalTokens: current.totalTokens + total,
    });
  }

  /* ============================================================
   * Utilities
   * ============================================================
   */

  private resolvePriority(metadata?: TrafficRequestMetadata): TrafficPriority {
    return metadata?.priority ?? "P1";
  }

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    return `${metadata?.provider ?? "default-provider"}::${metadata?.model ?? "default-model"}`;
  }

  private normalizeFallbackChains(
    fallbackChains?: Record<string, string[]>,
  ): Map<string, string[]> {
    const chains = fallbackChains ?? DEFAULT_FALLBACK_CHAINS;
    return new Map(Object.entries(chains));
  }

  private getRetryReason(error: unknown): RetryReason | undefined {
    const status = this.extractStatusCode(error);
    if (status === 429) return "rateLimit";
    if (status && status >= 500) return "serverError";
    if (status === 408 || this.isTimeoutError(error)) return "timeout";
    return undefined;
  }

  private computeBackoffDelay(reason: RetryReason, attempt: number): number {
    const base =
      reason === "serverError"
        ? SERVER_ERROR_BASE_BACKOFF_MS
        : reason === "timeout"
          ? TIMEOUT_BASE_BACKOFF_MS
          : RATE_LIMIT_BASE_BACKOFF_MS;

    const jitter =
      reason === "serverError"
        ? SERVER_ERROR_JITTER_FACTOR
        : reason === "timeout"
          ? TIMEOUT_JITTER_FACTOR
          : RATE_LIMIT_JITTER_FACTOR;

    const exp = base * 2 ** (attempt - 1);
    return Math.round(exp + exp * jitter * Math.random());
  }

  private extractStatusCode(error: unknown): number | undefined {
    const e = error as any;
    return (
      this.coerceStatus(e?.status) ??
      this.coerceStatus(e?.statusCode) ??
      this.coerceStatus(e?.httpStatus) ??
      this.coerceStatus(e?.response?.status) ??
      this.coerceStatus(e?.cause?.status)
    );
  }

  private isTimeoutError(error: unknown): boolean {
    const e = error as any;
    return (
      String(e?.code ?? "")
        .toLowerCase()
        .includes("timeout") ||
      String(e?.name ?? "")
        .toLowerCase()
        .includes("timeout") ||
      String(e?.message ?? "")
        .toLowerCase()
        .includes("timeout")
    );
  }

  private isCircuitBreakerStatus(status?: number): boolean {
    return status === 429 || (status !== undefined && status >= 500);
  }

  private coerceStatus(value: unknown): number | undefined {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  private isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return !!value && typeof (value as any).then === "function";
  }
}

/* ============================================================
 * Error + Singleton
 * ============================================================
 */

export class CircuitBreakerOpenError extends Error {
  readonly retryAfterMs?: number;
  readonly metadata?: TrafficRequestMetadata;

  constructor(message: string, metadata?: TrafficRequestMetadata, retryAfterMs?: number) {
    super(message);
    this.name = "CircuitBreakerOpenError";
    this.metadata = metadata;
    this.retryAfterMs = retryAfterMs;
  }
}

let singletonController: TrafficController | undefined;

export function getTrafficController(options?: TrafficControllerOptions): TrafficController {
  if (!singletonController) {
    singletonController = new TrafficController(options);
  }
  return singletonController;
}
