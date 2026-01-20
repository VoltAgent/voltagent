import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";
import { randomUUID } from "../utils/id";
import { TrafficAdaptiveLimiter } from "./traffic-adaptive-limiter";
import { TrafficCircuitBreaker } from "./traffic-circuit-breaker";
import { TrafficConcurrencyLimiter } from "./traffic-concurrency-limiter";
import type { DispatchDecision, QueuedRequest, Scheduler } from "./traffic-controller-internal";
import {
  CircuitBreakerOpenError,
  QueueWaitTimeoutError,
  RateLimitedUpstreamError,
  normalizeRateLimitError,
} from "./traffic-errors";
import {
  OpenAIWindowRateLimitStrategy,
  type RateLimitUpdateResult,
  TokenBucketRateLimitStrategy,
  TrafficRateLimiter,
} from "./traffic-rate-limiter";
import { buildRetryPlanWithPolicy } from "./traffic-retry";
import { TimeoutPriorityQueue } from "./traffic-timeout-queue";
import type {
  AdaptiveLimiterConfig,
  FallbackChainEntry,
  FallbackPolicy,
  FallbackPolicyConfig,
  FallbackPolicyMode,
  FallbackTarget,
  PriorityBurstLimits,
  PriorityWeights,
  ProviderModelConcurrencyLimit,
  RateLimitConfig,
  RateLimitKey,
  RateLimitStrategyConfig,
  RateLimitStrategyKind,
  RetryPlan,
  RetryPolicyConfig,
  TenantConcurrencyLimit,
  TenantUsage,
  TrafficControllerOptions,
  TrafficPriority,
  TrafficRequest,
  TrafficRequestMetadata,
  TrafficRequestType,
  TrafficResponseMetadata,
} from "./traffic-types";
import { TrafficUsageTracker } from "./traffic-usage-tracker";

/* ============================================================
 * Traffic Controller
 * ============================================================
 */

export type {
  AdaptiveLimiterConfig,
  FallbackChainEntry,
  FallbackPolicy,
  FallbackPolicyConfig,
  FallbackPolicyMode,
  FallbackTarget,
  PriorityBurstLimits,
  PriorityWeights,
  ProviderModelConcurrencyLimit,
  RateLimitConfig,
  RateLimitKey,
  RateLimitStrategyConfig,
  RateLimitStrategyKind,
  TenantConcurrencyLimit,
  TenantUsage,
  TrafficControllerOptions,
  TrafficPriority,
  TrafficRequest,
  TrafficRequestMetadata,
  TrafficResponseMetadata,
  TrafficRequestType,
};

export { CircuitBreakerOpenError };
export { QueueWaitTimeoutError };
export { RateLimitedUpstreamError };

type TenantQueueState = {
  order: string[];
  index: number;
  queues: Map<string, QueuedRequest[]>;
};

type RateLimitSnapshot = {
  limit?: number;
  remaining?: number;
  resetAt?: number;
  nextAllowedAt?: number;
  retryAfterMs?: number;
};

const DEFAULT_PRIORITY_WEIGHTS: Record<TrafficPriority, number> = {
  P0: 5,
  P1: 3,
  P2: 2,
};

export class TrafficController {
  /* ---------- Core ---------- */

  private readonly scheduler: Scheduler;
  private readonly maxConcurrent: number;
  private readonly rateLimitKeyBuilder: (metadata?: TrafficRequestMetadata) => string;
  private readonly retryPolicy?: RetryPolicyConfig;
  private readonly logger: Logger;
  private readonly trafficLogger: Logger;
  private readonly controllerLogger: Logger;

  private readonly timeoutQueue = new TimeoutPriorityQueue<QueuedRequest>();
  private timeoutVersionCounter = 0;
  private readonly concurrencyLimiter: TrafficConcurrencyLimiter;

  private readonly queues: Record<TrafficPriority, TenantQueueState> = {
    P0: { order: [], index: 0, queues: new Map() },
    P1: { order: [], index: 0, queues: new Map() },
    P2: { order: [], index: 0, queues: new Map() },
  };
  private readonly priorityOrder: TrafficPriority[] = ["P0", "P1", "P2"];
  private readonly priorityWeights: Record<TrafficPriority, number>;
  private readonly priorityCredits: Record<TrafficPriority, number>;

  private activeCount = 0;
  private drainScheduled = false;
  private readonly inFlightStreams = new Map<string, QueuedRequest>();

  /* ---------- Rate limits ---------- */
  private readonly rateLimiter: TrafficRateLimiter;

  /* ---------- Circuit breakers ---------- */
  private readonly circuitBreaker: TrafficCircuitBreaker;

  /* ---------- Usage ---------- */
  private readonly usageTracker = new TrafficUsageTracker();

  /* ---------- Traffic metadata ---------- */
  private readonly rateLimitSnapshots = new Map<string, RateLimitSnapshot>();

  /* ---------- Adaptive limiter ---------- */
  private readonly adaptiveLimiter: TrafficAdaptiveLimiter;

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY;
    this.scheduler = this.createScheduler();
    this.rateLimitKeyBuilder = options.rateLimitKeyBuilder ?? buildRateLimitKeyFromMetadata;
    this.retryPolicy = options.retryPolicy;
    const priorityOverrides = options.priorityWeights ?? options.priorityBurstLimits;
    const priorityWeights = {
      ...DEFAULT_PRIORITY_WEIGHTS,
      ...(priorityOverrides ?? {}),
    };
    this.priorityWeights = {
      P0: Math.max(0, Math.floor(priorityWeights.P0)),
      P1: Math.max(0, Math.floor(priorityWeights.P1)),
      P2: Math.max(0, Math.floor(priorityWeights.P2)),
    };
    this.priorityCredits = { ...this.priorityWeights };
    this.adaptiveLimiter = new TrafficAdaptiveLimiter({
      adaptiveLimiter: options.adaptiveLimiter,
      buildRateLimitKey: (metadata) => this.buildRateLimitKey(metadata),
    });
    this.logger = new LoggerProxy({ component: "traffic-controller" }, options.logger);
    this.trafficLogger = this.logger.child({ subsystem: "traffic" });
    this.controllerLogger = this.trafficLogger.child({ module: "controller" });
    const rateLimits = options.rateLimits;
    const rateLimitStrategy = options.rateLimitStrategy;
    this.rateLimiter = new TrafficRateLimiter(() => this.scheduleDrain(), {
      rateLimits,
      strategyFactory: (key) => {
        const strategyKind = this.resolveRateLimitStrategy(key, rateLimitStrategy);
        if (strategyKind === "window") {
          return new OpenAIWindowRateLimitStrategy(key, rateLimits?.[key]);
        }
        return new TokenBucketRateLimitStrategy(key, rateLimits?.[key]);
      },
    });
    this.circuitBreaker = new TrafficCircuitBreaker({
      fallbackChains: options.fallbackChains,
      fallbackPolicy: options.fallbackPolicy,
      buildRateLimitKey: (metadata) => this.buildRateLimitKey(metadata),
    });
    this.concurrencyLimiter = new TrafficConcurrencyLimiter({
      buildProviderModelKey: (metadata) => buildProviderModelKeyFromMetadata(metadata),
      maxConcurrentPerProviderModel: options.maxConcurrentPerProviderModel,
      maxConcurrentPerTenant: options.maxConcurrentPerTenant,
    });

