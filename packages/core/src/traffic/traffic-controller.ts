import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";

type Scheduler = (callback: () => void) => void;
type BivariantHandler<TArgs extends unknown[]> = {
  bivarianceHack(...args: TArgs): void;
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
const DEFAULT_FALLBACK_CHAINS: Record<string, string[]> = {
  "gpt-4o": ["gpt-4o-mini", "gpt-3.5"],
};

interface RateLimitBucket {
  tokens: number;
  capacity: number;
  refillPerMs: number;
  lastRefill: number;
}

type NormalizedRateLimit = {
  capacity: number;
  refillPerMs: number;
};

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

export type RateLimitKey = string;
export type RateLimitConfig = Record<RateLimitKey, RateLimitOptions>;

type RateLimitHeaderSnapshot = {
  limitRequests: number;
  remainingRequests?: number;
  resetRequestsMs: number;
};

export type RateLimitUpdateResult = {
  key: string;
  headerSnapshot: RateLimitHeaderSnapshot;
  normalized: NormalizedRateLimit;
  appliedTokens: number;
};

export type TrafficRequestType = "text" | "stream";

export interface TrafficRequestMetadata {
  agentId?: string;
  agentName?: string;
  model?: string;
  provider?: string;
}

export interface TrafficRequest<TResponse> {
  metadata?: TrafficRequestMetadata;
  execute: () => Promise<TResponse>;
  createFallbackRequest?: (modelId: string) => TrafficRequest<TResponse> | undefined;
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
  private rateLimits?: Map<string, NormalizedRateLimit>;
  private readonly rateLimitBuckets = new Map<string, RateLimitBucket>();
  private readonly circuitBreakers = new Map<string, CircuitState>();
  private readonly fallbackChains: Map<string, string[]>;
  private queue: QueuedRequest[] = [];
  private activeCount = 0;
  private drainScheduled = false;
  private refillTimeout?: ReturnType<typeof setTimeout>;
  private readonly logger: Logger;

  private logDebug(message: string, details?: Record<string, unknown>): void {
    if (typeof console?.debug === "function") {
      console.debug(message, details);
    }
  }

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY;
    this.rateLimits = this.normalizeRateLimits(options.rateLimits);
    this.fallbackChains = this.normalizeFallbackChains(options.fallbackChains);
    this.scheduler = this.createScheduler();

    // NEW LOGGER (from c2 commit)
    this.logger = new LoggerProxy({ component: "traffic-controller" }, options.logger);

    // INIT LOG (from HEAD) — rewritten to use the new logger
    this.logger.debug("[TrafficController] init", {
      maxConcurrent: this.maxConcurrent,
      rateLimits: this.rateLimits ? Array.from(this.rateLimits.entries()) : undefined,
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
      // Collect the work item and metadata
      this.queue.push({
        type,
        request,
        resolve,
        reject,
        attempt: 1,
      });

      this.logDebug("[TrafficController] enqueue", {
        type,
        queueSize: this.queue.length,
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
    this.logDebug("[TrafficController] scheduleDrain", { queueSize: this.queue.length });
    this.scheduler(() => {
      this.drainScheduled = false;
      this.logDebug("[TrafficController] drainLoopStart", {
        queueSize: this.queue.length,
        active: this.activeCount,
      });
      this.drainQueue(); // Drain asynchronously so we never block the caller's tick
    });
  }

  private drainQueue(): void {
    // Pull as many items as we can until we hit capacity or rate limits
    while (this.queue.length > 0) {
      const next = this.queue[0]; // Peek without removing so we only dequeue when we can process
      if (!next) {
        break;
      }

      const decision = this.getProcessDecision(next);
      if (decision === "wait") {
        return; // Stop early; drain will be rescheduled once capacity frees up
      }

      this.queue.shift(); // Remove after we've confirmed we can process
      if (decision === "skip") {
        continue; // Already handled (e.g., circuit open with no fallback)
      }

      this.activeCount++; // Track in-flight work to enforce concurrency guard
      this.markCircuitTrial(next); // Reserve the half-open trial slot if needed

      this.logDebug("[TrafficController] dispatch", {
        type: next.type,
        queueSize: this.queue.length,
        active: this.activeCount,
        etaMs: next.etaMs,
        rateLimitKey: next.rateLimitKey,
        metadata: next.request.metadata,
      });

      void this.runRequest(next); // Fire off processing without blocking the loop
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

    const rateLimitConfig = this.getRateLimitConfig(next.request.metadata);
    if (!rateLimitConfig) {
      this.logDebug("[TrafficController] no rate limit match", {
        metadata: next.request.metadata,
      });
      next.rateLimitKey = undefined;
      next.etaMs = 0;
      return "process"; // No rate limit configured for this key
    }

    const queuedAhead = this.countQueuedAheadWithKey(
      rateLimitConfig.key,
      next,
      /*logDetails*/ true,
    );
    const bucket = this.getRateLimitBucket(rateLimitConfig.key, rateLimitConfig.limit);
    if (bucket.tokens < 1) {
      next.rateLimitKey = rateLimitConfig.key;
      next.etaMs = this.computeEtaMs(
        bucket,
        rateLimitConfig.limit,
        rateLimitConfig.key,
        next,
        queuedAhead,
      );
      this.logDebug("[TrafficController] throttle rate", {
        key: rateLimitConfig.key,
        tokens: bucket.tokens,
        etaMs: next.etaMs,
        queuedAhead,
      });
      this.scheduleRefill(rateLimitConfig.limit); // Ensure we retry as soon as tokens are replenished
      return "wait";
    }

    bucket.tokens -= 1; // Consume a token for this dispatch
    this.logDebug("[TrafficController] token consumed", {
      key: rateLimitConfig.key,
      remaining: bucket.tokens,
      capacity: bucket.capacity,
    });
    next.rateLimitKey = rateLimitConfig.key;
    next.etaMs = 0;
    return "process";
  }

  private getRateLimitConfig(
    metadata?: TrafficRequestMetadata,
  ): { key: string; limit: NormalizedRateLimit } | undefined {
    if (!this.rateLimits || this.rateLimits.size === 0) {
      return undefined;
    }

    const key = this.buildRateLimitKey(metadata);
    const limit = this.rateLimits.get(key);
    if (!limit) {
      return undefined;
    }

    this.logDebug("[TrafficController] rateLimitConfig hit", { key });
    return { key, limit };
  }

  private getRateLimitBucket(key: string, limit: NormalizedRateLimit): RateLimitBucket {
    const now = Date.now(); // Snapshot time once to avoid drift within this method
    let bucket = this.rateLimitBuckets.get(key); // Reuse the bucket if it already exists

    if (!bucket) {
      bucket = {
        tokens: limit.capacity,
        capacity: limit.capacity,
        refillPerMs: limit.refillPerMs,
        lastRefill: now,
      };
      this.rateLimitBuckets.set(key, bucket);
      this.logDebug("[TrafficController] bucket create", {
        key,
        capacity: bucket.capacity,
        refillPerMs: bucket.refillPerMs,
      });
      return bucket;
    }

    if (
      bucket.capacity !== limit.capacity ||
      Math.abs(bucket.refillPerMs - limit.refillPerMs) > Number.EPSILON
    ) {
      bucket.capacity = limit.capacity;
      bucket.refillPerMs = limit.refillPerMs;
      bucket.tokens = Math.min(bucket.tokens, bucket.capacity);
      bucket.lastRefill = now;
      this.logDebug("[TrafficController] bucket sync with new limit", {
        key,
        capacity: bucket.capacity,
        refillPerMs: bucket.refillPerMs,
      });
    }

    const elapsedMs = Math.max(0, now - bucket.lastRefill);
    if (elapsedMs > 0 && bucket.tokens < bucket.capacity) {
      const refilled = elapsedMs * bucket.refillPerMs; // Refill based on elapsed time
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refilled); // Cap at bucket capacity
      bucket.lastRefill = now; // Mark refill time for the next calculation
      this.logDebug("[TrafficController] bucket refill", {
        key,
        elapsedMs,
        tokens: bucket.tokens,
      });
    }

    return bucket;
  }

  private computeEtaMs(
    bucket: RateLimitBucket,
    limit: NormalizedRateLimit,
    key: string,
    current: QueuedRequest,
    queuedAhead?: number,
  ): number {
    const missingTokens = Math.max(0, 1 - bucket.tokens);
    const waitForToken =
      missingTokens > 0 && limit.refillPerMs > 0 ? Math.ceil(missingTokens / limit.refillPerMs) : 0;
    const aheadCount =
      typeof queuedAhead === "number"
        ? queuedAhead
        : this.countQueuedAheadWithKey(key, current, /*logDetails*/ false);
    const extraForQueue =
      aheadCount > 0 && limit.refillPerMs > 0 ? Math.ceil(aheadCount / limit.refillPerMs) : 0;
    this.logDebug("[TrafficController] computeEtaMs", {
      key,
      missingTokens,
      waitForToken,
      aheadCount,
      extraForQueue,
      eta: waitForToken + extraForQueue,
    });
    return waitForToken + extraForQueue;
  }

  private countQueuedAheadWithKey(key: string, current: QueuedRequest, logDetails = false): number {
    let count = 0;
    for (const item of this.queue) {
      if (item === current) {
        break;
      }

      const itemKey = this.buildRateLimitKey(item.request.metadata);
      if (itemKey === key) {
        count += 1;
      }
    }
    if (logDetails) {
      this.logDebug("[TrafficController] countQueuedAheadWithKey", {
        key,
        count,
        queueSize: this.queue.length,
      });
    }
    return count;
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

  private normalizeRateLimits(
    rateLimits?: RateLimitConfig,
  ): Map<string, NormalizedRateLimit> | undefined {
    if (!rateLimits) {
      return undefined;
    }

    const normalized = new Map<string, NormalizedRateLimit>();
    for (const [key, config] of Object.entries(rateLimits)) {
      if (config.capacity > 0 && config.refillPerSecond > 0) {
        normalized.set(key, {
          capacity: config.capacity,
          refillPerMs: config.refillPerSecond / 1000,
        });
      }
    }

    return normalized.size > 0 ? normalized : undefined;
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
   * Update (or bootstrap) rate limit buckets based on provider response headers.
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

    const normalized = this.normalizeHeaderRateLimit(headerInfo);
    if (!normalized) {
      this.logDebug("[TrafficController] rate limit headers present but invalid", {
        headerInfo,
      });
      return undefined;
    }

    const key = this.buildRateLimitKey(metadata);
    if (!this.rateLimits) {
      this.rateLimits = new Map();
    }
    this.rateLimits.set(key, normalized);

    const now = Date.now();
    const remainingTokens = this.coerceRemaining(headerInfo.remainingRequests, normalized.capacity);
    const existingBucket = this.rateLimitBuckets.get(key);
    const tokens = remainingTokens ?? existingBucket?.tokens ?? normalized.capacity;

    if (existingBucket) {
      existingBucket.capacity = normalized.capacity;
      existingBucket.refillPerMs = normalized.refillPerMs;
      existingBucket.tokens = Math.min(tokens, normalized.capacity);
      existingBucket.lastRefill = now;
    } else {
      this.rateLimitBuckets.set(key, {
        tokens: Math.min(tokens, normalized.capacity),
        capacity: normalized.capacity,
        refillPerMs: normalized.refillPerMs,
        lastRefill: now,
      });
    }

    this.logDebug("[TrafficController] rateLimit updated from headers", {
      key,
      capacity: normalized.capacity,
      refillPerMs: normalized.refillPerMs,
      remaining: remainingTokens,
    });

    // If we just refilled tokens, try draining again.
    this.scheduleDrain();

    return {
      key,
      headerSnapshot: headerInfo,
      normalized,
      appliedTokens: Math.min(tokens, normalized.capacity),
    };
  }

  private extractRateLimitHeaders(headers: unknown): RateLimitHeaderSnapshot | undefined {
    const getHeader = this.createHeaderLookup(headers);
    if (!getHeader) {
      return undefined;
    }

    const limitRequests = this.parseNumberHeader(getHeader, "x-ratelimit-limit-requests");
    const resetRequestsMs = this.parseDurationHeaderToMs(getHeader, "x-ratelimit-reset-requests");

    if (
      limitRequests === undefined ||
      limitRequests <= 0 ||
      resetRequestsMs === undefined ||
      resetRequestsMs <= 0
    ) {
      return undefined;
    }

    const remainingRequests = this.parseNumberHeader(getHeader, "x-ratelimit-remaining-requests");

    return {
      limitRequests,
      remainingRequests,
      resetRequestsMs,
    };
  }

  private normalizeHeaderRateLimit(
    snapshot: RateLimitHeaderSnapshot,
  ): NormalizedRateLimit | undefined {
    if (snapshot.limitRequests <= 0 || snapshot.resetRequestsMs <= 0) {
      return undefined;
    }

    return {
      capacity: snapshot.limitRequests,
      refillPerMs: snapshot.limitRequests / snapshot.resetRequestsMs,
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
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(ms|s)?$/i);
    if (!match) {
      return undefined;
    }

    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }

    const unit = (match[2] || "s").toLowerCase();
    return unit === "ms" ? value : value * 1000;
  }

  private scheduleRefill(limit: NormalizedRateLimit): void {
    if (this.refillTimeout) {
      return;
    }

    const delayMs = Math.max(1, Math.ceil(1 / limit.refillPerMs)); // Wait long enough for at least one token
    this.logDebug("[TrafficController] scheduleRefill", { delayMs });
    this.refillTimeout = setTimeout(() => {
      this.refillTimeout = undefined; // Allow future refills to be scheduled
      this.logDebug("[TrafficController] refillTimeoutFired", {
        queueSize: this.queue.length,
        active: this.activeCount,
      });
      this.scheduleDrain(); // Try draining again now that tokens should exist
    }, delayMs);
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
      queueSize: this.queue.length,
    });

    try {
      const result = await item.request.execute(); // Execute the user's operation
      this.recordCircuitSuccess(item.request.metadata);
      // Log raw result coming back from the underlying handler (e.g., AI SDK)
      this.logDebug("[TrafficController] runRequest result", {
        type: item.type,
        rateLimitKey: item.rateLimitKey,
        result,
      });
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
      this.activeCount = Math.max(0, this.activeCount - 1); // Ensure counter never underflows
      this.logDebug("[TrafficController] runRequest complete", {
        type: item.type,
        active: this.activeCount,
        queueSize: this.queue.length,
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
      this.queue.push({
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
