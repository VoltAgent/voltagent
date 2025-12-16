import type { Logger } from "../logger";
import type {
  RateLimitStrategy,
  RateLimitUpdateResult,
} from "./rate-limit-strategies/rate-limit-strategy";
import { TokenBucketRateLimitStrategy } from "./rate-limit-strategies/token-bucket-rate-limit-strategy";
import type { DispatchDecision, QueuedRequest } from "./traffic-controller-internal";
import type { TrafficRequestMetadata } from "./traffic-types";

export type {
  RateLimitHeaderSnapshot,
  RateLimitStrategy,
  RateLimitUpdateResult,
} from "./rate-limit-strategies/rate-limit-strategy";
export { DefaultRateLimitStrategy } from "./rate-limit-strategies/default-rate-limit-strategy";
export { OpenAIWindowRateLimitStrategy } from "./rate-limit-strategies/openai-window-rate-limit-strategy";
export { TokenBucketRateLimitStrategy } from "./rate-limit-strategies/token-bucket-rate-limit-strategy";

type SchedulerCallback = () => void;

export type RateLimitStrategyFactory = (key: string) => RateLimitStrategy;

export class TrafficRateLimiter {
  private readonly strategies = new Map<string, RateLimitStrategy>();
  private wakeUpTimeout?: ReturnType<typeof setTimeout>;
  private wakeUpAt?: number;
  private readonly onWakeUp: SchedulerCallback;
  private readonly strategyFactory: RateLimitStrategyFactory;

  constructor(onWakeUp: SchedulerCallback, strategyFactory?: RateLimitStrategyFactory) {
    this.onWakeUp = onWakeUp;
    this.strategyFactory = strategyFactory ?? ((key) => new TokenBucketRateLimitStrategy(key));
  }

  resolve(next: QueuedRequest, key: string, logger?: Logger): DispatchDecision | null {
    const strategy = this.strategies.get(key) ?? this.createStrategy(key, logger);
    return strategy.resolve(next, logger);
  }

  notifyDispatch(key: string | undefined, logger?: Logger): void {
    if (!key) return;
    this.strategies.get(key)?.onDispatch(logger);
  }

  scheduleWakeUpAt(wakeUpAt: number, logger?: Logger): void {
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const now = Date.now();
    const target = Math.max(now, wakeUpAt);

    if (this.wakeUpTimeout && this.wakeUpAt !== undefined && this.wakeUpAt <= target) {
      rateLimitLogger?.trace?.("Wakeup already scheduled earlier; skipping", {
        currentWakeUpAt: this.wakeUpAt,
        requestedWakeUpAt: target,
      });
      return;
    }

    if (this.wakeUpTimeout) clearTimeout(this.wakeUpTimeout);

    this.wakeUpAt = target;
    rateLimitLogger?.debug?.("Scheduling rate limit wakeup", {
      wakeUpAt: target,
      inMs: Math.max(1, target - now),
    });
    this.wakeUpTimeout = setTimeout(
      () => {
        this.wakeUpTimeout = undefined;
        this.wakeUpAt = undefined;
        rateLimitLogger?.debug?.("Rate limit wakeup fired");
        this.onWakeUp();
      },
      Math.max(1, target - now),
    );
  }

  releaseReservation(key?: string, logger?: Logger): void {
    if (!key) return;
    this.strategies.get(key)?.onComplete(logger);
  }

  updateFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    key: string,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined {
    const existing = this.strategies.get(key);
    if (existing) return existing.updateFromHeaders(metadata, headers, logger);

    const created = this.strategyFactory(key);
    const update = created.updateFromHeaders(metadata, headers, logger);
    if (!update) return undefined;
    this.strategies.set(key, created);
    return update;
  }

  private createStrategy(key: string, logger?: Logger): RateLimitStrategy {
    const created = this.strategyFactory(key);
    this.strategies.set(key, created);
    logger?.child({ module: "rate-limiter" })?.trace?.("Created rate limit strategy", {
      rateLimitKey: key,
      strategy: created.constructor.name,
    });
    return created;
  }
}