    this.controllerLogger.debug("Initialized TrafficController", {
      maxConcurrent: this.maxConcurrent,
      hasFallbackChains: !!options.fallbackChains,
      hasFallbackPolicy: options.fallbackPolicy !== undefined,
      hasProviderModelConcurrency: options.maxConcurrentPerProviderModel !== undefined,
      hasTenantConcurrency: options.maxConcurrentPerTenant !== undefined,
      hasConfigRateLimits: options.rateLimits !== undefined,
      hasStrategyOverrides: options.rateLimitStrategy !== undefined,
      hasRetryPolicy: options.retryPolicy !== undefined,
      hasPriorityBurstLimits: options.priorityBurstLimits !== undefined,
      hasPriorityWeights: options.priorityWeights !== undefined,
      hasAdaptiveLimiter: options.adaptiveLimiter !== undefined,
    });
  }

  /* ============================================================
   * Public API
   * ============================================================
   */

  handleText<TResponse>(request: TrafficRequest<TResponse>): Promise<TResponse> {
    this.controllerLogger.trace("handleText called", {
      tenantId: request.tenantId,
      provider: request.metadata?.provider,
      model: request.metadata?.model,
      priority: request.metadata?.priority,
    });
    return this.enqueue("text", request);
  }

  handleStream<TResponse>(request: TrafficRequest<TResponse>): Promise<TResponse> {
    this.controllerLogger.trace("handleStream called", {
      tenantId: request.tenantId,
      provider: request.metadata?.provider,
      model: request.metadata?.model,
      priority: request.metadata?.priority,
    });
    return this.enqueue("stream", request);
  }

  reportStreamSuccess(metadata?: TrafficRequestMetadata): void {
    this.controllerLogger.debug("Stream reported success", {
      provider: metadata?.provider,
      model: metadata?.model,
      tenantId: metadata?.tenantId,
      priority: metadata?.priority,
    });
    this.circuitBreaker.recordSuccess(metadata, this.trafficLogger);
    const rateLimitKey = this.buildRateLimitKey(metadata);
    this.adaptiveLimiter.recordSuccess({
      metadata,
      tenantId: metadata?.tenantId ?? "default",
      rateLimitKey,
    });
    this.releaseStreamSlot(metadata, "success");
  }

  reportStreamFailure(metadata: TrafficRequestMetadata | undefined, error: unknown): void {
    const rateLimitKey = this.buildRateLimitKey(metadata);
    const normalizedRateLimitError = normalizeRateLimitError({
      error,
      metadata,
      tenantId: metadata?.tenantId,
      key: rateLimitKey,
      logger: this.trafficLogger,
    });
    const errorForHandling = normalizedRateLimitError ?? error;

    this.controllerLogger.warn("Stream reported failure", {
      provider: metadata?.provider,
      model: metadata?.model,
      tenantId: metadata?.tenantId,
      priority: metadata?.priority,
      errorName: (error as { name?: unknown } | null)?.name,
      errorMessage: (error as { message?: unknown } | null)?.message,
      status: (error as { status?: unknown } | null)?.status,
      statusCode: (error as { statusCode?: unknown } | null)?.statusCode,
    });
    this.circuitBreaker.recordFailure(metadata, errorForHandling, this.trafficLogger);
    if (errorForHandling instanceof RateLimitedUpstreamError) {
      this.adaptiveLimiter.recordRateLimitHit({
        metadata,
        tenantId: metadata?.tenantId ?? "default",
        rateLimitKey,
        retryAfterMs: errorForHandling.retryAfterMs,
        logger: this.trafficLogger,
      });
    }
    const traffic = this.buildTrafficResponseMetadataFromMetadata(
      metadata,
      rateLimitKey,
      Date.now(),
      errorForHandling,
    );
    this.attachTrafficMetadata(errorForHandling, traffic);
    if (errorForHandling !== error) {
      this.attachTrafficMetadata(error, traffic);
    }
    this.releaseStreamSlot(metadata, "failure");
  }

  updateRateLimitFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
  ): RateLimitUpdateResult | undefined {
    const key = this.buildRateLimitKey(metadata);
    this.controllerLogger.debug("updateRateLimitFromHeaders called", {
      rateLimitKey: key,
      provider: metadata?.provider,
      model: metadata?.model,
    });

    const update = this.rateLimiter.updateFromHeaders(metadata, headers, key, this.trafficLogger);
    if (!update) {
      this.controllerLogger.debug("updateRateLimitFromHeaders skipped (no headers applied)", {
        rateLimitKey: key,
      });
      return undefined;
    }

    this.controllerLogger.debug("Rate limit headers applied", {
      rateLimitKey: update.key,
      limit: update.state.limit,
      remaining: update.state.remaining,
      reserved: update.state.slotReservedForStream,
      resetAt: update.state.resetAt,
      nextAllowedAt: update.state.nextAllowedAt,
      resetRequestsMs: update.headerSnapshot.resetRequestsMs,
      // resetTokensMs: update.headerSnapshot.resetTokensMs,
    });

    this.rateLimitSnapshots.set(update.key, {
      limit: update.state.limit,
      remaining: update.state.remaining,
      resetAt: update.state.resetAt,
      nextAllowedAt: update.state.nextAllowedAt,
      retryAfterMs: update.headerSnapshot.retryAfterMs,
    });

    return update;
  }

  getTenantUsage(tenantId: string): TenantUsage | undefined {
    this.controllerLogger.trace("getTenantUsage called", { tenantId });
    return this.usageTracker.getTenantUsage(tenantId);
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
      const normalizedRequest = this.ensureStreamRequestId(type, request);
      const priority = this.resolvePriority(normalizedRequest.metadata);
      const tenantId = this.resolveTenantId(normalizedRequest);
      this.controllerLogger.debug("Enqueue request", {
        type,
        tenantId,
        priority,
        provider: normalizedRequest.metadata?.provider,
        model: normalizedRequest.metadata?.model,
      });
      this.enqueueItem({
        type,
        request: normalizedRequest,
        resolve,
        reject,
        attempt: 1,
        priority,
        tenantId,
        enqueuedAt: Date.now(),
        estimatedTokens: normalizedRequest.estimatedTokens,
        extractUsage: normalizedRequest.extractUsage,
      });
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.drainScheduled) return;
    this.drainScheduled = true;

    this.controllerLogger.trace("Drain scheduled");
    this.scheduler(() => {
      this.drainScheduled = false;
      this.controllerLogger.trace("Drain tick");
      this.drainQueue();
    });
  }

  private drainQueue(): void {
    // Entry point for draining the dispatch queue.
    // This is called whenever we want to make forward progress
    // (new request enqueued, request completed, wakeup fired, etc.)
    this.controllerLogger.trace("Drain start", {
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      queuedP0: this.getQueuedCount("P0"),
      queuedP1: this.getQueuedCount("P1"),
      queuedP2: this.getQueuedCount("P2"),
    });

    // Keep attempting dispatch decisions until we are forced to stop.
    // This loop only exits when we must wait for a timer or an external signal.

    while (true) {
      // Ask the dispatcher what to do next:
      // - dispatch a request
      // - skip a request
      // - wait (until a specific time)
      // - blocked (await external signal)
      // - idle (no work)
      const decision = this.tryDispatchNext();

      this.controllerLogger.trace("Dispatch decision", decision);

      // If a request was dispatched:
      // - activeCount increased
      // - queue state changed
      // We immediately loop again to see if more progress is possible.
      if (decision.kind === "dispatch") {
        continue;
      }

      // If a request was skipped:
      // - something was evicted, rejected, or cleaned up
      // - queue state changed
      // We immediately loop again to re-evaluate the queue.
      if (decision.kind === "skip") {
        continue;
      }

      // If we are told to wait:
      // - no dispatch is possible right now
      // - we must pause draining until a future signal
      if (decision.kind === "wait") {
        // If a concrete wake-up time is provided,
        // schedule a timer so we retry draining at that time.
        this.controllerLogger.debug("Rate limit wait; scheduling wakeup", {
          wakeUpAt: decision.wakeUpAt,
          inMs: Math.max(0, decision.wakeUpAt - Date.now()),
        });

        this.scheduleRateLimitWakeUpAt(decision.wakeUpAt);

        // Exit the drain loop.
        // Control will resume later via:
        // - wake-up timer
        // - request completion
        // - new enqueue
        return;
      }

      if (decision.kind === "blocked" || decision.kind === "idle") {
        return;
      }

      // Defensive exit.
      // In practice, this should not be reached,
      // but it guarantees the loop cannot spin forever.
      return;
    }
  }

  /* ============================================================
   * Dispatch
   * ============================================================
   */

  private tryDispatchNext(): DispatchDecision {
    /**
     * Decide what the next dispatch action should be.
     *
     * This method returns a single decision:
     * - dispatch: we started a request (and should drain again immediately)
     * - skip: we made progress by cleaning up (and should drain again immediately)
     * - wait: no progress is possible right now (until a wake-up time)
     * - blocked: work exists but needs an external signal to continue
     * - idle: no work exists
     */
    if (this.activeCount >= this.maxConcurrent) {
      /**
       * Concurrency is saturated.
       *
       * We cannot dispatch anything right now, but we can still evict timed-out items
       * and compute the earliest time we should wake up to retry.
       */
      // TODO - eviction happens only for the head elememts why?
      const timeoutCheck = this.evictTimedOutQueuedRequests(Date.now());

      if (timeoutCheck.evicted) {
        /** Queue state changed (we evicted/rejected items), so we should re-evaluate. */
        return { kind: "skip" };
      }

      /**
       * No eviction occurred; we must wait for either:
       * - an in-flight request to complete (which triggers a drain), or
       * - the next timeout deadline (if any).
       */
      if (timeoutCheck.wakeUpAt !== undefined) {
        return { kind: "wait", wakeUpAt: timeoutCheck.wakeUpAt };
      }

      // No eviction but we hit the max concurrency limit
      //So block this
      const hasQueued =
        this.getQueuedCount("P0") + this.getQueuedCount("P1") + this.getQueuedCount("P2") > 0;
      return hasQueued ? { kind: "blocked" } : { kind: "idle" };
    }

    /**
     * Track the earliest future time at which any candidate would become dispatchable
     * (e.g. rate limit reset); if nothing can dispatch now, we will return a wait decision.
     */
    let earliestWakeUpAt: number | undefined;

    const updateWakeUpAt = (candidate?: number): void => {
      if (candidate === undefined) return;

      earliestWakeUpAt =
        earliestWakeUpAt === undefined ? candidate : Math.min(earliestWakeUpAt, candidate);
    };

    /**
     * Iterate priorities in weighted order, then per-tenant round-robin within a priority.
     * We stop at the first actionable decision (dispatch/skip) to keep drain loops tight.
     */
    // TODO : How is priority assinged?
    // TODO : How is tenant id stored?
    const priorities = this.getPriorityDispatchOrder();

    let sawCandidate = false;

    for (const priority of priorities) {
      const state = this.queues[priority];

      if (state.order.length === 0) {
        continue;
      }

      /**
       * Within a priority, bound the scan to the number of tenants currently present.
       * This prevents infinite loops when candidates are repeatedly non-dispatchable.
       */
      let attempts = 0;
      const maxAttempts = state.order.length;

      while (attempts < maxAttempts) {
        const candidate = this.getNextTenantCandidate(priority);
        if (!candidate) break;

        attempts += 1;
        sawCandidate = true;

        const now = Date.now();
        const result = this.processQueuedCandidate(priority, candidate, now);

        /** Record the earliest "try again at" time surfaced by any candidate. */
        updateWakeUpAt(result.wakeUpAt);

        if (result.action === "dispatch") {
          /** We successfully started a request; draining should continue immediately. */
          return { kind: "dispatch" };
        }

        if (result.action === "skip") {
          /** We changed queue state (eviction/rejection/etc.); re-evaluate immediately. */
          return { kind: "skip" };
        }
      }
    }

    /**
     * No dispatch or skip was possible.
     *
     * If we observed a wake-up time (e.g. rate limit), return it so the drain loop can
     * schedule a timer; otherwise report blocked/idle and await external signals.
     */
    return earliestWakeUpAt !== undefined
      ? { kind: "wait", wakeUpAt: earliestWakeUpAt }
      : sawCandidate
        ? { kind: "blocked" }
        : { kind: "idle" };
  }

  private startRequest(item: QueuedRequest, queue: QueuedRequest[], tenantId: string): void {
    this.controllerLogger.debug("Start request", {
      priority: item.priority,
      type: item.type,
      tenantId: item.tenantId,
      attempt: item.attempt,
      provider: item.request.metadata?.provider,
      model: item.request.metadata?.model,
    });
    item.dispatchedAt = Date.now();
    queue.shift();
    this.cleanupTenantQueue(item.priority, tenantId, queue);
    this.recordPriorityDispatch(item.priority);
    this.activeCount++;
    this.concurrencyLimiter.acquire(item, this.trafficLogger);
    this.rateLimiter.notifyDispatch(item.rateLimitKey, this.trafficLogger);
    this.circuitBreaker.markTrial(item, this.trafficLogger);
    void this.executeRequest(item);
  }

  /* ============================================================
   * Execution
   * ============================================================
   */

  private async executeRequest<TResponse>(item: QueuedRequest<TResponse>): Promise<void> {
    const startedAt = Date.now();
    let streamHeld = false;
    try {
      this.controllerLogger.debug("Execute request", {
        priority: item.priority,
        type: item.type,
        tenantId: item.tenantId,
        attempt: item.attempt,
        provider: item.request.metadata?.provider,
        model: item.request.metadata?.model,
        rateLimitKey: item.rateLimitKey,
        circuitKey: item.circuitKey,
        circuitStatus: item.circuitStatus,
        activeCount: this.activeCount,
      });
      const result = await item.request.execute();
      const rateLimitKey = item.rateLimitKey ?? this.buildRateLimitKey(item.request.metadata);
      this.controllerLogger.debug("Request succeeded", {
        tenantId: item.tenantId,
        attempt: item.attempt,
        provider: item.request.metadata?.provider,
        model: item.request.metadata?.model,
        elapsedMs: Date.now() - startedAt,
      });
      if (item.type === "stream") {
        this.controllerLogger.trace("Stream started successfully", {
          tenantId: item.tenantId,
          provider: item.request.metadata?.provider,
          model: item.request.metadata?.model,
        });
      } else {
        this.circuitBreaker.recordSuccess(item.request.metadata, this.trafficLogger);
      }
      const usage = this.usageTracker.recordUsage(item, result, this.trafficLogger);
      this.rateLimiter.recordUsage(rateLimitKey, usage, this.trafficLogger, item.reservedTokens);
      this.adaptiveLimiter.recordSuccess({
        metadata: item.request.metadata,
        tenantId: item.tenantId,
        rateLimitKey,
      });
      this.attachTrafficMetadata(
        result,
        this.buildTrafficResponseMetadata(item, rateLimitKey, Date.now()),
      );
      if (item.type === "stream") {
        const requestId = item.request.metadata?.requestId;
        if (!requestId) {
          this.controllerLogger.warn("Stream missing requestId; releasing slot immediately", {
            tenantId: item.tenantId,
            provider: item.request.metadata?.provider,
            model: item.request.metadata?.model,
          });
        } else {
          this.inFlightStreams.set(requestId, item);
          streamHeld = true;
          this.controllerLogger.debug("Stream registered; holding slot", {
            requestId,
            tenantId: item.tenantId,
            provider: item.request.metadata?.provider,
            model: item.request.metadata?.model,
          });
        }
      }
      item.resolve(result);
    } catch (error) {
      const rateLimitKey = item.rateLimitKey ?? this.buildRateLimitKey(item.request.metadata);
      const normalizedRateLimitError = normalizeRateLimitError({
        error,
        metadata: item.request.metadata,
        tenantId: item.tenantId,
        key: rateLimitKey,
        logger: this.trafficLogger,
      });
      const errorForHandling = normalizedRateLimitError ?? error;
      if (typeof item.reservedTokens === "number" && item.reservedTokens > 0) {
        this.rateLimiter.recordUsage(
          rateLimitKey,
          { totalTokens: 0 },
          this.trafficLogger,
          item.reservedTokens,
        );
      }
      if (errorForHandling instanceof RateLimitedUpstreamError) {
        this.adaptiveLimiter.recordRateLimitHit({
          metadata: item.request.metadata,
          tenantId: item.tenantId,
          rateLimitKey,
          retryAfterMs: errorForHandling.retryAfterMs,
          logger: this.trafficLogger,
        });
      }

      this.controllerLogger.warn("Request failed", {
        tenantId: item.tenantId,
        attempt: item.attempt,
        provider: item.request.metadata?.provider,
        model: item.request.metadata?.model,
        elapsedMs: Date.now() - startedAt,
        errorName: (error as { name?: unknown } | null)?.name,
        errorMessage: (error as { message?: unknown } | null)?.message,
        status: (error as { status?: unknown } | null)?.status,
        statusCode: (error as { statusCode?: unknown } | null)?.statusCode,
      });
      this.circuitBreaker.recordFailure(
        item.request.metadata,
        errorForHandling,
        this.trafficLogger,
      );
      this.attachTrafficMetadata(
        errorForHandling,
        this.buildTrafficResponseMetadata(item, rateLimitKey, Date.now(), errorForHandling),
      );

      const retry = buildRetryPlanWithPolicy(
        {
          error: errorForHandling,
          attempt: item.attempt,
          metadata: item.request.metadata,
          key: rateLimitKey,
          logger: this.trafficLogger,
        },
        this.retryPolicy,
      );
      if (retry) {
        if (!this.canRetryWithinDeadline(item, retry.delayMs)) {
          this.controllerLogger.debug("Retry skipped; deadline exceeded", {
            tenantId: item.tenantId,
            attempt: item.attempt,
            provider: item.request.metadata?.provider,
            model: item.request.metadata?.model,
            deadlineAt: item.request.deadlineAt,
            delayMs: retry.delayMs,
          });
          item.reject(errorForHandling);
        } else {
          this.controllerLogger.debug("Retrying request", {
            tenantId: item.tenantId,
            attempt: item.attempt,
            nextAttempt: item.attempt + 1,
            reason: retry.reason,
            delayMs: retry.delayMs,
            provider: item.request.metadata?.provider,
            model: item.request.metadata?.model,
          });
          this.scheduleRetry(item, retry);
        }
      } else {
        this.controllerLogger.debug("No retry plan; rejecting request", {
          tenantId: item.tenantId,
          attempt: item.attempt,
          provider: item.request.metadata?.provider,
          model: item.request.metadata?.model,
        });
        item.reject(errorForHandling);
      }
    } finally {
      if (!(item.type === "stream" && streamHeld)) {
        this.releaseActiveSlot(item, "completed");
      }
    }
  }

  /* ============================================================
   * Retry logic
   * ============================================================
   */

  private scheduleRetry<TResponse>(item: QueuedRequest<TResponse>, plan: RetryPlan): void {
    this.controllerLogger.debug("Schedule retry", {
      tenantId: item.tenantId,
      priority: item.priority,
      currentAttempt: item.attempt,
      nextAttempt: item.attempt + 1,
      reason: plan.reason,
      delayMs: plan.delayMs,
    });
    setTimeout(() => {
      this.controllerLogger.debug("Retry timer fired", {
        tenantId: item.tenantId,
        priority: item.priority,
        nextAttempt: item.attempt + 1,
      });
      this.enqueueItem({
        ...item,
        attempt: item.attempt + 1,
        enqueuedAt: Date.now(),
        dispatchedAt: undefined,
        reservedTokens: undefined,
        tenantConcurrencyKey: undefined,
        providerModelConcurrencyKey: undefined,
        rateLimitKey: undefined,
        etaMs: undefined,
        circuitKey: undefined,
        circuitStatus: undefined,
      });
      this.scheduleDrain();
    }, plan.delayMs);
  }

  private canRetryWithinDeadline(item: QueuedRequest, delayMs: number): boolean {
    const deadlineAt = item.request.deadlineAt;
    if (!deadlineAt) return true;
    const nextAttemptAt = Date.now() + delayMs;
    return nextAttemptAt <= deadlineAt;
  }

  /* ============================================================
   * Rate limiting (verbatim logic)
   * ============================================================
   */

  private resolveRateLimit(next: QueuedRequest): DispatchDecision | null {
    const key = this.buildRateLimitKey(next.request.metadata);
    return this.rateLimiter.resolve(next, key, this.trafficLogger);
  }

  private scheduleRateLimitWakeUpAt(wakeUpAt: number): void {
    this.rateLimiter.scheduleWakeUpAt(wakeUpAt, this.trafficLogger);
  }

  /* ============================================================
   * Circuit breakers (verbatim logic, linearized)
   * ============================================================
   */

  private resolveCircuitBreakerGate(next: QueuedRequest): DispatchDecision | null {
    return this.circuitBreaker.resolve(next, this.trafficLogger);
  }

  /* ============================================================
   * Utilities
   * ============================================================
   */

  private resolveQueueTimeoutAt(next: QueuedRequest): number | undefined {
    if (next.queueTimeoutDisabled) return next.request.deadlineAt;

    const { maxQueueWaitMs, deadlineAt } = next.request;

    const queueTimeoutAt =
      typeof maxQueueWaitMs === "number" && Number.isFinite(maxQueueWaitMs)
        ? next.enqueuedAt + Math.max(0, maxQueueWaitMs)
        : undefined;

    if (queueTimeoutAt === undefined) return deadlineAt;
    if (deadlineAt === undefined) return queueTimeoutAt;

    return Math.min(queueTimeoutAt, deadlineAt);
  }

  private recordQueueTimeoutEntry(item: QueuedRequest, queueTimeoutAt?: number): void {
    const previous = item.queueTimeoutAt;
    item.queueTimeoutAt = queueTimeoutAt;
    if (queueTimeoutAt === previous) return;
    this.timeoutVersionCounter += 1;
    item.timeoutVersion = this.timeoutVersionCounter;
    if (queueTimeoutAt === undefined) return;
    this.timeoutQueue.push({
      at: queueTimeoutAt,
      version: this.timeoutVersionCounter,
      item,
    });
  }

  private handleQueueTimeout(
    next: QueuedRequest,
    now: number,
    queueTimeoutAt?: number,
  ): "none" | "expired" {
    if (queueTimeoutAt === undefined) return "none";
    if (now < queueTimeoutAt) return "none";

    const fallbackApplied = this.circuitBreaker.tryFallback(
      next,
      "queue-timeout",
      this.trafficLogger,
    );
    if (fallbackApplied) {
      return "none";
    }

    /**
     * The request has exceeded its queue-wait budget (maxQueueWaitMs/deadlineAt).
     * Rejection happens in processQueuedCandidate before any gate checks.
     */
    // TODO - even if the fallback failed and we have not crossed deadline - we show expired
    return "expired";
  }

  private rejectIfQueueTimedOut(
    queueTimeoutExpired: boolean,
    next: QueuedRequest,
    queue: QueuedRequest[],
    index: number,
    now: number,
    reason: string,
  ): boolean {
    if (!queueTimeoutExpired) return false;
    if (!this.removeQueuedItem(queue, next, index)) {
      return false;
    }
    this.cleanupTenantQueue(next.priority, next.tenantId, queue);
    const timeoutError = this.createQueueTimeoutError(next, now);
    this.attachTrafficMetadata(
      timeoutError,
      this.buildTrafficResponseMetadata(
        next,
        timeoutError.rateLimitKey ?? this.buildRateLimitKey(next.request.metadata),
        now,
        timeoutError,
      ),
    );
    this.controllerLogger.warn("Queue wait timed out during gate wait", {
      tenantId: next.tenantId,
      waitedMs: timeoutError.waitedMs,
      maxQueueWaitMs: timeoutError.maxQueueWaitMs,
      deadlineAt: timeoutError.deadlineAt,
      provider: next.request.metadata?.provider,
      model: next.request.metadata?.model,
      rateLimitKey: timeoutError.rateLimitKey,
      reason,
    });
    next.reject(timeoutError);
    return true;
  }

  private createQueueTimeoutError(next: QueuedRequest, now: number): QueueWaitTimeoutError {
    const waitedMs = Math.max(0, now - next.enqueuedAt);
    return new QueueWaitTimeoutError({
      waitedMs,
      maxQueueWaitMs: next.request.maxQueueWaitMs,
      deadlineAt: next.request.deadlineAt,
      metadata: next.request.metadata,
      rateLimitKey: next.rateLimitKey ?? this.buildRateLimitKey(next.request.metadata),
    });
  }

  private resolveTenantId(request: TrafficRequest<unknown>): string {
    return request.tenantId ?? request.metadata?.tenantId ?? "default";
  }

  private enqueueItem(item: QueuedRequest): void {
    const queueTimeoutAt = this.resolveQueueTimeoutAt(item);
    this.recordQueueTimeoutEntry(item, queueTimeoutAt);

    const state = this.queues[item.priority];
    const tenantId = item.tenantId;
    let queue = state.queues.get(tenantId);
    if (!queue) {
      queue = [];
      state.queues.set(tenantId, queue);
      state.order.push(tenantId);
    }
    queue.push(item);
  }

  private getQueuedCount(priority: TrafficPriority): number {
    const state = this.queues[priority];
    let total = 0;
    for (const queue of state.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  private refillPriorityCredits(): void {
    this.priorityCredits.P0 = this.priorityWeights.P0;
    this.priorityCredits.P1 = this.priorityWeights.P1;
    this.priorityCredits.P2 = this.priorityWeights.P2;
  }

  private recordPriorityDispatch(priority: TrafficPriority): void {
    if (this.priorityCredits[priority] > 0) {
      this.priorityCredits[priority] -= 1;
    }
  }

  private getPriorityDispatchOrder(): TrafficPriority[] {
    const prioritiesWithWork = this.priorityOrder.filter(
      (priority) => this.getQueuedCount(priority) > 0,
    );
    if (prioritiesWithWork.length === 0) return [];

    let available = prioritiesWithWork.filter((priority) => this.priorityCredits[priority] > 0);
    if (available.length === 0) {
      this.refillPriorityCredits();
      available = prioritiesWithWork.filter((priority) => this.priorityCredits[priority] > 0);
    }

    return available.length === 0 ? prioritiesWithWork : available;
  }

  private getNextTenantCandidate(
    priority: TrafficPriority,
  ): { item: QueuedRequest; queue: QueuedRequest[]; tenantId: string } | undefined {
    const state = this.queues[priority];
    if (state.order.length === 0) return undefined;
    const maxAttempts = state.order.length;
    let attempts = 0;

    while (attempts < maxAttempts && state.order.length > 0) {
      const index = state.index % state.order.length;
      const tenantId = state.order[index];
      const queue = state.queues.get(tenantId);
      attempts += 1;

      if (!queue || queue.length === 0) {
        this.removeTenantQueue(priority, tenantId);
        continue;
      }

      state.index = (index + 1) % state.order.length;
      return { item: queue[0], queue, tenantId };
    }

    return undefined;
  }

  private cleanupTenantQueue(
    priority: TrafficPriority,
    tenantId: string,
    queue: QueuedRequest[],
  ): void {
    if (queue.length > 0) return;
    this.removeTenantQueue(priority, tenantId);
  }

  private removeTenantQueue(priority: TrafficPriority, tenantId: string): void {
    const state = this.queues[priority];
    state.queues.delete(tenantId);
    const index = state.order.indexOf(tenantId);
    if (index === -1) return;
    state.order.splice(index, 1);
    if (state.order.length === 0) {
      state.index = 0;
      return;
    }
    if (state.index > index) {
      state.index -= 1;
    }
    if (state.index >= state.order.length) {
      state.index = 0;
    }
  }

  private removeQueuedItem(queue: QueuedRequest[], item: QueuedRequest, index?: number): boolean {
    const resolvedIndex =
      typeof index === "number" && index >= 0 && queue[index] === item
        ? index
        : queue.indexOf(item);
    if (resolvedIndex === -1) return false;
    queue.splice(resolvedIndex, 1);
    return true;
  }

  private resolvePriority(metadata?: TrafficRequestMetadata): TrafficPriority {
    return metadata?.priority ?? "P1";
  }

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    return this.rateLimitKeyBuilder(metadata);
  }

  private evictTimedOutQueuedRequests(now: number): { evicted: boolean; wakeUpAt?: number } {
    /**
     * Evict timed-out queued requests (no dispatch).
     *
     * This path is used when we cannot dispatch due to concurrency saturation.
     * We still want to:
     * - reject items whose queue-wait timeout has elapsed, and
     * - compute the earliest time we should wake up to sweep again.
     *
     * Returns:
     * - `evicted`: whether we rejected/removed any queued items (queue state changed)
     * - `wakeUpAt`: earliest future deadline worth scheduling a wake-up for
     */
    let evicted = false;
    let wakeUpAt: number | undefined;

    while (true) {
      const entry = this.timeoutQueue.peek();
      if (!entry || entry.at > now) break;
      const expired = this.timeoutQueue.pop();
      if (!expired || expired.version !== expired.item.timeoutVersion) continue;
      const state = this.queues[expired.item.priority];
      const queue = state.queues.get(expired.item.tenantId);
      if (!queue) continue;
      const index = queue.indexOf(expired.item);
      if (index === -1) continue;
      if (this.rejectIfQueueTimedOut(true, expired.item, queue, index, now, "timeout sweep")) {
        evicted = true;
        this.cleanupTenantQueue(expired.item.priority, expired.item.tenantId, queue);
      }
    }

    /** Walk all priorities and all tenants to perform timeout checks without dispatching. */
    for (const priority of this.priorityOrder) {
      const state = this.queues[priority];
      if (state.order.length === 0) continue;

      /**
       * Iterate over a snapshot of tenant IDs so removals during the sweep
       * do not affect the iteration.
       */
      for (const tenantId of [...state.order]) {
        const queue = state.queues.get(tenantId);
        if (!queue || queue.length === 0) {
          this.removeTenantQueue(priority, tenantId);
          continue;
        }

        /**
         * Only the head item can be eligible for timeout-based rejection at any moment,
         * since the queue is processed FIFO per tenant.
         */
        const next = queue[0];
        const queueTimeoutAtBefore = this.resolveQueueTimeoutAt(next);

        /** Determine whether the head item has exceeded its queue-wait budget (without rejecting yet). */
        const queueTimeoutTriggered = this.handleQueueTimeout(next, now, queueTimeoutAtBefore);

        /**
         * Re-resolve after timeout handling to keep queue-timeout tracking consistent.
         */
        const queueTimeoutAt = this.resolveQueueTimeoutAt(next);
        this.recordQueueTimeoutEntry(next, queueTimeoutAt);
        /**
         * We are at a wait boundary (global concurrency saturation). If the request is expired
         * reject it now to avoid waiting beyond the configured timeout.
         */
        if (
          queueTimeoutTriggered === "expired" &&
          this.rejectIfQueueTimedOut(true, next, queue, 0, now, "global concurrency wait")
        ) {
          evicted = true;
          this.cleanupTenantQueue(priority, tenantId, queue);
        }
      }
    }

    const nextTimeout = this.timeoutQueue.peek()?.at;
    if (nextTimeout !== undefined && now < nextTimeout) {
      wakeUpAt = nextTimeout;
    }

    return { evicted, wakeUpAt };
  }

  private processQueuedCandidate(
    priority: TrafficPriority,
    candidate: {
      item: QueuedRequest;
      queue: QueuedRequest[];
      tenantId: string;
    },
    now: number,
  ): { action: "dispatch" | "skip" | "continue"; wakeUpAt?: number } {
    const { item: next, queue, tenantId } = candidate;

    let wakeUpAt: number | undefined;

    //get the earliest timeout for the queues taking top items into account
    const queueTimeoutAtBefore = this.resolveQueueTimeoutAt(next);
    const queueTimeoutTriggered = this.handleQueueTimeout(next, now, queueTimeoutAtBefore);
    const queueTimeoutExpired = queueTimeoutTriggered === "expired";

    /**
     * Re-resolve after timeout handling to keep queue-timeout tracking consistent.
     */
    const queueTimeoutAt = this.resolveQueueTimeoutAt(next);
    this.recordQueueTimeoutEntry(next, queueTimeoutAt);

    if (queueTimeoutAt !== undefined && now < queueTimeoutAt) {
      wakeUpAt = queueTimeoutAt;
    }

    if (queueTimeoutExpired) {
      // Hard stop: reject immediately when the queue timeout is already expired.
      if (this.rejectIfQueueTimedOut(true, next, queue, 0, now, "queue timeout expired")) {
        return { action: "skip", wakeUpAt };
      }
    }

    // Only non-expired items reach gate checks below.
    this.controllerLogger.trace("Evaluate next queued request", {
      priority,
      tenantId: next.tenantId,
      type: next.type,
      attempt: next.attempt,
      provider: next.request.metadata?.provider,
      model: next.request.metadata?.model,
      queueLength: queue.length,
    });

    /* -------------------- Circuit breaker -------------------- */

    const circuitBreakerDecision = this.resolveCircuitBreakerGate(next);

    if (circuitBreakerDecision) {
      this.controllerLogger.trace("Circuit resolution returned decision", {
        priority,
        decision: circuitBreakerDecision,
        circuitKey: next.circuitKey,
        circuitStatus: next.circuitStatus,
      });

      if (circuitBreakerDecision.kind === "skip") {
        queue.shift();
        this.cleanupTenantQueue(priority, tenantId, queue);
        return { action: "skip", wakeUpAt };
      }

      if (circuitBreakerDecision.kind === "wait") {
        // Queue timeout is enforced before gates, so no timeout rejection here.
        const circuitWakeUpAt = Number.isFinite(circuitBreakerDecision.wakeUpAt)
          ? circuitBreakerDecision.wakeUpAt
          : undefined;
        next.etaMs = circuitWakeUpAt !== undefined ? Math.max(0, circuitWakeUpAt - now) : undefined;

        return {
          action: "continue",
          wakeUpAt: this.pickEarlierWakeUp(wakeUpAt, circuitWakeUpAt),
        };
      }
    }

    /* -------------------- Concurrency -------------------- */

    const concurrency = this.concurrencyLimiter.resolve(next, this.trafficLogger);

    if (concurrency.kind === "wait") {
      this.controllerLogger.trace("Concurrency gate blocked request", {
        priority,
        tenantId: next.tenantId,
        provider: next.request.metadata?.provider,
        model: next.request.metadata?.model,
        reasons: concurrency.reasons,
      });

      // Queue timeout is enforced before gates, so no timeout rejection here.
      next.etaMs = undefined;
      return { action: "continue", wakeUpAt };
    }

    /* -------------------- Adaptive limits -------------------- */

    const adaptive = this.adaptiveLimiter.resolve(next, now);

    if (adaptive?.kind === "wait") {
      // Queue timeout is enforced before gates, so no timeout rejection here.
      next.etaMs = Math.max(0, adaptive.wakeUpAt - now);

      return {
        action: "continue",
        wakeUpAt: this.pickEarlierWakeUp(wakeUpAt, adaptive.wakeUpAt),
      };
    }

    /* -------------------- Rate limits -------------------- */

    const rateLimitDecision = this.resolveRateLimit(next);

    if (rateLimitDecision) {
      this.controllerLogger.trace("Rate limit resolution returned decision", {
        priority,
        decision: rateLimitDecision,
        rateLimitKey: next.rateLimitKey ?? this.buildRateLimitKey(next.request.metadata),
      });

      if (rateLimitDecision.kind === "wait") {
        // Queue timeout is enforced before gates, so no timeout rejection here.
        next.etaMs = Math.max(0, rateLimitDecision.wakeUpAt - now);

        return {
          action: "continue",
          wakeUpAt: this.pickEarlierWakeUp(wakeUpAt, rateLimitDecision.wakeUpAt),
        };
      }
      if (rateLimitDecision.kind === "blocked") {
        // Queue timeout is enforced before gates, so no timeout rejection here.
        next.etaMs = undefined;
        return { action: "continue", wakeUpAt };
      }

      return { action: "continue", wakeUpAt };
    }

    /* -------------------- Dispatch -------------------- */

    this.startRequest(next, queue, tenantId);
    return { action: "dispatch", wakeUpAt };
  }

  private pickEarlierWakeUp(
    current: number | undefined,
    candidate: number | undefined,
  ): number | undefined {
    if (candidate === undefined) return current;
    if (current === undefined) return candidate;
    return Math.min(current, candidate);
  }

  private ensureStreamRequestId<TResponse>(
    type: TrafficRequestType,
    request: TrafficRequest<TResponse>,
  ): TrafficRequest<TResponse> {
    if (type !== "stream") return request;
    const metadata = request.metadata;
    if (metadata?.requestId) return request;

    const requestId = randomUUID();
    if (metadata && typeof metadata === "object") {
      (metadata as TrafficRequestMetadata).requestId = requestId;
      return request;
    }

    return {
      ...request,
      metadata: {
        ...(metadata ?? {}),
        requestId,
      },
    };
  }

  private releaseStreamSlot(
    metadata: TrafficRequestMetadata | undefined,
    outcome: "success" | "failure",
  ): void {
    const requestId = metadata?.requestId;
    if (!requestId) {
      this.controllerLogger.debug("Stream completion missing requestId; slot not released", {
        outcome,
      });
      return;
    }
    const item = this.inFlightStreams.get(requestId);
    if (!item) {
      this.controllerLogger.debug("Stream completion missing in-flight entry", {
        requestId,
        outcome,
      });
      return;
    }
    this.inFlightStreams.delete(requestId);
    this.controllerLogger.debug("Stream completed; releasing slot", {
      requestId,
      tenantId: item.tenantId,
      provider: item.request.metadata?.provider,
      model: item.request.metadata?.model,
      outcome,
    });
    this.releaseActiveSlot(item, `stream-${outcome}`);
  }

  private releaseActiveSlot(item: QueuedRequest, reason: string): void {
    this.rateLimiter.releaseReservation(item.rateLimitKey, this.trafficLogger);
    this.concurrencyLimiter.release(item, this.trafficLogger);
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.controllerLogger.trace("Request finished; slot released", {
      tenantId: item.tenantId,
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      reason,
    });
    this.scheduleDrain();
  }

  // Adaptive limiter extracted to `TrafficAdaptiveLimiter`.

  private buildTrafficResponseMetadata(
    item: QueuedRequest,
    rateLimitKey: string,
    now: number,
    error?: unknown,
  ): TrafficResponseMetadata {
    const snapshot = this.rateLimitSnapshots.get(rateLimitKey);
    const retryAfterMs = this.resolveRetryAfterMs(error, snapshot);
    const queuedForMs =
      item.dispatchedAt !== undefined ? item.dispatchedAt - item.enqueuedAt : now - item.enqueuedAt;
    const queueEtaMs = item.etaMs ?? Math.max(0, queuedForMs);

    return {
      rateLimitKey,
      retryAfterMs,
      rateLimitRemaining: snapshot?.remaining,
      rateLimitResetAt: snapshot?.resetAt,
      rateLimitResetInMs:
        snapshot?.resetAt !== undefined ? Math.max(0, snapshot.resetAt - now) : undefined,
      queueEtaMs,
      tenantId: item.tenantId,
      priority: item.request.metadata?.priority,
      taskType: item.request.metadata?.taskType,
    };
  }

  private buildTrafficResponseMetadataFromMetadata(
    metadata: TrafficRequestMetadata | undefined,
    rateLimitKey: string,
    now: number,
    error?: unknown,
  ): TrafficResponseMetadata {
    const snapshot = this.rateLimitSnapshots.get(rateLimitKey);
    const retryAfterMs = this.resolveRetryAfterMs(error, snapshot);

    return {
      rateLimitKey,
      retryAfterMs,
      rateLimitRemaining: snapshot?.remaining,
      rateLimitResetAt: snapshot?.resetAt,
      rateLimitResetInMs:
        snapshot?.resetAt !== undefined ? Math.max(0, snapshot.resetAt - now) : undefined,
      tenantId: metadata?.tenantId,
      priority: metadata?.priority,
      taskType: metadata?.taskType,
    };
  }

  private attachTrafficMetadata(target: unknown, info: TrafficResponseMetadata): void {
    if (!target || typeof target !== "object") return;
    (target as Record<string, unknown>).traffic = info;
  }

  private resolveRetryAfterMs(
    error: unknown | undefined,
    snapshot?: RateLimitSnapshot,
  ): number | undefined {
    if (error && typeof error === "object" && "retryAfterMs" in error) {
      const candidate = (error as { retryAfterMs?: unknown }).retryAfterMs;
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
      }
    }
    if (snapshot?.retryAfterMs !== undefined) {
      return snapshot.retryAfterMs;
    }
    return undefined;
  }

  private resolveRateLimitStrategy(
    key: string,
    config?: RateLimitStrategyConfig,
  ): RateLimitStrategyKind {
    const modelOverride = config?.models?.[key];
    if (modelOverride) return modelOverride;
    const provider = key.split("::")[0] ?? "";
    const providerOverride = config?.providers?.[provider];
    if (providerOverride) return providerOverride;
    if (provider.startsWith("openai")) return "window";
    return "token-bucket";
  }
}

