import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";

type Scheduler = (callback: () => void) => void;
type BivariantHandler<TArgs extends unknown[]> = {
  bivarianceHack(...args: TArgs): void;
}["bivarianceHack"];
type BivariantFunction<TArgs extends unknown[], TReturn> = {
  bivarianceHack(...args: TArgs): TReturn;
}["bivarianceHack"];

type RetryReason = "rateLimit" | "serverError" | "timeout";

const MAX_RETRY_ATTEMPTS = 3;
const TIMEOUT_RETRY_ATTEMPTS = 2;
const RATE_LIMIT_BASE_BACKOFF_MS = 500;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_FAILURE_WINDOW_MS = 10_000;
const CIRCUIT_COOLDOWN_MS = 30_000;
const SERVER_ERROR_BASE_BACKOFF_MS = 1000;
const TIMEOUT_BASE_BACKOFF_MS = 750;
const RATE_LIMIT_JITTER_FACTOR = 0.35;
const SERVER_ERROR_JITTER_FACTOR = 0.8;
const TIMEOUT_JITTER_FACTOR = 0.5;
const RATE_LIMIT_EXHAUSTION_BUFFER = 1;
const RATE_LIMIT_PROBE_DELAY_MS = 50;
const RATE_LIMIT_MIN_PACE_INTERVAL_MS = 10;
const RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS = 10;
const DEFAULT_FALLBACK_CHAINS: Record<string, string[]> = {
  "gpt-4o": ["gpt-4o-mini", "gpt-3.5"],
};

type RateLimitWindowState = {
  limit: number;
  remaining: number;
  resetAt: number;
  reserved: number;
  nextAllowedAt: number;
};

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

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

export type RateLimitKey = string;
export type RateLimitConfig = Record<RateLimitKey, RateLimitOptions>;

type RateLimitHeaderSnapshot = {
  limitRequests: number;
  remainingRequests: number;
  resetRequestsMs: number;
};

