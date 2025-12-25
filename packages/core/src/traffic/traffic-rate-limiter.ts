import type { Logger } from "../logger";
import type {
  RateLimitStrategy,
  RateLimitUpdateResult,
} from "./rate-limit-strategies/rate-limit-strategy";
import { TokenBucketRateLimitStrategy } from "./rate-limit-strategies/token-bucket-rate-limit-strategy";
import type { DispatchDecision, QueuedRequest } from "./traffic-controller-internal";
import type { RateLimitConfig, TrafficRequestMetadata } from "./traffic-types";

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

type UsageCounters = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

type TokenRateState = {
  capacity: number;
  refillPerSecond: number;
  tokens: number;
  updatedAt: number;
};

export class TrafficRateLimiter {
  private readonly strategies = new Map<string, RateLimitStrategy>();
  private readonly tokenRates = new Map<string, TokenRateState>();
  private wakeUpTimeout?: ReturnType<typeof setTimeout>;
  private wakeUpAt?: number;
  private readonly onWakeUp: SchedulerCallback;
  private readonly strategyFactory: RateLimitStrategyFactory;
  private readonly rateLimits?: RateLimitConfig;

  constructor(
    onWakeUp: SchedulerCallback,
    options?: { strategyFactory?: RateLimitStrategyFactory; rateLimits?: RateLimitConfig },
  ) {
    this.onWakeUp = onWakeUp;
    this.rateLimits = options?.rateLimits;
    this.strategyFactory =
      options?.strategyFactory ??
      ((key) => new TokenBucketRateLimitStrategy(key, this.rateLimits?.[key]));
  }

  resolve(next: QueuedRequest, key: string, logger?: Logger): DispatchDecision | null {
    const strategy = this.strategies.get(key) ?? this.createStrategy(key, logger);
    const requestDecision = strategy.resolve(next, logger);
    if (requestDecision?.kind === "wait") {
      const tokenDecision = strategy.handlesTokenLimits
        ? null
        : this.resolveTokenLimit(next, key, logger, false);
      if (tokenDecision?.kind === "wait") {
        const requestWakeUp = requestDecision.wakeUpAt;
        const tokenWakeUp = tokenDecision.wakeUpAt;
        if (tokenWakeUp !== undefined && requestWakeUp !== undefined) {
          return { kind: "wait", wakeUpAt: Math.min(requestWakeUp, tokenWakeUp) };
        }
        if (tokenWakeUp !== undefined && requestWakeUp === undefined) {
          return tokenDecision;
        }
      }
      return requestDecision;
    }

    const tokenDecision = strategy.handlesTokenLimits
      ? null
      : this.resolveTokenLimit(next, key, logger, true);
    if (tokenDecision?.kind === "wait") {
      return tokenDecision;
    }

    return requestDecision;
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

  recordUsage(
    key: string | undefined,
    usage: UsageCounters | Promise<UsageCounters | undefined> | undefined,
    logger?: Logger,
    reservedTokens?: number,
  ): void {
    if (!key || !usage) return;
    if (typeof (usage as PromiseLike<UsageCounters | undefined>).then === "function") {
      void (usage as Promise<UsageCounters | undefined>)
        .then((resolved) => this.recordUsage(key, resolved, logger, reservedTokens))
        .catch(() => {});
      return;
    }

    const strategy = this.strategies.get(key);
    if (strategy?.recordUsage) {
      strategy.recordUsage(usage, logger, reservedTokens);
      return;
    }

    const tokens = this.resolveTokenCount(usage);
    if (tokens <= 0) return;

    const bucket = this.getTokenRateState(key, logger);
    if (!bucket) return;

    const now = Date.now();
    this.refillTokenRate(bucket, now);
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens);
    const reserved = typeof reservedTokens === "number" ? reservedTokens : 0;
    const delta = tokens - reserved;
    if (delta > 0) {
      bucket.tokens -= delta;
    } else if (delta < 0) {
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + Math.abs(delta));
    }