/* ============================================================
 * Error + Singleton
 * ============================================================
 */

let singletonController: TrafficController | undefined;

export function getTrafficController(options?: TrafficControllerOptions): TrafficController {
  if (!singletonController) {
    singletonController = new TrafficController(options);
  }
  return singletonController;
}

function buildRateLimitKeyFromMetadata(metadata?: TrafficRequestMetadata): string {
  const provider = metadata?.provider ?? "default-provider";
  const model = metadata?.model ?? "default-model";
  const parts = [provider, model];

  // SOP: Add new metadata fields in one place with a stable label and ordering.
  // 1) Add the optional field to TrafficRequestMetadata.
  // 2) Add it here with a stable label so keys stay predictable.
  // Example: { label: "org", value: metadata?.orgId }
  const optionalFields: Array<{ label: string; value?: string }> = [
    { label: "apiKey", value: metadata?.apiKeyId },
    { label: "region", value: metadata?.region },
    { label: "endpoint", value: metadata?.endpoint },
    // Intentionally exclude tenantId to enforce provider/model limits across tenants.
    // Use rateLimitKeyBuilder to include tenant for per-tenant rate limits.
    { label: "tenantTier", value: metadata?.tenantTier },
    { label: "taskType", value: metadata?.taskType },
  ];

  for (const field of optionalFields) {
    if (!field.value) continue;
    parts.push(`${field.label}=${encodeURIComponent(field.value)}`);
  }

  return parts.join("::");
}

function buildProviderModelKeyFromMetadata(metadata?: TrafficRequestMetadata): string {
  const provider = metadata?.provider ?? "default-provider";
  const model = metadata?.model ?? "default-model";
  return `${provider}::${model}`;
}
