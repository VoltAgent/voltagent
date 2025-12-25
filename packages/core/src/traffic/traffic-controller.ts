import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";
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
import type {
  AdaptiveLimiterConfig,
  FallbackChainEntry,
  FallbackPolicy,
  FallbackPolicyConfig,
  FallbackPolicyMode,
  FallbackTarget,
  PriorityBurstLimits,
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

type AdaptiveLimiterState = {
  recent429s: number[];
  penaltyMs: number;
  cooldownUntil?: number;
  last429At?: number;
};

const DEFAULT_PRIORITY_BURST_LIMITS: Record<TrafficPriority, number> = {
  P0: 5,
  P1: 3,
  P2: 2,
};

const DEFAULT_ADAPTIVE_LIMITER: Required<AdaptiveLimiterConfig> = {
  windowMs: 30_000,
  threshold: 3,
  minPenaltyMs: 500,
  maxPenaltyMs: 10_000,
  penaltyMultiplier: 2,
  decayMs: 10_000,
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
  private readonly concurrencyLimiter: TrafficConcurrencyLimiter;

  private readonly queues: Record<TrafficPriority, TenantQueueState> = {
    P0: { order: [], index: 0, queues: new Map() },
    P1: { order: [], index: 0, queues: new Map() },
    P2: { order: [], index: 0, queues: new Map() },
  };
  private readonly priorityOrder: TrafficPriority[] = ["P0", "P1", "P2"];
  private readonly priorityBurstLimits: Record<TrafficPriority, number>;
  private readonly priorityBurstCounts: Record<TrafficPriority, number> = {
    P0: 0,
    P1: 0,
    P2: 0,
  };

  private activeCount = 0;
  private drainScheduled = false;

  /* ---------- Rate limits ---------- */
  private readonly rateLimiter: TrafficRateLimiter;

  /* ---------- Circuit breakers ---------- */
  private readonly circuitBreaker: TrafficCircuitBreaker;

  /* ---------- Usage ---------- */
  private readonly usageTracker = new TrafficUsageTracker();

  /* ---------- Traffic metadata ---------- */
  private readonly rateLimitSnapshots = new Map<string, RateLimitSnapshot>();

  /* ---------- Adaptive limiter ---------- */
  private readonly adaptiveLimiterConfig: Required<AdaptiveLimiterConfig>;
  private readonly adaptiveLimiterState = new Map<string, AdaptiveLimiterState>();

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY;
    this.scheduler = this.createScheduler();
    this.rateLimitKeyBuilder = options.rateLimitKeyBuilder ?? buildRateLimitKeyFromMetadata;
    this.retryPolicy = options.retryPolicy;
    this.priorityBurstLimits = {
      ...DEFAULT_PRIORITY_BURST_LIMITS,
      ...(options.priorityBurstLimits ?? {}),
    };
    this.adaptiveLimiterConfig = {
      ...DEFAULT_ADAPTIVE_LIMITER,
      ...(options.adaptiveLimiter ?? {}),
    };
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
    const adaptiveKey = this.buildAdaptiveKey(
      metadata,
      metadata?.tenantId ?? "default",
      rateLimitKey,
    );
    this.recordAdaptiveSuccess(adaptiveKey);
  }

  reportStreamFailure(metadata: TrafficRequestMetadata | undefined, error: unknown): void {
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
    this.circuitBreaker.recordFailure(metadata, error, this.trafficLogger);
    const rateLimitKey = this.buildRateLimitKey(metadata);
    const adaptiveKey = this.buildAdaptiveKey(
      metadata,
      metadata?.tenantId ?? "default",
      rateLimitKey,
    );
    if (error instanceof RateLimitedUpstreamError) {
      this.recordAdaptiveRateLimitHit(adaptiveKey, error.retryAfterMs);
    }
    this.attachTrafficMetadata(
      error,
      this.buildTrafficResponseMetadataFromMetadata(metadata, rateLimitKey, Date.now(), error),
    );
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
      reserved: update.state.reserved,
      resetAt: update.state.resetAt,
      nextAllowedAt: update.state.nextAllowedAt,
      resetRequestsMs: update.headerSnapshot.resetRequestsMs,
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
      const priority = this.resolvePriority(request.metadata);
      const tenantId = this.resolveTenantId(request);
      this.controllerLogger.debug("Enqueue request", {
        type,
        tenantId,
        priority,
        provider: request.metadata?.provider,
        model: request.metadata?.model,
      });
      this.enqueueItem({
        type,
        request,
        resolve,
        reject,
        attempt: 1,
        priority,
        tenantId,
        enqueuedAt: Date.now(),
        extractUsage: request.extractUsage,
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
    this.controllerLogger.trace("Drain start", {
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
      queuedP0: this.getQueuedCount("P0"),
      queuedP1: this.getQueuedCount("P1"),
      queuedP2: this.getQueuedCount("P2"),
    });
    while (true) {
      const decision = this.tryDispatchNext();
      this.controllerLogger.trace("Dispatch decision", decision);
      if (decision.kind === "dispatch" || decision.kind === "skip") continue;
      if (decision.kind === "wait") {
        if (decision.wakeUpAt) {
          this.controllerLogger.debug("Rate limit wait; scheduling wakeup", {
            wakeUpAt: decision.wakeUpAt,
            inMs: Math.max(0, decision.wakeUpAt - Date.now()),
          });
          this.scheduleRateLimitWakeUpAt(decision.wakeUpAt);
        }
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
    if (this.activeCount >= this.maxConcurrent) return { kind: "wait" };

    let earliestWakeUpAt: number | undefined;

    const observeWakeUpAt = (candidate?: number): void => {
      if (candidate === undefined) return;
      earliestWakeUpAt =
        earliestWakeUpAt === undefined ? candidate : Math.min(earliestWakeUpAt, candidate);
    };

    const priorities = this.getPriorityDispatchOrder();
    for (const priority of priorities) {
      const state = this.queues[priority];
      if (state.order.length === 0) continue;

      let attempts = 0;
      const maxAttempts = state.order.length;

      while (attempts < maxAttempts) {
        const candidate = this.getNextTenantCandidate(priority);
        if (!candidate) break;
        attempts += 1;

        const { item: next, queue, tenantId } = candidate;
        const now = Date.now();
        const queueTimeoutAt = this.resolveQueueTimeoutAt(next);
        const queueTimeoutTriggered = this.handleQueueTimeout(next, queue, 0, now, queueTimeoutAt);
        if (queueTimeoutTriggered === "rejected") {
          this.cleanupTenantQueue(priority, tenantId, queue);
          return { kind: "skip" };
        }
        if (queueTimeoutAt !== undefined && now < queueTimeoutAt) {
          observeWakeUpAt(queueTimeoutAt);
        }
        const queueTimeoutExpired = queueTimeoutTriggered === "expired";

        this.controllerLogger.trace("Evaluate next queued request", {
          priority,
          tenantId: next.tenantId,
          type: next.type,
          attempt: next.attempt,
          provider: next.request.metadata?.provider,
          model: next.request.metadata?.model,
          queueLength: queue.length,
        });

        const circuit = this.resolveCircuit(next);
        if (circuit) {
          this.controllerLogger.trace("Circuit resolution returned decision", {
            priority,
            decision: circuit,
            circuitKey: next.circuitKey,
            circuitStatus: next.circuitStatus,
          });
          if (circuit.kind === "skip") {
            queue.shift();
            this.cleanupTenantQueue(priority, tenantId, queue);
            return { kind: "skip" };
          }
          if (circuit.kind === "wait") {
            if (
              this.rejectIfQueueTimedOut(queueTimeoutExpired, next, queue, 0, now, "circuit wait")
            ) {
              this.cleanupTenantQueue(priority, tenantId, queue);
              return { kind: "skip" };
            }
            next.etaMs =
              circuit.wakeUpAt !== undefined ? Math.max(0, circuit.wakeUpAt - now) : undefined;
            observeWakeUpAt(circuit.wakeUpAt);
            continue;
          }
        }

        const concurrency = this.concurrencyLimiter.resolve(next, this.trafficLogger);
        if (concurrency.kind === "wait") {
          this.controllerLogger.trace("Concurrency gate blocked request", {
            priority,
            tenantId: next.tenantId,
            provider: next.request.metadata?.provider,
            model: next.request.metadata?.model,
            reasons: concurrency.reasons,
          });
          if (
            this.rejectIfQueueTimedOut(queueTimeoutExpired, next, queue, 0, now, "concurrency wait")
          ) {
            this.cleanupTenantQueue(priority, tenantId, queue);
            return { kind: "skip" };
          }
          next.etaMs = undefined;
          continue;
        }

        const adaptive = this.resolveAdaptiveLimit(next, now);
        if (adaptive?.kind === "wait") {
          if (
            this.rejectIfQueueTimedOut(queueTimeoutExpired, next, queue, 0, now, "adaptive wait")
          ) {
            this.cleanupTenantQueue(priority, tenantId, queue);
            return { kind: "skip" };
          }
          next.etaMs =
            adaptive.wakeUpAt !== undefined ? Math.max(0, adaptive.wakeUpAt - now) : undefined;
          observeWakeUpAt(adaptive.wakeUpAt);
          continue;
        }

        const rateLimit = this.resolveRateLimit(next);
        if (rateLimit) {
          this.controllerLogger.trace("Rate limit resolution returned decision", {
            priority,
            decision: rateLimit,
            rateLimitKey: next.rateLimitKey ?? this.buildRateLimitKey(next.request.metadata),
          });
          if (rateLimit.kind === "wait") {
            if (
              this.rejectIfQueueTimedOut(
                queueTimeoutExpired,
                next,
                queue,
                0,
                now,
                "rate limit wait",
              )
            ) {
              this.cleanupTenantQueue(priority, tenantId, queue);
              return { kind: "skip" };
            }
            next.etaMs =
              rateLimit.wakeUpAt !== undefined ? Math.max(0, rateLimit.wakeUpAt - now) : undefined;
            observeWakeUpAt(rateLimit.wakeUpAt);
          }
          continue;
        }

        if (queueTimeoutExpired) {
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
          this.controllerLogger.warn("Queue wait timed out before dispatch", {
            tenantId: next.tenantId,
            waitedMs: timeoutError.waitedMs,
            maxQueueWaitMs: timeoutError.maxQueueWaitMs,
            deadlineAt: timeoutError.deadlineAt,
            provider: next.request.metadata?.provider,
            model: next.request.metadata?.model,
            rateLimitKey: timeoutError.rateLimitKey,
          });
          queue.shift();
          this.cleanupTenantQueue(priority, tenantId, queue);
          next.reject(timeoutError);
          return { kind: "skip" };
        }

        this.startRequest(next, queue, tenantId);
        return { kind: "dispatch" };
      }
    }

    return earliestWakeUpAt !== undefined
      ? { kind: "wait", wakeUpAt: earliestWakeUpAt }
      : { kind: "wait" };
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
      const adaptiveKey = this.buildAdaptiveKey(item.request.metadata, item.tenantId, rateLimitKey);
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
      this.rateLimiter.recordUsage(rateLimitKey, usage, this.trafficLogger);
      this.recordAdaptiveSuccess(adaptiveKey);
      this.attachTrafficMetadata(
        result,
        this.buildTrafficResponseMetadata(item, rateLimitKey, Date.now()),
      );
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
      const adaptiveKey = this.buildAdaptiveKey(item.request.metadata, item.tenantId, rateLimitKey);
      if (errorForHandling instanceof RateLimitedUpstreamError) {
        this.recordAdaptiveRateLimitHit(adaptiveKey, errorForHandling.retryAfterMs);
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
      this.rateLimiter.releaseReservation(item.rateLimitKey, this.trafficLogger);
      this.concurrencyLimiter.release(item, this.trafficLogger);
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.controllerLogger.trace("Request finished; slot released", {
        tenantId: item.tenantId,
        activeCount: this.activeCount,
        maxConcurrent: this.maxConcurrent,
      });
      this.scheduleDrain();
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

  private resolveCircuit(next: QueuedRequest): DispatchDecision | null {
    return this.circuitBreaker.resolve(next, this.trafficLogger);
  }

  /* ============================================================
   * Utilities
   * ============================================================
   */

  private resolveQueueTimeoutAt(next: QueuedRequest): number | undefined {
    const maxQueueWaitMs = next.request.maxQueueWaitMs;
    const normalizedMaxWait =
      typeof maxQueueWaitMs === "number" && Number.isFinite(maxQueueWaitMs)
        ? Math.max(0, maxQueueWaitMs)
        : undefined;
    const timeoutAt =
      normalizedMaxWait !== undefined ? next.enqueuedAt + normalizedMaxWait : undefined;
    const deadlineAt = next.request.deadlineAt;
    if (timeoutAt === undefined) return deadlineAt;
    if (deadlineAt === undefined) return timeoutAt;
    return Math.min(timeoutAt, deadlineAt);
  }

  private handleQueueTimeout(
    next: QueuedRequest,
    queue: QueuedRequest[],
    index: number,
    now: number,
    queueTimeoutAt?: number,
  ): "none" | "expired" | "rejected" {
    if (queueTimeoutAt === undefined) return "none";
    if (now < queueTimeoutAt) return "none";

    const fallbackApplied = this.circuitBreaker.tryFallback(
      next,
      "queue-timeout",
      this.trafficLogger,
    );
    if (fallbackApplied) {
      return "expired";
    }

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
    this.controllerLogger.warn("Queue wait timed out; rejecting request", {
      tenantId: next.tenantId,
      waitedMs: timeoutError.waitedMs,
      maxQueueWaitMs: timeoutError.maxQueueWaitMs,
      deadlineAt: timeoutError.deadlineAt,
      provider: next.request.metadata?.provider,
      model: next.request.metadata?.model,
      rateLimitKey: timeoutError.rateLimitKey,
    });
    queue.splice(index, 1);
    next.reject(timeoutError);
    return "rejected";
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
    queue.splice(index, 1);
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

  private hasQueuedWorkBelow(priority: TrafficPriority): boolean {
    const index = this.priorityOrder.indexOf(priority);
    if (index < 0) return false;
    for (let i = index + 1; i < this.priorityOrder.length; i += 1) {
      if (this.getQueuedCount(this.priorityOrder[i]) > 0) {
        return true;
      }
    }
    return false;
  }

  private canDispatchPriority(priority: TrafficPriority): boolean {
    const limit = this.priorityBurstLimits[priority];
    if (!Number.isFinite(limit) || limit <= 0) return true;
    if (this.priorityBurstCounts[priority] < limit) return true;
    return !this.hasQueuedWorkBelow(priority);
  }

  private recordPriorityDispatch(priority: TrafficPriority): void {
    for (const key of this.priorityOrder) {
      if (key !== priority) {
        this.priorityBurstCounts[key] = 0;
      }
    }
    this.priorityBurstCounts[priority] += 1;
  }

  private getPriorityDispatchOrder(): TrafficPriority[] {
    return this.priorityOrder.filter((priority) => this.canDispatchPriority(priority));
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

  private resolvePriority(metadata?: TrafficRequestMetadata): TrafficPriority {
    return metadata?.priority ?? "P1";
  }

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    return this.rateLimitKeyBuilder(metadata);
  }

  private resolveAdaptiveLimit(next: QueuedRequest, now: number): DispatchDecision | null {
    const rateLimitKey = next.rateLimitKey ?? this.buildRateLimitKey(next.request.metadata);
    const adaptiveKey = this.buildAdaptiveKey(next.request.metadata, next.tenantId, rateLimitKey);
    const state = this.adaptiveLimiterState.get(adaptiveKey);
    if (!state) return null;

    this.applyAdaptiveDecay(state, now);
    if (state.cooldownUntil !== undefined && now < state.cooldownUntil) {
      return { kind: "wait", wakeUpAt: state.cooldownUntil };
    }

    return null;
  }

  private recordAdaptiveRateLimitHit(key: string, retryAfterMs?: number): void {
    const state = this.getAdaptiveState(key);
    const now = Date.now();
    const { windowMs, threshold, minPenaltyMs, maxPenaltyMs, penaltyMultiplier } =
      this.adaptiveLimiterConfig;

    state.last429At = now;
    state.recent429s = state.recent429s.filter((timestamp) => now - timestamp <= windowMs);
    state.recent429s.push(now);

    if (state.recent429s.length < threshold) {
      return;
    }

    const basePenalty = state.penaltyMs > 0 ? state.penaltyMs : minPenaltyMs;
    const nextPenalty = Math.min(
      maxPenaltyMs,
      Math.max(minPenaltyMs, Math.round(basePenalty * penaltyMultiplier)),
    );
    state.penaltyMs = nextPenalty;
    const retryPenalty = typeof retryAfterMs === "number" ? retryAfterMs : 0;
    const cooldownMs = Math.max(nextPenalty, retryPenalty);
    state.cooldownUntil = now + cooldownMs;
  }

  private recordAdaptiveSuccess(key: string): void {
    const state = this.adaptiveLimiterState.get(key);
    if (!state) return;

    const now = Date.now();
    this.applyAdaptiveDecay(state, now);
    if (state.penaltyMs === 0) {
      state.cooldownUntil = undefined;
      state.recent429s = [];
      state.last429At = undefined;
    }
  }

  private applyAdaptiveDecay(state: AdaptiveLimiterState, now: number): void {
    const { decayMs, penaltyMultiplier } = this.adaptiveLimiterConfig;
    if (state.last429At && now - state.last429At < decayMs) {
      return;
    }

    if (state.penaltyMs > 0) {
      state.penaltyMs = Math.max(0, Math.floor(state.penaltyMs / penaltyMultiplier));
    }
  }

  private getAdaptiveState(key: string): AdaptiveLimiterState {
    const existing = this.adaptiveLimiterState.get(key);
    if (existing) return existing;
    const created: AdaptiveLimiterState = {
      recent429s: [],
      penaltyMs: 0,
    };
    this.adaptiveLimiterState.set(key, created);
    return created;
  }

  private buildAdaptiveKey(
    metadata: TrafficRequestMetadata | undefined,
    tenantId: string,
    rateLimitKey: string,
  ): string {
    if (rateLimitKey.includes("tenant=")) {
      return rateLimitKey;
    }
    const tenant = metadata?.tenantId ?? tenantId ?? "default";
    return `${rateLimitKey}::tenant=${encodeURIComponent(tenant)}`;
  }

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
    { label: "tenant", value: metadata?.tenantId },
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