    if (bucket.tokens < 0 && bucket.refillPerSecond > 0) {
      const waitMs = Math.max(1, Math.ceil((-bucket.tokens / bucket.refillPerSecond) * 1000));
      this.scheduleWakeUpAt(now + waitMs, logger);
    }
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

  private resolveTokenLimit(
    next: QueuedRequest,
    key: string,
    logger?: Logger,
    reserveTokens = true,
  ): DispatchDecision | null {
    const bucket = this.getTokenRateState(key, logger);
    if (!bucket) return null;

    const now = Date.now();
    this.refillTokenRate(bucket, now);

    if (bucket.capacity <= 0) {
      logger?.child({ module: "rate-limiter" })?.debug?.("Token limit misconfigured; blocking", {
        rateLimitKey: key,
        capacity: bucket.capacity,
        refillPerSecond: bucket.refillPerSecond,
      });
      return { kind: "wait" };
    }

    const estimatedTokens = next.estimatedTokens;
    if (typeof estimatedTokens === "number" && estimatedTokens > 0) {
      if (bucket.tokens >= estimatedTokens) {
        if (reserveTokens) {
          bucket.tokens -= estimatedTokens;
          next.reservedTokens = estimatedTokens;
        }
        return null;
      }
    } else if (bucket.tokens >= 0) {
      return null;
    }

    if (bucket.refillPerSecond <= 0) {
      logger?.child({ module: "rate-limiter" })?.debug?.("Token limit has no refill; blocking", {
        rateLimitKey: key,
        capacity: bucket.capacity,
        refillPerSecond: bucket.refillPerSecond,
      });
      return { kind: "wait" };
    }

    const requiredTokens =
      typeof estimatedTokens === "number" && estimatedTokens > 0
        ? Math.max(estimatedTokens - bucket.tokens, 1)
        : -bucket.tokens;
    const waitMs = Math.max(1, Math.ceil((requiredTokens / bucket.refillPerSecond) * 1000));
    return { kind: "wait", wakeUpAt: now + waitMs };
  }

  private getTokenRateState(key: string, logger?: Logger): TokenRateState | undefined {
    const existing = this.tokenRates.get(key);
    if (existing) return existing;

    const options = this.rateLimits?.[key];
    if (!options) return undefined;

    const tokensPerMinute = Number(options.tokensPerMinute);
    if (!Number.isFinite(tokensPerMinute) || tokensPerMinute <= 0) {
      return undefined;
    }

    // Token pacing uses a 1-minute burst by default; request bursts are handled separately.
    const refillPerSecond = tokensPerMinute / 60;
    const capacity = tokensPerMinute;
    const now = Date.now();
    const created: TokenRateState = {
      capacity,
      refillPerSecond,
      tokens: capacity,
      updatedAt: now,
    };
    this.tokenRates.set(key, created);
    logger?.child({ module: "rate-limiter" })?.trace?.("Created token rate state", {
      rateLimitKey: key,
      capacity,
      refillPerSecond,
    });
    return created;
  }

  private refillTokenRate(bucket: TokenRateState, now: number): void {
    const elapsedMs = now - bucket.updatedAt;
    if (elapsedMs <= 0) return;
    bucket.updatedAt = now;
    if (bucket.capacity <= 0 || bucket.refillPerSecond <= 0) return;
    const refill = (elapsedMs / 1000) * bucket.refillPerSecond;
    if (refill <= 0) return;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
  }

  private resolveTokenCount(usage: UsageCounters): number {
    const total = Number.isFinite(usage.totalTokens) ? usage.totalTokens : undefined;
    if (total !== undefined) return total;
    const input = Number.isFinite(usage.inputTokens) ? usage.inputTokens : 0;
    const output = Number.isFinite(usage.outputTokens) ? usage.outputTokens : 0;
    return input + output;
  }
}
