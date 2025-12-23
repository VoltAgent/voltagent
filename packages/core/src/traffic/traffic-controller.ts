import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";
import { TrafficCircuitBreaker } from "./traffic-circuit-breaker";
import { TrafficConcurrencyLimiter } from "./traffic-concurrency-limiter";
import type { DispatchDecision, QueuedRequest, Scheduler } from "./traffic-controller-internal";
import {
  CircuitBreakerOpenError,
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
} from "./traffic-types";
import { TrafficUsageTracker } from "./traffic-usage-tracker";

/* ============================================================
 * Traffic Controller
 * ============================================================
 */

export type {
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
  TrafficRequestType,
};

export { CircuitBreakerOpenError };
export { RateLimitedUpstreamError };

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
    this.rateLimitKeyBuilder = options.rateLimitKeyBuilder ?? buildRateLimitKeyFromMetadata;
    this.retryPolicy = options.retryPolicy;
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
      buildRateLimitKey: (metadata) => this.buildRateLimitKey(metadata),
    });
    this.concurrencyLimiter = new TrafficConcurrencyLimiter({
      buildProviderModelKey: (metadata) => this.buildRateLimitKey(metadata),
      maxConcurrentPerProviderModel: options.maxConcurrentPerProviderModel,
      maxConcurrentPerTenant: options.maxConcurrentPerTenant,
    });

    this.controllerLogger.debug("Initialized TrafficController", {
      maxConcurrent: this.maxConcurrent,
      hasFallbackChains: !!options.fallbackChains,
      hasProviderModelConcurrency: options.maxConcurrentPerProviderModel !== undefined,
      hasTenantConcurrency: options.maxConcurrentPerTenant !== undefined,
      hasConfigRateLimits: options.rateLimits !== undefined,
      hasStrategyOverrides: options.rateLimitStrategy !== undefined,
      hasRetryPolicy: options.retryPolicy !== undefined,
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

    const observeWakeUpAt = (candidate?: number): void => {
      if (candidate === undefined) return;
      earliestWakeUpAt =
        earliestWakeUpAt === undefined ? candidate : Math.min(earliestWakeUpAt, candidate);
    };

    for (const priority of this.priorityOrder) {
      const queue = this.queues[priority];
      for (let index = 0; index < queue.length; index++) {
        const next = queue[index];
        if (!next) continue;

        this.controllerLogger.trace("Evaluate next queued request", {
          priority,
          queueIndex: index,
          queueLength: queue.length,
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
            queue.splice(index, 1);
            return { kind: "skip" };
          }
          if (circuit.kind === "wait") {
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
          continue;
        }

        const rateLimit = this.resolveRateLimit(next);
        if (rateLimit) {
          this.controllerLogger.trace("Rate limit resolution returned decision", {
            priority,
            decision: rateLimit,
            rateLimitKey: next.rateLimitKey ?? this.buildRateLimitKey(next.request.metadata),
          });
          if (rateLimit.kind === "wait") observeWakeUpAt(rateLimit.wakeUpAt);
          continue;
        }

        this.startRequest(next, index);
        return { kind: "dispatch" };
      }
    }

    return earliestWakeUpAt !== undefined
      ? { kind: "wait", wakeUpAt: earliestWakeUpAt }
      : { kind: "wait" };
  }

  private startRequest(item: QueuedRequest, queueIndex: number): void {
    this.controllerLogger.debug("Start request", {
      priority: item.priority,
      type: item.type,
      tenantId: item.tenantId,
      attempt: item.attempt,
      provider: item.request.metadata?.provider,
      model: item.request.metadata?.model,
    });
    this.queues[item.priority].splice(queueIndex, 1);
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
      const rateLimitKey = item.rateLimitKey ?? this.buildRateLimitKey(item.request.metadata);
      this.rateLimiter.recordUsage(rateLimitKey, usage, this.trafficLogger);
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
      this.queues[item.priority].push({
        ...item,
        attempt: item.attempt + 1,
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

  private resolvePriority(metadata?: TrafficRequestMetadata): TrafficPriority {
    return metadata?.priority ?? "P1";
  }

  private buildRateLimitKey(metadata?: TrafficRequestMetadata): string {
    return this.rateLimitKeyBuilder(metadata);
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
    { label: "tenantTier", value: metadata?.tenantTier },
    { label: "taskType", value: metadata?.taskType },
  ];

  for (const field of optionalFields) {
    if (!field.value) continue;
    parts.push(`${field.label}=${encodeURIComponent(field.value)}`);
  }

  return parts.join("::");
}
