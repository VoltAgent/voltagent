import type { Logger } from "@voltagent/internal";
import { randomUUID } from "../utils/id";

type Scheduler = (callback: () => void) => void;
type BivariantHandler<TArgs extends unknown[]> = {
  bivarianceHack(...args: TArgs): void;
}["bivarianceHack"];

interface RateLimitBucket {
  tokens: number;
  capacity: number;
  refillPerMs: number;
  lastRefill: number;
}

export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

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
  id: string;
  type: TrafficRequestType;
  request: TrafficRequest<TResponse>;
  resolve: BivariantHandler<[TResponse | PromiseLike<TResponse>]>;
  reject: BivariantHandler<[reason?: unknown]>;
}

export interface TrafficControllerOptions {
  logger?: Logger;
  maxConcurrent?: number;
  rateLimit?: RateLimitOptions;
}

// Centralized traffic controller responsible for scheduling LLM calls.
// Provides a FIFO queue with a non-blocking scheduler and entrypoints
// for text and stream traffic.
export class TrafficController {
  private readonly scheduler: Scheduler;
  private readonly maxConcurrent: number;
  private readonly rateLimit?: { capacity: number; refillPerMs: number };
  private readonly rateLimitBuckets = new Map<string, RateLimitBucket>();
  private logger?: Logger;
  private queue: QueuedRequest[] = [];
  private activeCount = 0;
  private drainScheduled = false;
  private refillTimeout?: ReturnType<typeof setTimeout>;

  constructor(options: TrafficControllerOptions = {}) {
    this.logger = options.logger; // Allow caller to plug in their logger for observability
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY; // Concurrency guard; defaults to no cap for now
    this.scheduler = this.createScheduler(); // Select scheduler once so the rest of the code can stay simple
    if (
      options.rateLimit &&
      options.rateLimit.capacity > 0 &&
      options.rateLimit.refillPerSecond > 0
    ) {
      this.rateLimit = {
        capacity: options.rateLimit.capacity,
        refillPerMs: options.rateLimit.refillPerSecond / 1000, // Convert to ms once so the math later stays simple
      };
    }
  }

  setLogger(logger?: Logger): void {
    this.logger = logger; // Update logger when the singleton is reused across agents
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
        id: randomUUID(),
        type,
        request,
        resolve,
        reject,
      });

      // Emit trace-friendly breadcrumb for observability
      this.logger?.debug?.("[TrafficController] enqueued", {
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

      this.logger?.debug?.("[TrafficController] dispatch", {
        type: next.type,
        queueSize: this.queue.length,
        active: this.activeCount,
        metadata: next.request.metadata,
      });

      void this.runRequest(next); // Fire off processing without blocking the loop
    }
  }

  private canProcess(next: QueuedRequest): boolean {
    if (this.activeCount >= this.maxConcurrent) {
      return false;
    }

    if (!this.rateLimit) {
      return true; // No rate limit configured
    }

    // Token bucket guard: only proceed when a token is available
    const bucket = this.getRateLimitBucket(next.request.metadata);
    if (bucket.tokens < 1) {
      this.scheduleRefill(); // Ensure we retry as soon as tokens are replenished
      return false;
    }

    bucket.tokens -= 1; // Consume a token for this dispatch
    return true;
  }

  private getRateLimitBucket(metadata?: TrafficRequestMetadata): RateLimitBucket {
    const rateLimit = this.rateLimit;
    if (!rateLimit) {
      throw new Error("Rate limit bucket requested without rate limit configuration");
    }

    const key = this.buildRateLimitKey(metadata); // Group by provider+model so they share limits
    const now = Date.now(); // Snapshot time once to avoid drift within this method
    let bucket = this.rateLimitBuckets.get(key); // Reuse the bucket if it already exists

    if (!bucket) {
      // First request for this key: create a fresh bucket at full capacity
      bucket = {
        tokens: rateLimit.capacity,
        capacity: rateLimit.capacity,
        refillPerMs: rateLimit.refillPerMs,
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

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    const provider = metadata?.provider ?? "default-provider";
    const model = metadata?.model ?? "default-model";
    return `${provider}::${model}`;
  }

  private scheduleRefill(): void {
    if (this.refillTimeout || !this.rateLimit) {
      return;
    }

    const delayMs = Math.max(1, Math.ceil(1 / this.rateLimit.refillPerMs)); // Wait long enough for at least one token
    this.refillTimeout = setTimeout(() => {
      this.refillTimeout = undefined; // Allow future refills to be scheduled
      this.scheduleDrain(); // Try draining again now that tokens should exist
    }, delayMs);
  }

  private async runRequest<TResponse>(item: QueuedRequest<TResponse>): Promise<void> {
    try {
      const result = await item.request.execute(); // Execute the user's operation
      item.resolve(result); // Deliver successful result back to the waiting caller
    } catch (error) {
      item.reject(error); // Surface failures to the caller
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1); // Ensure counter never underflows
      this.scheduleDrain(); // Immediately try to pull the next request
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var ___voltagent_traffic_controller: TrafficController | undefined;
}

/**
 * Retrieve the shared traffic controller instance.
 */
export function getTrafficController(options?: TrafficControllerOptions): TrafficController {
  if (!globalThis.___voltagent_traffic_controller) {
    // Create a singleton controller so all agents share the same queue/scheduling behavior
    globalThis.___voltagent_traffic_controller = new TrafficController(options);
  } else if (options?.logger) {
    // Update logger when caller provides a new one, keeping the singleton instance alive
    globalThis.___voltagent_traffic_controller.setLogger(options.logger);
  }

  return globalThis.___voltagent_traffic_controller;
}
