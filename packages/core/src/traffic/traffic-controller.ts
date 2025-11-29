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
const SERVER_ERROR_BASE_BACKOFF_MS = 1000;
const TIMEOUT_BASE_BACKOFF_MS = 750;
const RATE_LIMIT_JITTER_FACTOR = 0.35;
const SERVER_ERROR_JITTER_FACTOR = 0.8;
const TIMEOUT_JITTER_FACTOR = 0.5;

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
}

interface QueuedRequest<TResponse = unknown> {
  type: TrafficRequestType;
  request: TrafficRequest<TResponse>;
  resolve: BivariantHandler<[TResponse | PromiseLike<TResponse>]>;
  reject: BivariantHandler<[reason?: unknown]>;
  etaMs?: number;
  rateLimitKey?: string;
  attempt?: number;
}

export interface TrafficControllerOptions {
  maxConcurrent?: number;
  rateLimits?: RateLimitConfig;
  logger?: Logger;
}

// Centralized traffic controller responsible for scheduling LLM calls.
// Provides a FIFO queue with a non-blocking scheduler and entrypoints
// for text and stream traffic.
export class TrafficController {
  private readonly scheduler: Scheduler;
  private readonly maxConcurrent: number;
  private readonly rateLimits?: Map<string, NormalizedRateLimit>;
  private readonly rateLimitBuckets = new Map<string, RateLimitBucket>();
  private queue: QueuedRequest[] = [];
  private activeCount = 0;
  private drainScheduled = false;
  private refillTimeout?: ReturnType<typeof setTimeout>;
  private readonly logger: Logger;

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY; // Concurrency guard; defaults to no cap for now
    this.rateLimits = this.normalizeRateLimits(options.rateLimits);
    this.scheduler = this.createScheduler(); // Select scheduler once so the rest of the code can stay simple
    this.logger = new LoggerProxy({ component: "traffic-controller" }, options.logger);
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

      // Kick the drain loop to start handling work
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.drainScheduled) {
      return;
    }

    this.drainScheduled = true; // Prevent redundant scheduling when many requests arrive at once
    this.scheduler(() => {
      this.drainScheduled = false;
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
      if (!this.canProcess(next)) {
        return; // Stop early; drain will be rescheduled once capacity frees up
      }

      this.queue.shift(); // Remove after we've confirmed we can process
      this.activeCount++; // Track in-flight work to enforce concurrency guard

      void this.runRequest(next); // Fire off processing without blocking the loop
    }
  }

  private canProcess(next: QueuedRequest): boolean {
    if (this.activeCount >= this.maxConcurrent) {
      return false;
    }

    const rateLimitConfig = this.getRateLimitConfig(next.request.metadata);
    if (!rateLimitConfig) {
      next.rateLimitKey = undefined;
      next.etaMs = 0;
      return true; // No rate limit configured for this key
    }

    const bucket = this.getRateLimitBucket(rateLimitConfig.key, rateLimitConfig.limit);
    if (bucket.tokens < 1) {
      next.rateLimitKey = rateLimitConfig.key;
      next.etaMs = this.computeEtaMs(bucket, rateLimitConfig.limit, rateLimitConfig.key, next);
      this.scheduleRefill(rateLimitConfig.limit); // Ensure we retry as soon as tokens are replenished
      return false;
    }

    bucket.tokens -= 1; // Consume a token for this dispatch
    next.rateLimitKey = rateLimitConfig.key;
    next.etaMs = 0;
    return true;
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
      return bucket;
    }

    const elapsedMs = Math.max(0, now - bucket.lastRefill);
    if (elapsedMs > 0 && bucket.tokens < bucket.capacity) {
      const refilled = elapsedMs * bucket.refillPerMs; // Refill based on elapsed time
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refilled); // Cap at bucket capacity
      bucket.lastRefill = now; // Mark refill time for the next calculation
    }

    return bucket;
  }

  private computeEtaMs(
    bucket: RateLimitBucket,
    limit: NormalizedRateLimit,
    key: string,
    current: QueuedRequest,
  ): number {
    const missingTokens = Math.max(0, 1 - bucket.tokens);
    const waitForToken =
      missingTokens > 0 && limit.refillPerMs > 0 ? Math.ceil(missingTokens / limit.refillPerMs) : 0;
    const queuedAhead = this.countQueuedAheadWithKey(key, current);
    const extraForQueue =
      queuedAhead > 0 && limit.refillPerMs > 0 ? Math.ceil(queuedAhead / limit.refillPerMs) : 0;
    return waitForToken + extraForQueue;
  }

  private countQueuedAheadWithKey(key: string, current: QueuedRequest): number {
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
    return count;
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

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    const provider = metadata?.provider ?? "default-provider";
    const model = metadata?.model ?? "default-model";
    return `${provider}::${model}`;
  }

  private scheduleRefill(limit: NormalizedRateLimit): void {
    if (this.refillTimeout) {
      return;
    }

    const delayMs = Math.max(1, Math.ceil(1 / limit.refillPerMs)); // Wait long enough for at least one token
    this.refillTimeout = setTimeout(() => {
      this.refillTimeout = undefined; // Allow future refills to be scheduled
      this.scheduleDrain(); // Try draining again now that tokens should exist
    }, delayMs);
  }

  private async runRequest<TResponse>(item: QueuedRequest<TResponse>): Promise<void> {
    const attempt = item.attempt ?? 1;
    try {
      const result = await item.request.execute(); // Execute the user's operation
      item.resolve(result); // Deliver successful result back to the waiting caller
    } catch (error) {
      const retryPlan = this.buildRetryPlan(error, attempt);
      if (retryPlan) {
        this.scheduleRetry(item, attempt + 1, retryPlan.delayMs, retryPlan.reason);
      } else {
        item.reject(error); // Surface failures to the caller
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1); // Ensure counter never underflows
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
      });
      this.scheduleDrain();
    }, delayMs);
  }
}

let singletonController: TrafficController | undefined;

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
