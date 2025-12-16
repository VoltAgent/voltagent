import type { Logger } from "../../logger";
import type {
  DispatchDecision,
  QueuedRequest,
  RateLimitWindowState,
} from "../traffic-controller-internal";
import { parseRetryAfterMs, readHeaderValue } from "../traffic-error-utils";
import type { RateLimitOptions, TrafficRequestMetadata } from "../traffic-types";
import type {
  RateLimitHeaderSnapshot,
  RateLimitStrategy,
  RateLimitUpdateResult,
} from "./rate-limit-strategy";
import { parseResetDurationToMs } from "./rate-limit-utils";

type TokenBucketState = {
  capacity: number;
  refillPerSecond: number;
  tokens: number;
  updatedAt: number;
};

function normalizeTokenBucketOptions(
  raw: RateLimitOptions | undefined,
): Omit<TokenBucketState, "tokens" | "updatedAt"> {
  const capacityRaw = raw?.capacity;
  const refillRaw = raw?.refillPerSecond;

  const capacity = typeof capacityRaw === "number" ? capacityRaw : Number(capacityRaw);
  const refillPerSecond = typeof refillRaw === "number" ? refillRaw : Number(refillRaw);

  const safeCapacity = Number.isFinite(capacity) ? capacity : 0;
  const safeRefill = Number.isFinite(refillPerSecond) ? refillPerSecond : 0;

  return {
    capacity: safeCapacity > 0 ? Math.max(1, safeCapacity) : 0,
    refillPerSecond: safeRefill > 0 ? safeRefill : 0,
  };
}
function refillTokenBucket(bucket: TokenBucketState, now: number): void {
  const elapsedMs = now - bucket.updatedAt;
  if (elapsedMs <= 0) return;
  bucket.updatedAt = now;
  if (bucket.capacity <= 0 || bucket.refillPerSecond <= 0) return;

  const refill = (elapsedMs / 1000) * bucket.refillPerSecond;
  if (refill <= 0) return;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
}

export class TokenBucketRateLimitStrategy implements RateLimitStrategy {
  private readonly key: string;
  private bucket?: TokenBucketState;
  private cooldownUntil?: number;

  constructor(key: string, options?: RateLimitOptions) {
    this.key = key;
    if (!options) return;
    const normalized = normalizeTokenBucketOptions(options);
    const now = Date.now();
    this.bucket = {
      ...normalized,
      tokens: normalized.capacity,
      updatedAt: now,
    };
  }

  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const now = Date.now();

    if (this.cooldownUntil !== undefined && now < this.cooldownUntil) {
      rateLimitLogger?.debug?.("Token bucket cooldown active; waiting", {
        rateLimitKey: this.key,
        cooldownUntil: this.cooldownUntil,
        waitMs: this.cooldownUntil - now,
      });
      return { kind: "wait", wakeUpAt: this.cooldownUntil };
    }

    const bucket = this.bucket;
    if (!bucket) return null;

    refillTokenBucket(bucket, now);

    if (bucket.capacity <= 0) {
      rateLimitLogger?.debug?.("Token bucket misconfigured; blocking", {
        rateLimitKey: this.key,
        capacity: bucket.capacity,
        refillPerSecond: bucket.refillPerSecond,
      });
      return { kind: "wait" };
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      next.rateLimitKey = this.key;
      rateLimitLogger?.trace?.("Consumed token bucket token", {
        rateLimitKey: this.key,
        tokens: bucket.tokens,
        capacity: bucket.capacity,
        refillPerSecond: bucket.refillPerSecond,
      });
      return null;
    }

    if (bucket.refillPerSecond <= 0) {
      rateLimitLogger?.debug?.("Token bucket has no refill; blocking", {
        rateLimitKey: this.key,
        capacity: bucket.capacity,
        refillPerSecond: bucket.refillPerSecond,
      });
      return { kind: "wait" };
    }

    const requiredTokens = 1 - bucket.tokens;
    const waitMs = Math.max(1, Math.ceil((requiredTokens / bucket.refillPerSecond) * 1000));
    const wakeUpAt = now + waitMs;
    rateLimitLogger?.debug?.("Token bucket empty; waiting", {
      rateLimitKey: this.key,
      tokens: bucket.tokens,
      capacity: bucket.capacity,
      refillPerSecond: bucket.refillPerSecond,
      wakeUpAt,
      waitMs,
    });
    return { kind: "wait", wakeUpAt };
  }

  onDispatch(_logger?: Logger): void {}

  onComplete(_logger?: Logger): void {}

  updateFromHeaders(
    _metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined {
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const now = Date.now();

    const retryAfter = readHeaderValue(headers, "retry-after");
    const retryAfterMs = retryAfter ? parseRetryAfterMs(retryAfter, now) : undefined;

    const remainingRequests = readHeaderValue(headers, "x-ratelimit-remaining-requests");
    const resetRequests = readHeaderValue(headers, "x-ratelimit-reset-requests");
    const resetRequestsMs = resetRequests ? parseResetDurationToMs(resetRequests) : undefined;

    let appliedUntil: number | undefined;

    if (retryAfterMs !== undefined) {
      const targetAt = now + retryAfterMs;
      this.cooldownUntil =
        this.cooldownUntil === undefined ? targetAt : Math.max(this.cooldownUntil, targetAt);
      appliedUntil = this.cooldownUntil;
    }

    if (remainingRequests && resetRequestsMs !== undefined) {
      const remaining = Number(remainingRequests);
      if (Number.isFinite(remaining) && remaining <= 0) {
        const targetAt = now + resetRequestsMs;
        this.cooldownUntil =
          this.cooldownUntil === undefined ? targetAt : Math.max(this.cooldownUntil, targetAt);
        appliedUntil = this.cooldownUntil;
      }
    }

    if (appliedUntil === undefined) {
      rateLimitLogger?.trace?.("No applicable cooldown headers; skipping", {
        rateLimitKey: this.key,
        hasRetryAfter: !!retryAfter,
        hasRemainingRequests: !!remainingRequests,
        hasResetRequests: !!resetRequests,
      });
      return undefined;
    }

    rateLimitLogger?.debug?.("Applied token bucket cooldown from headers", {
      rateLimitKey: this.key,
      cooldownUntil: appliedUntil,
      inMs: Math.max(0, appliedUntil - now),
      retryAfterMs,
      resetRequestsMs,
    });

    const headerSnapshot: RateLimitHeaderSnapshot = {
      remainingRequests,
      resetRequests,
      resetRequestsMs,
      retryAfter,
      retryAfterMs,
    };

    const state: RateLimitWindowState = {
      limit: 1,
      remaining: 0,
      resetAt: appliedUntil,
      reserved: 0,
      nextAllowedAt: appliedUntil,
    };

    return {
      key: this.key,
      headerSnapshot,
      state,
    };
  }
}