export type RateLimitUpdateResult = {
  key: string;
  headerSnapshot: RateLimitHeaderSnapshot;
  state: RateLimitWindowState;
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

type CircuitStateStatus = "closed" | "open" | "half-open";

interface CircuitState {
  status: CircuitStateStatus;
  failureTimestamps: number[];
  openedAt?: number;
  trialInFlight?: boolean;
}

interface QueuedRequest<TResponse = unknown> {
  type: TrafficRequestType;
  request: TrafficRequest<TResponse>;
  resolve: BivariantHandler<[TResponse | PromiseLike<TResponse>]>;
  reject: BivariantHandler<[reason?: unknown]>;
  etaMs?: number;
  rateLimitKey?: string;
  attempt?: number;
  circuitKey?: string;
  circuitStatus?: CircuitStateStatus;
  priority: TrafficPriority;
  tenantId: string;
  extractUsage?: BivariantFunction<
    [response: TResponse],
    Promise<UsageCounters | undefined> | UsageCounters | undefined
  >;
}

export interface TrafficControllerOptions {
  maxConcurrent?: number;
  rateLimits?: RateLimitConfig;
  logger?: Logger;
  fallbackChains?: Record<string, string[]>;
}

type ProcessDecision = "process" | "skip" | "wait";

// Centralized traffic controller responsible for scheduling LLM calls.
// Provides a FIFO queue with a non-blocking scheduler and entrypoints
// for text and stream traffic.
export class TrafficController {
  private readonly scheduler: Scheduler;
  private readonly maxConcurrent: number;
  private readonly rateLimitStates = new Map<string, RateLimitWindowState>();
  private readonly circuitBreakers = new Map<string, CircuitState>();
  private readonly fallbackChains: Map<string, string[]>;
  private readonly priorityOrder: TrafficPriority[] = ["P0", "P1", "P2"];
  private readonly queues: Record<TrafficPriority, QueuedRequest[]> = {
    P0: [],
    P1: [],
    P2: [],
  };
  private activeCount = 0;
  private drainScheduled = false;
  private wakeUpTimeout?: ReturnType<typeof setTimeout>;
  private wakeUpAt?: number;
  private readonly tenantUsage = new Map<string, TenantUsage>();
  private readonly logger: Logger;

  private logDebug(message: string, details?: Record<string, unknown>): void {
    if (typeof console?.debug === "function") {
      console.debug(message, details);
    }
  }

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY;
    this.fallbackChains = this.normalizeFallbackChains(options.fallbackChains);
    this.scheduler = this.createScheduler();

    // NEW LOGGER (from c2 commit)
    this.logger = new LoggerProxy({ component: "traffic-controller" }, options.logger);

    // INIT LOG (from HEAD) — rewritten to use the new logger
    this.logger.debug("[TrafficController] init", {
      maxConcurrent: this.maxConcurrent,
      rateLimitKeys: Array.from(this.rateLimitStates.keys()),
    });
  }

  handleText<TResponse>(request: TrafficRequest<TResponse>): Promise<TResponse> {
    // Route text generation requests into the queue so all LLM calls share the same scheduler
    return this.enqueue("text", request);
  }

  handleStream<TResponse>(request: TrafficRequest<TResponse>): Promise<TResponse> {
    // Route streaming requests through the same queue to preserve ordering/backpressure rules
    return this.enqueue("stream", request);
  }

  getTenantUsage(tenantId: string): TenantUsage | undefined {
    const usage = this.tenantUsage.get(tenantId);
    return usage ? { ...usage } : undefined;
  }

  private createScheduler(): Scheduler {
    // Prefer queueMicrotask to keep the drain loop snappy without starving the event loop
    if (typeof queueMicrotask === "function") {
      return queueMicrotask;
    }

    return (callback: () => void) => setTimeout(callback, 0);
  }

  private enqueue<TResponse>(
    type: TrafficRequestType,
    request: TrafficRequest<TResponse>,
  ): Promise<TResponse> {
    // Each request gets a promise so callers can await their own result
    return new Promise<TResponse>((resolve, reject) => {
      const priority = this.resolvePriority(request.metadata);
      this.logger.debug("Enqueuing LLM request", {
        tenantId: request.tenantId,
        type,
        priority,
      });
      // Collect the work item and metadata
      this.getQueue(priority).push({
        type,
        request,
        resolve,
        reject,
        attempt: 1,
        priority,
        tenantId: request.tenantId,
        extractUsage: request.extractUsage,
      });

      this.logDebug("[TrafficController] enqueue", {
        type,
        queueSize: this.getQueueSize(),
        metadata: request.metadata,
      });

      // Kick the drain loop to start handling work
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.drainScheduled) {
      return;
    }

    this.drainScheduled = true; // Prevent redundant scheduling when many requests arrive at once
    this.logDebug("[TrafficController] scheduleDrain", { queueSize: this.getQueueSize() });
    this.scheduler(() => {
      this.drainScheduled = false;
      this.logDebug("[TrafficController] drainLoopStart", {
        queueSize: this.getQueueSize(),
        active: this.activeCount,
      });
      this.drainQueue(); // Drain asynchronously so we never block the caller's tick
    });
  }

  private drainQueue(): void {
    // Pull as many items as we can until we hit capacity or rate limits
    while (this.hasQueuedWork()) {
      if (this.activeCount >= this.maxConcurrent) {
        return;
      }

      let selected: { item: QueuedRequest; priority: TrafficPriority } | undefined;
      let skippedItem = false;

      for (const priority of this.priorityOrder) {
        const queue = this.getQueue(priority);
        if (queue.length === 0) {
          continue;
        }

        const candidate = queue[0];
        const decision = this.getProcessDecision(candidate);
        if (decision === "process") {
          selected = { item: candidate, priority };
          break;
        }

        if (decision === "skip") {
          queue.shift(); // Remove rejected item
          skippedItem = true;
          break; // Re-evaluate from highest priority after removing
        }

        // If wait, try lower priorities in the same drain cycle
      }

      if (selected) {
        const { item, priority } = selected;
        this.getQueue(priority).shift();
        this.activeCount++; // Track in-flight work to enforce concurrency guard
        this.markCircuitTrial(item); // Reserve the half-open trial slot if needed

        void this.runRequest(item); // Fire off processing without blocking the loop
        continue;
      }

      if (skippedItem) {
        continue; // We removed a blocked item; re-evaluate queues
      }

      // No runnable work right now; exit until capacity/rate-limit changes
      return;
    }
  }

  private getProcessDecision(next: QueuedRequest): ProcessDecision {
    const circuitDecision = this.evaluateCircuitBreaker(next);
    if (circuitDecision !== "process") {
      return circuitDecision;
    }

    if (this.activeCount >= this.maxConcurrent) {
      this.logDebug("[TrafficController] throttle concurrency", {
        active: this.activeCount,
        maxConcurrent: this.maxConcurrent,
      });
      return "wait";
    }

    const rateLimitState = this.getRateLimitState(next.request.metadata);
    if (!rateLimitState) {
      this.logDebug("[TrafficController] no rate limit match", {
        metadata: next.request.metadata,
      });
      next.rateLimitKey = undefined;
      next.etaMs = 0;
      return "process"; // No rate limit configured for this key
    }

    const { key, state } = rateLimitState;
    const now = Date.now();
    const effectiveRemaining = Math.max(0, state.remaining - state.reserved);
    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;

    if (effectiveRemaining <= RATE_LIMIT_EXHAUSTION_BUFFER) {
      next.rateLimitKey = key;
      next.etaMs = Math.max(0, probeAt - now);
      this.logDebug("[TrafficController] throttle rate", {
        key,
        remaining: state.remaining,
        reserved: state.reserved,
        resetAt: state.resetAt,
        nextAllowedAt: state.nextAllowedAt,
        effectiveRemaining,
        etaMs: next.etaMs,
      });

      if (now < probeAt) {
        this.scheduleRateLimitWakeUpAt(probeAt);
        return "wait";
      }

      // Window has expired, but we have not observed a newer header snapshot yet.
      // Allow a single probe request (no in-flight reservations) to refresh headers.
      if (state.reserved > 0) {
        return "wait";
      }
    }

    if (now < state.nextAllowedAt) {
      next.rateLimitKey = key;
      next.etaMs = Math.max(0, state.nextAllowedAt - now);
      this.logDebug("[TrafficController] throttle rate", {
        key,
        remaining: state.remaining,
        reserved: state.reserved,
        resetAt: state.resetAt,
        nextAllowedAt: state.nextAllowedAt,
        effectiveRemaining,
        etaMs: next.etaMs,
      });
      this.scheduleRateLimitWakeUpAt(Math.min(state.resetAt, state.nextAllowedAt));
      return "wait";
    }

    // Allow request: reserve one slot until we receive headers (or completion).
    state.reserved += 1;
    next.rateLimitKey = key;
    next.etaMs = 0;

    const remainingWindowMs = Math.max(0, state.resetAt - now);
    const intervalMs = Math.max(
      RATE_LIMIT_MIN_PACE_INTERVAL_MS,
      Math.ceil(remainingWindowMs / Math.max(effectiveRemaining, 1)),
    );
    const candidateNextAllowedAt = Math.max(state.nextAllowedAt, now + intervalMs);
    const shouldUpdateNextAllowedAt =
      state.nextAllowedAt <= now ||
      candidateNextAllowedAt >= state.nextAllowedAt + RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS;
    if (shouldUpdateNextAllowedAt) {
      state.nextAllowedAt = candidateNextAllowedAt;
    }

    this.logDebug("[TrafficController] rate limit reserved", {
      key,
      remaining: state.remaining,
      reserved: state.reserved,
      resetAt: state.resetAt,
      nextAllowedAt: state.nextAllowedAt,
      intervalMs,
      effectiveRemaining,
    });
    return "process";
  }

  private getRateLimitState(
    metadata?: TrafficRequestMetadata,
  ): { key: string; state: RateLimitWindowState } | undefined {
    const key = this.buildRateLimitKey(metadata);
    const state = this.rateLimitStates.get(key);
    if (!state) {
      return undefined;
    }

    this.logDebug("[TrafficController] rateLimitState hit", { key });
    return { key, state };
  }

  private evaluateCircuitBreaker(next: QueuedRequest): ProcessDecision {
    return this.evaluateCircuitBreakerForRequest(next, new Set<string>());
  }

  private evaluateCircuitBreakerForRequest(
    next: QueuedRequest,
    visitedModels: Set<string>,
  ): ProcessDecision {
    const key = this.buildRateLimitKey(next.request.metadata);
    next.circuitKey = key;

    const currentModel = next.request.metadata?.model;
    if (currentModel) {
      visitedModels.add(currentModel);
    }

    const evaluation = this.evaluateCircuitState(key);
    next.circuitStatus = evaluation.state;

    if (evaluation.allowRequest) {
      return "process";
    }

    const fallbackModel = this.findFallbackModel(next.request.metadata, visitedModels);
    if (fallbackModel && next.request.createFallbackRequest) {
      const fallbackRequest = next.request.createFallbackRequest(fallbackModel);
      if (fallbackRequest) {
        this.logger.warn("Circuit open; attempting fallback model", {
          fromModel: currentModel,
          fallbackModel,
          provider: next.request.metadata?.provider,
        });
        next.request = fallbackRequest;
        next.attempt = 1;
        next.rateLimitKey = undefined;
        next.etaMs = undefined;
        next.circuitKey = undefined;
        next.circuitStatus = undefined;
        return this.evaluateCircuitBreakerForRequest(next, visitedModels);
      }
    }

    const retryAfterMs = evaluation.retryAfterMs ?? CIRCUIT_COOLDOWN_MS;
    this.logger.warn("Circuit open; rejecting request", {
      circuitKey: key,
      retryAfterMs,
      metadata: next.request.metadata,
    });
    next.reject(
      new CircuitBreakerOpenError(
        `Circuit open for ${key}; retry after ${retryAfterMs}ms`,
        next.request.metadata,
        retryAfterMs,
      ),
    );
    return "skip";
  }

  private evaluateCircuitState(key: string): {
    allowRequest: boolean;
    state: CircuitStateStatus;
    retryAfterMs?: number;
  } {
    const state = this.circuitBreakers.get(key);
    if (!state) {
      return { allowRequest: true, state: "closed" };
    }

    const now = Date.now();

    if (state.status === "open") {
      const elapsed = state.openedAt ? now - state.openedAt : 0;
      if (elapsed >= CIRCUIT_COOLDOWN_MS) {
        state.status = "half-open";
        state.trialInFlight = false;
        state.failureTimestamps = [];
        this.circuitBreakers.set(key, state);
        return { allowRequest: true, state: state.status };
      }
      return {
        allowRequest: false,
        state: state.status,
        retryAfterMs: Math.max(0, CIRCUIT_COOLDOWN_MS - elapsed),
      };
    }

    if (state.status === "half-open") {
      if (state.trialInFlight) {
        return { allowRequest: false, state: state.status };
      }
      return { allowRequest: true, state: state.status };
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

      const candidateKey = this.buildRateLimitKey({ provider, model: candidate });
      const evaluation = this.evaluateCircuitState(candidateKey);
      if (evaluation.allowRequest) {
        visitedModels.add(candidate);
        return candidate;
      }
    }

    return undefined;
  }

  private markCircuitTrial(next: QueuedRequest): void {
    const key = next.circuitKey;
    if (!key) {
      return;
    }

    const state = this.circuitBreakers.get(key);
    if (state && state.status === "half-open" && !state.trialInFlight) {
      state.trialInFlight = true;
      this.circuitBreakers.set(key, state);
    }
  }

  private normalizeFallbackChains(
    fallbackChains?: Record<string, string[]>,
  ): Map<string, string[]> {
    const configuredChains = fallbackChains ?? DEFAULT_FALLBACK_CHAINS;
    const normalized = new Map<string, string[]>();

    for (const [model, chain] of Object.entries(configuredChains)) {
      if (Array.isArray(chain) && chain.length > 0) {
        normalized.set(model, [...chain]);
      }
    }

    return normalized;
  }

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    const provider = metadata?.provider ?? "default-provider";
    const model = metadata?.model ?? "default-model";
    return `${provider}::${model}`;
  }

  /**
   * Update (or bootstrap) rate limit window state based on provider response headers.
   * This lets the controller adopt server-issued limits without static config.
   */
  updateRateLimitFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
  ): RateLimitUpdateResult | undefined {
    const headerInfo = this.extractRateLimitHeaders(headers);
    if (!headerInfo) {
      this.logDebug("[TrafficController] no rate limit headers found on response", {
        metadata,
      });
      return undefined;
    }

    const key = this.buildRateLimitKey(metadata);
    const now = Date.now();
    const limit = headerInfo.limitRequests;
    const remaining = this.coerceRemaining(headerInfo.remainingRequests, limit);
    if (remaining === undefined) {
      this.logDebug("[TrafficController] rate limit headers present but invalid", {
        headerInfo,
      });
      return undefined;
    }

    const existing = this.rateLimitStates.get(key);
    const resetAtCandidate = now + headerInfo.resetRequestsMs;
    const resetAt = existing ? Math.max(existing.resetAt, resetAtCandidate) : resetAtCandidate;
    const reserved = Math.max(0, existing?.reserved ?? 0);
    const remainingFromHeaders = Math.min(limit, remaining);
    const isSameWindow = Boolean(existing && now < existing.resetAt);
    const nextRemaining = isSameWindow
      ? Math.min(existing?.remaining ?? remainingFromHeaders, remainingFromHeaders)
      : remainingFromHeaders;
    const effectiveRemaining = Math.max(0, nextRemaining - reserved);
    const state: RateLimitWindowState = {
      limit,
      remaining: nextRemaining,
      resetAt,
      reserved,
      nextAllowedAt: existing?.nextAllowedAt ?? now,
    };

    this.rateLimitStates.set(key, state);

    this.logDebug("[TrafficController] rateLimit updated from headers", {
      key,
      limit: state.limit,
      remaining: state.remaining,
      reserved: state.reserved,
      effectiveRemaining,
      resetAt: state.resetAt,
      nextAllowedAt: state.nextAllowedAt,
    });

    // Try draining again in case this update unblocks queued work.
    this.scheduleDrain();

    return {
      key,
      headerSnapshot: headerInfo,
      state,
    };
  }

  private extractRateLimitHeaders(headers: unknown): RateLimitHeaderSnapshot | undefined {
    const getHeader = this.createHeaderLookup(headers);
    if (!getHeader) {
      return undefined;
    }

    const limitRequests = this.parseNumberHeader(getHeader, "x-ratelimit-limit-requests");
    const remainingRequests = this.parseNumberHeader(getHeader, "x-ratelimit-remaining-requests");
    const resetRequestsMs = this.parseDurationHeaderToMs(getHeader, "x-ratelimit-reset-requests");

    if (
      limitRequests === undefined ||
      limitRequests <= 0 ||
      remainingRequests === undefined ||
      resetRequestsMs === undefined ||
      resetRequestsMs <= 0
    ) {
      return undefined;
    }

    return {
      limitRequests,
      remainingRequests,
      resetRequestsMs,
    };
  }

  private coerceRemaining(remaining: number | undefined, capacity: number): number | undefined {
    if (remaining === undefined) {
      return undefined;
    }

    const parsed = Number(remaining);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    return Math.max(0, Math.min(capacity, Math.floor(parsed)));
  }

  private createHeaderLookup(headers: unknown): ((name: string) => string | undefined) | undefined {
    if (!headers) {
      return undefined;
    }

    const maybeHeaders = headers as { get?: (name: string) => unknown };
    if (typeof maybeHeaders?.get === "function") {
      return (name: string) => {
        const value = maybeHeaders.get?.(name);
        return value === undefined || value === null ? undefined : String(value);
      };
    }

    if (typeof headers === "object") {
      const entries = Object.entries(headers as Record<string, unknown>);
      if (entries.length === 0) {
        return undefined;
      }

      return (name: string) => {
        const target = name.toLowerCase();
        for (const [key, value] of entries) {
          if (typeof key === "string" && key.toLowerCase() === target) {
            if (Array.isArray(value)) {
              const first = value[0];
              return first === undefined || first === null ? undefined : String(first);
            }
            return value === undefined || value === null ? undefined : String(value);
          }
        }
        return undefined;
      };
    }

    return undefined;
  }

  private parseNumberHeader(
    getHeader: (name: string) => string | undefined,
    name: string,
  ): number | undefined {
    const raw = getHeader(name);
    if (raw === undefined) {
      return undefined;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseDurationHeaderToMs(
    getHeader: (name: string) => string | undefined,
    name: string,
  ): number | undefined {
    const raw = getHeader(name);
    if (!raw) {
      return undefined;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }

    const simpleMatch = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i);
    if (simpleMatch) {
      const value = Number(simpleMatch[1]);
      if (!Number.isFinite(value) || value <= 0) {
        return undefined;
      }

      const unit = (simpleMatch[2] ?? "s").toLowerCase();
      switch (unit) {
        case "ms":
          return value;
        case "s":
          return value * 1000;
        case "m":
          return value * 60 * 1000;
        case "h":
          return value * 60 * 60 * 1000;
        default:
          return undefined;
      }
    }

    // Compound durations like "1m30.951s"
    const segmentRegex = /(\d+(?:\.\d+)?)(ms|s|m|h)/gi;
    let totalMs = 0;
    let matched = false;

    segmentRegex.lastIndex = 0;
    let segment: RegExpExecArray | null = segmentRegex.exec(trimmed);
    while (segment !== null) {
      matched = true;
      const value = Number(segment[1]);
      if (!Number.isFinite(value) || value < 0) {
        return undefined;
      }

      const unit = segment[2].toLowerCase();
      switch (unit) {
        case "ms":
          totalMs += value;
          break;
        case "s":
          totalMs += value * 1000;
          break;
        case "m":
          totalMs += value * 60 * 1000;
          break;
        case "h":
          totalMs += value * 60 * 60 * 1000;
          break;
        default:
          return undefined;
      }

      segment = segmentRegex.exec(trimmed);
    }

    if (!matched || totalMs <= 0) {
      return undefined;
    }

    segmentRegex.lastIndex = 0;
    const leftover = trimmed.replace(segmentRegex, "").trim();
    if (leftover) {
      return undefined;
    }

    return totalMs;
  }

  private resolvePriority(metadata?: TrafficRequestMetadata): TrafficPriority {
    const candidate = metadata?.priority;
    if (candidate === "P0" || candidate === "P1" || candidate === "P2") {
      return candidate;
    }

    return "P1";
  }

  private getQueue(priority: TrafficPriority): QueuedRequest[] {
    return this.queues[priority];
  }

  private hasQueuedWork(): boolean {
    return this.priorityOrder.some((priority) => this.getQueue(priority).length > 0);
  }

  private getQueueSize(): number {
    let size = 0;
    for (const priority of this.priorityOrder) {
      size += this.getQueue(priority).length;
    }
    return size;
  }

  private scheduleRateLimitWakeUpAt(wakeUpAt: number): void {
    if (!Number.isFinite(wakeUpAt)) {
      return;
    }

    const now = Date.now();
    const targetAt = Math.max(now, wakeUpAt);

    if (this.wakeUpTimeout && this.wakeUpAt !== undefined && this.wakeUpAt <= targetAt) {
      return;
    }

    if (this.wakeUpTimeout) {
      clearTimeout(this.wakeUpTimeout);
      this.wakeUpTimeout = undefined;
    }

    this.wakeUpAt = targetAt;
    const delayMs = Math.max(1, Math.ceil(targetAt - now));
    this.logDebug("[TrafficController] scheduleRateLimitWakeUp", { delayMs, wakeUpAt: targetAt });
    this.wakeUpTimeout = setTimeout(() => {
      this.wakeUpTimeout = undefined;
      this.wakeUpAt = undefined;
      this.logDebug("[TrafficController] rateLimitWakeUpFired", {
        queueSize: this.getQueueSize(),
        active: this.activeCount,
      });
      this.scheduleDrain();
    }, delayMs);
  }

  private releaseRateLimitReservation(key: string | undefined): void {
    if (!key) {
      return;
    }

    const state = this.rateLimitStates.get(key);
    if (!state) {
      return;
    }

    if (state.reserved <= 0) {
      return;
    }

    state.reserved = Math.max(0, state.reserved - 1);
    this.logDebug("[TrafficController] rate limit released", {
      key,
      reserved: state.reserved,
      remaining: state.remaining,
      resetAt: state.resetAt,
      nextAllowedAt: state.nextAllowedAt,
    });
  }

  private recordCircuitSuccess(metadata?: TrafficRequestMetadata): void {
    const key = this.buildRateLimitKey(metadata);
    if (this.circuitBreakers.has(key)) {
      this.circuitBreakers.delete(key);
    }
  }

  private recordCircuitFailure(metadata: TrafficRequestMetadata | undefined, error: unknown): void {
    const status = this.extractStatusCode(error);
    if (!this.isCircuitBreakerStatus(status)) {
      this.resetCircuitFailures(metadata);
      return;
    }

    const key = this.buildRateLimitKey(metadata);
    const now = Date.now();
    const state =
      this.circuitBreakers.get(key) ??
      ({
        status: "closed",
        failureTimestamps: [],
      } as CircuitState);

    const recentFailures = state.failureTimestamps.filter(
      (timestamp) => now - timestamp <= CIRCUIT_FAILURE_WINDOW_MS,
    );
    recentFailures.push(now);

    if (state.status === "half-open") {
      state.status = "open";
      state.openedAt = now;
      state.trialInFlight = false;
      state.failureTimestamps = [now];
      this.circuitBreakers.set(key, state);
      this.logger.warn("Circuit reopened after half-open failure", {
        circuitKey: key,
        statusCode: status,
      });
      return;
    }

    state.failureTimestamps = recentFailures;
    if (state.failureTimestamps.length >= CIRCUIT_FAILURE_THRESHOLD) {
      state.status = "open";
      state.openedAt = now;
      state.trialInFlight = false;
      this.logger.warn("Circuit opened after consecutive failures", {
        circuitKey: key,
        failureCount: state.failureTimestamps.length,
        statusCode: status,
      });
    }

    this.circuitBreakers.set(key, state);
  }

  private resetCircuitFailures(metadata?: TrafficRequestMetadata): void {
    const key = this.buildRateLimitKey(metadata);
    const state = this.circuitBreakers.get(key);
    if (!state) {
      return;
    }

    state.failureTimestamps = [];
    if (state.status !== "open") {
      state.status = "closed";
      state.trialInFlight = false;
    }

    this.circuitBreakers.set(key, state);
  }

  private recordUsageFromResult<TResponse>(
    item: QueuedRequest<TResponse>,
    result: TResponse,
  ): void {
    const extractor = item.extractUsage ?? item.request.extractUsage;
    if (!extractor) {
      return;
    }

    try {
      const usageCandidate = extractor(result);
      if (!usageCandidate) {
        return;
      }

      if (this.isPromiseLike(usageCandidate)) {
        void Promise.resolve(usageCandidate)
          .then((usage) => {
            if (usage) {
              this.incrementTenantUsage(item.tenantId, usage);
            }
          })
          .catch((error) => {
            this.logger.debug("Failed to record tenant usage", { tenantId: item.tenantId, error });
          });
        return;
      }

      this.incrementTenantUsage(item.tenantId, usageCandidate as UsageCounters);
    } catch (error) {
      this.logger.debug("Failed to record tenant usage", { tenantId: item.tenantId, error });
    }
  }

  private incrementTenantUsage(tenantId: string, usage: UsageCounters): void {
    const current = this.tenantUsage.get(tenantId) ?? {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    const totalTokens = usage.totalTokens ?? inputTokens + outputTokens;
    const updated: TenantUsage = {
      inputTokens: current.inputTokens + inputTokens,
      outputTokens: current.outputTokens + outputTokens,
      totalTokens: current.totalTokens + totalTokens,
    };
    this.tenantUsage.set(tenantId, updated);
    this.logger.debug("Recorded tenant usage", { tenantId, usage: updated });
  }

  private isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return (
      typeof value === "object" &&
      value !== null &&
      typeof (value as PromiseLike<unknown>).then === "function"
    );
  }

  private isCircuitBreakerStatus(status?: number): boolean {
    if (status === 429) {
      return true;
    }

    return status !== undefined && status >= 500 && status < 600;
  }

  private async runRequest<TResponse>(item: QueuedRequest<TResponse>): Promise<void> {
    const attempt = item.attempt ?? 1;

    this.logDebug("[TrafficController] runRequest start", {
      type: item.type,
      rateLimitKey: item.rateLimitKey,
      etaMs: item.etaMs,
      active: this.activeCount,
      queueSize: this.getQueueSize(),
    });

    try {
      const result = await item.request.execute(); // Execute the user's operation
      this.recordCircuitSuccess(item.request.metadata);
      this.recordUsageFromResult(item, result);
      item.resolve(result); // Deliver successful result back to the waiting caller
    } catch (error) {
      this.recordCircuitFailure(item.request.metadata, error);
      const retryPlan = this.buildRetryPlan(error, attempt);
      if (retryPlan) {
        this.scheduleRetry(item, attempt + 1, retryPlan.delayMs, retryPlan.reason);
      } else {
        item.reject(error); // Surface failures to the caller
      }
    } finally {
      this.releaseRateLimitReservation(item.rateLimitKey);
      this.activeCount = Math.max(0, this.activeCount - 1); // Ensure counter never underflows
      this.logDebug("[TrafficController] runRequest complete", {
        type: item.type,
        active: this.activeCount,
        queueSize: this.getQueueSize(),
      });
      this.scheduleDrain(); // Immediately try to pull the next request
    }
  }

  private buildRetryPlan(
    error: unknown,
    attempt: number,
  ): { delayMs: number; reason: RetryReason } | undefined {
    const reason = this.getRetryReason(error);
    if (!reason) {
      return undefined;
    }

    const maxAttempts = reason === "timeout" ? TIMEOUT_RETRY_ATTEMPTS : MAX_RETRY_ATTEMPTS;
    if (attempt >= maxAttempts) {
      return undefined;
    }

    return {
      reason,
      delayMs: this.computeBackoffDelay(reason, attempt),
    };
  }

  private getRetryReason(error: unknown): RetryReason | undefined {
    const statusCode = this.extractStatusCode(error);
    if (statusCode === 429) {
      return "rateLimit";
    }

    if (statusCode !== undefined && statusCode >= 500 && statusCode < 600) {
      return "serverError";
    }

    if (statusCode === 408 || this.isTimeoutError(error)) {
      return "timeout";
    }

    return undefined;
  }

  private extractStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== "object") {
      return undefined;
    }

    const candidate = error as { status?: unknown; statusCode?: unknown; httpStatus?: unknown };
    const directStatus =
      this.coerceStatus(candidate.status) ??
      this.coerceStatus(candidate.statusCode) ??
      this.coerceStatus(candidate.httpStatus);
    if (directStatus !== undefined) {
      return directStatus;
    }

    const responseStatus = (error as { response?: { status?: unknown } }).response?.status;
    const normalizedResponseStatus = this.coerceStatus(responseStatus);
    if (normalizedResponseStatus !== undefined) {
      return normalizedResponseStatus;
    }

    const causeStatus = (error as { cause?: { status?: unknown; statusCode?: unknown } }).cause;
    if (causeStatus) {
      const normalizedCauseStatus =
        this.coerceStatus(causeStatus.status) ?? this.coerceStatus(causeStatus.statusCode);
      if (normalizedCauseStatus !== undefined) {
        return normalizedCauseStatus;
      }
    }

    return undefined;
  }

  private isTimeoutError(error: unknown): boolean {
    const candidates = [error, (error as { cause?: unknown })?.cause];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") {
        continue;
      }

      const timeoutCode = (candidate as { code?: unknown }).code;
      if (typeof timeoutCode === "string" && timeoutCode.toLowerCase().includes("timeout")) {
        return true;
      }

      const name = (candidate as { name?: unknown }).name;
      if (typeof name === "string" && name.toLowerCase().includes("timeout")) {
        return true;
      }

      const message = (candidate as { message?: unknown }).message;
      if (typeof message === "string" && message.toLowerCase().includes("timeout")) {
        return true;
      }
    }

    return false;
  }

  private coerceStatus(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private computeBackoffDelay(reason: RetryReason, attempt: number): number {
    const base =
      reason === "serverError"
        ? SERVER_ERROR_BASE_BACKOFF_MS
        : reason === "timeout"
          ? TIMEOUT_BASE_BACKOFF_MS
          : RATE_LIMIT_BASE_BACKOFF_MS;

    const jitterFactor =
      reason === "serverError"
        ? SERVER_ERROR_JITTER_FACTOR
        : reason === "timeout"
          ? TIMEOUT_JITTER_FACTOR
          : RATE_LIMIT_JITTER_FACTOR;

    const exponential = base * 2 ** Math.max(0, attempt - 1);
    const jitter = exponential * jitterFactor * Math.random();
    return Math.max(1, Math.round(exponential + jitter));
  }

  private scheduleRetry<TResponse>(
    item: QueuedRequest<TResponse>,
    nextAttempt: number,
    delayMs: number,
    reason: RetryReason,
  ): void {
    this.logger.debug("Retrying request through controller", {
      reason,
      delayMs,
      attempt: nextAttempt,
      maxAttempts: reason === "timeout" ? TIMEOUT_RETRY_ATTEMPTS : MAX_RETRY_ATTEMPTS,
      metadata: item.request.metadata,
    });

    setTimeout(() => {
      const retryPriority = item.priority;
      this.getQueue(retryPriority).push({
        ...item,
        attempt: nextAttempt,
        etaMs: undefined,
        rateLimitKey: undefined,
        circuitKey: undefined,
        circuitStatus: undefined,
      });
      this.scheduleDrain();
    }, delayMs);
  }
}

let singletonController: TrafficController | undefined;

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

/**
 * Retrieve the shared traffic controller instance.
 */
export function getTrafficController(options?: TrafficControllerOptions): TrafficController {
  if (!singletonController) {
    // Create a singleton controller so all agents share the same queue/scheduling behavior
    singletonController = new TrafficController(options);
  }

  return singletonController;
}
