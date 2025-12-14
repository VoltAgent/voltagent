import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";
import { TrafficCircuitBreaker } from "./traffic-circuit-breaker";
import type { DispatchDecision, QueuedRequest, Scheduler } from "./traffic-controller-internal";
import { CircuitBreakerOpenError, RateLimitedUpstreamError } from "./traffic-errors";
import { type RateLimitUpdateResult, TrafficRateLimiter } from "./traffic-rate-limiter";
import { type RetryReason, buildRetryPlan } from "./traffic-retry";
import type {
  RateLimitConfig,
  RateLimitKey,
  RateLimitOptions,
  TenantUsage,
  TrafficControllerOptions,
  TrafficPriority,
  TrafficRequest,
  TrafficRequestMetadata,
  TrafficRequestType,
} from "./traffic-types";
import { TrafficUsageTracker } from "./traffic-usage-tracker";

/* ============================================================
 * Traffic Controller
 * ============================================================
 */

export type {
  RateLimitConfig,
  RateLimitKey,
  RateLimitOptions,
  TenantUsage,
  TrafficControllerOptions,
  TrafficPriority,
  TrafficRequest,
  TrafficRequestMetadata,
  TrafficRequestType,
};

export { CircuitBreakerOpenError };
export { RateLimitedUpstreamError };

export class TrafficController {
  /* ---------- Core ---------- */

  private readonly scheduler: Scheduler;
  private readonly maxConcurrent: number;
  private readonly logger: Logger;
  private readonly trafficLogger: Logger;
  private readonly controllerLogger: Logger;

  private readonly queues: Record<TrafficPriority, QueuedRequest[]> = {
    P0: [],
    P1: [],
    P2: [],
  };
  private readonly priorityOrder: TrafficPriority[] = ["P0", "P1", "P2"];

  private activeCount = 0;
  private drainScheduled = false;

  /* ---------- Rate limits ---------- */
  private readonly rateLimiter: TrafficRateLimiter;

  /* ---------- Circuit breakers ---------- */
  private readonly circuitBreaker: TrafficCircuitBreaker;

  /* ---------- Usage ---------- */
  private readonly usageTracker = new TrafficUsageTracker();

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY;
    this.scheduler = this.createScheduler();
    this.logger = new LoggerProxy({ component: "traffic-controller" }, options.logger);
    this.trafficLogger = this.logger.child({ subsystem: "traffic" });
    this.controllerLogger = this.trafficLogger.child({ module: "controller" });
    this.rateLimiter = new TrafficRateLimiter(() => this.scheduleDrain());
    this.circuitBreaker = new TrafficCircuitBreaker({
      fallbackChains: options.fallbackChains,
      buildRateLimitKey: (metadata) => this.buildRateLimitKey(metadata),
    });

    this.controllerLogger.debug("Initialized TrafficController", {
      maxConcurrent: this.maxConcurrent,
      hasFallbackChains: !!options.fallbackChains,
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
      this.controllerLogger.debug("Enqueue request", {
        type,
        tenantId: request.tenantId,
        priority,
        provider: request.metadata?.provider,
        model: request.metadata?.model,
      });
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
      queuedP0: this.queues.P0.length,
      queuedP1: this.queues.P1.length,
      queuedP2: this.queues.P2.length,
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

    for (const priority of this.priorityOrder) {
      const next = this.queues[priority][0];
      if (!next) continue;

      this.controllerLogger.trace("Evaluate next queued request", {
        priority,
        type: next.type,
        tenantId: next.tenantId,
        attempt: next.attempt,
        provider: next.request.metadata?.provider,
        model: next.request.metadata?.model,
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
          this.queues[priority].shift();
          return { kind: "skip" };
        }
        if (circuit.kind === "wait") {
          if (circuit.wakeUpAt !== undefined) {
            earliestWakeUpAt =
              earliestWakeUpAt === undefined
                ? circuit.wakeUpAt
                : Math.min(earliestWakeUpAt, circuit.wakeUpAt);
          }
          continue;
        }
      }

      const rateLimit = this.resolveRateLimit(next);
      if (rateLimit) {
        this.controllerLogger.trace("Rate limit resolution returned decision", {
          priority,
          decision: rateLimit,
          rateLimitKey: next.rateLimitKey ?? this.buildRateLimitKey(next.request.metadata),
        });
        if (rateLimit.kind === "wait" && rateLimit.wakeUpAt !== undefined) {
          earliestWakeUpAt =
            earliestWakeUpAt === undefined
              ? rateLimit.wakeUpAt
              : Math.min(earliestWakeUpAt, rateLimit.wakeUpAt);
        }
        continue;
      }

      this.startRequest(next);
      return { kind: "dispatch" };
    }

    return earliestWakeUpAt !== undefined
      ? { kind: "wait", wakeUpAt: earliestWakeUpAt }
      : { kind: "wait" };
  }

  private startRequest(item: QueuedRequest): void {
    this.controllerLogger.debug("Start request", {
      priority: item.priority,
      type: item.type,
      tenantId: item.tenantId,
      attempt: item.attempt,
      provider: item.request.metadata?.provider,
      model: item.request.metadata?.model,
    });
    this.queues[item.priority].shift();
    this.activeCount++;
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
      this.controllerLogger.debug("Request succeeded", {
        tenantId: item.tenantId,
        attempt: item.attempt,
        provider: item.request.metadata?.provider,
        model: item.request.metadata?.model,
        elapsedMs: Date.now() - startedAt,
      });
      this.circuitBreaker.recordSuccess(item.request.metadata, this.trafficLogger);
      this.usageTracker.recordUsage(item, result, this.trafficLogger);
      item.resolve(result);
    } catch (error) {
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
      this.circuitBreaker.recordFailure(item.request.metadata, error, this.trafficLogger);

      const retry = buildRetryPlan(error, item.attempt, this.trafficLogger);
      if (retry) {
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
      } else {
        this.controllerLogger.debug("No retry plan; rejecting request", {
          tenantId: item.tenantId,
          attempt: item.attempt,
          provider: item.request.metadata?.provider,
          model: item.request.metadata?.model,
        });
        item.reject(error);
      }
    } finally {
      this.rateLimiter.releaseReservation(item.rateLimitKey, this.trafficLogger);
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

  private scheduleRetry<TResponse>(
    item: QueuedRequest<TResponse>,
    plan: { delayMs: number; reason: RetryReason },
  ): void {
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

  private resolvePriority(metadata?: TrafficRequestMetadata): TrafficPriority {
    return metadata?.priority ?? "P1";
  }

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    return `${metadata?.provider ?? "default-provider"}::${metadata?.model ?? "default-model"}`;
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
