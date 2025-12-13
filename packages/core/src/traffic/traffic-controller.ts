import type { Logger } from "../logger";
import { LoggerProxy } from "../logger";
import { TrafficCircuitBreaker } from "./traffic-circuit-breaker";
import type { DispatchDecision, QueuedRequest, Scheduler } from "./traffic-controller-internal";
import { CircuitBreakerOpenError } from "./traffic-errors";
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
  private readonly rateLimiter: TrafficRateLimiter;

  /* ---------- Circuit breakers ---------- */
  private readonly circuitBreaker: TrafficCircuitBreaker;

  /* ---------- Usage ---------- */
  private readonly usageTracker = new TrafficUsageTracker();

  constructor(options: TrafficControllerOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? Number.POSITIVE_INFINITY;
    this.scheduler = this.createScheduler();
    this.logger = new LoggerProxy({ component: "traffic-controller" }, options.logger);
    this.rateLimiter = new TrafficRateLimiter(() => this.scheduleDrain());
    this.circuitBreaker = new TrafficCircuitBreaker({
      fallbackChains: options.fallbackChains,
      buildRateLimitKey: (metadata) => this.buildRateLimitKey(metadata),
    });
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

  updateRateLimitFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
  ): RateLimitUpdateResult | undefined {
    const key = this.buildRateLimitKey(metadata);
    return this.rateLimiter.updateFromHeaders(metadata, headers, key);
  }

  getTenantUsage(tenantId: string): TenantUsage | undefined {
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
    if (this.activeCount >= this.maxConcurrent) return { kind: "wait" };

    let earliestWakeUpAt: number | undefined;

    for (const priority of this.priorityOrder) {
      const next = this.queues[priority][0];
      if (!next) continue;

      const circuit = this.resolveCircuit(next);
      if (circuit) {
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
    this.queues[item.priority].shift();
    this.activeCount++;
    this.circuitBreaker.markTrial(item);
    void this.executeRequest(item);
  }

  /* ============================================================
   * Execution
   * ============================================================
   */

  private async executeRequest<TResponse>(item: QueuedRequest<TResponse>): Promise<void> {
    try {
      const result = await item.request.execute();
      this.circuitBreaker.recordSuccess(item.request.metadata);
      this.usageTracker.recordUsage(item, result);
      item.resolve(result);
    } catch (error) {
      this.circuitBreaker.recordFailure(item.request.metadata, error);

      const retry = buildRetryPlan(error, item.attempt);
      if (retry) {
        this.scheduleRetry(item, retry);
      } else {
        item.reject(error);
      }
    } finally {
      this.rateLimiter.releaseReservation(item.rateLimitKey);
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

  /* ============================================================
   * Rate limiting (verbatim logic)
   * ============================================================
   */

  private resolveRateLimit(next: QueuedRequest): DispatchDecision | null {
    const key = this.buildRateLimitKey(next.request.metadata);
    return this.rateLimiter.resolve(next, key);
  }

  private scheduleRateLimitWakeUpAt(wakeUpAt: number): void {
    this.rateLimiter.scheduleWakeUpAt(wakeUpAt);
  }

  /* ============================================================
   * Circuit breakers (verbatim logic, linearized)
   * ============================================================
   */

  private resolveCircuit(next: QueuedRequest): DispatchDecision | null {
    return this.circuitBreaker.resolve(next);
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
