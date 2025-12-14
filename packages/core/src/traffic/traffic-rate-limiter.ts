import type { Logger } from "../logger";
import {
  RATE_LIMIT_EXHAUSTION_BUFFER,
  RATE_LIMIT_MIN_PACE_INTERVAL_MS,
  RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS,
  RATE_LIMIT_PROBE_DELAY_MS,
} from "./traffic-constants";
import type {
  DispatchDecision,
  QueuedRequest,
  RateLimitWindowState,
} from "./traffic-controller-internal";
import { parseRetryAfterMs, readHeaderValue } from "./traffic-error-utils";
import type { TrafficRequestMetadata } from "./traffic-types";

export type RateLimitHeaderSnapshot = {
  limitRequests?: string;
  remainingRequests?: string;
  resetRequests?: string;
  resetRequestsMs?: number;
  retryAfter?: string;
  retryAfterMs?: number;
};

export type RateLimitUpdateResult = {
  key: string;
  headerSnapshot: RateLimitHeaderSnapshot;
  state: RateLimitWindowState;
};

type SchedulerCallback = () => void;

export interface RateLimitStrategy {
  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null;
  onDispatch(logger?: Logger): void;
  onComplete(logger?: Logger): void;
  updateFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined;
}

function parseResetDurationToMs(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  let totalMs = 0;
  const regex = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/g;
  let matched = false;
  for (const match of value.matchAll(regex)) {
    matched = true;
    const amount = Number.parseFloat(match[1] ?? "");
    if (!Number.isFinite(amount)) continue;
    const unit = match[2];
    if (unit === "ms") totalMs += amount;
    else if (unit === "s") totalMs += amount * 1000;
    else if (unit === "m") totalMs += amount * 60_000;
    else if (unit === "h") totalMs += amount * 3_600_000;
    else if (unit === "d") totalMs += amount * 86_400_000;
  }

  if (matched) {
    return Math.round(totalMs);
  }

  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export class DefaultRateLimitStrategy implements RateLimitStrategy {
  private state?: RateLimitWindowState;
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const state = this.state;
    if (!state) {
      rateLimitLogger?.trace?.("Rate limit state missing; allow request", {
        rateLimitKey: this.key,
      });
      return null;
    }

    const now = Date.now();
    const effectiveRemaining = Math.max(0, state.remaining - state.reserved);
    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;

    if (effectiveRemaining <= RATE_LIMIT_EXHAUSTION_BUFFER) {
      if (now < probeAt) {
        rateLimitLogger?.debug?.("Rate limit exhausted; waiting for probe", {
          rateLimitKey: this.key,
          remaining: state.remaining,
          reserved: state.reserved,
          effectiveRemaining,
          resetAt: state.resetAt,
          probeAt,
        });
        return { kind: "wait", wakeUpAt: probeAt };
      }
      if (state.reserved > 0) {
        rateLimitLogger?.debug?.("Rate limit exhausted but in-flight reservations exist; waiting", {
          rateLimitKey: this.key,
          remaining: state.remaining,
          reserved: state.reserved,
          effectiveRemaining,
          resetAt: state.resetAt,
        });
        return { kind: "wait" };
      }
    }

    if (now < state.nextAllowedAt) {
      rateLimitLogger?.debug?.("Rate limit pacing; waiting until nextAllowedAt", {
        rateLimitKey: this.key,
        nextAllowedAt: state.nextAllowedAt,
        resetAt: state.resetAt,
        waitMs: Math.min(state.resetAt, state.nextAllowedAt) - now,
      });
      return { kind: "wait", wakeUpAt: Math.min(state.resetAt, state.nextAllowedAt) };
    }

    state.reserved += 1;
    next.rateLimitKey = this.key;
    rateLimitLogger?.trace?.("Reserved rate limit token", {
      rateLimitKey: this.key,
      reserved: state.reserved,
      remaining: state.remaining,
      resetAt: state.resetAt,
      nextAllowedAt: state.nextAllowedAt,
    });

    const remainingWindowMs = Math.max(0, state.resetAt - now);
    const intervalMs = Math.max(
      RATE_LIMIT_MIN_PACE_INTERVAL_MS,
      Math.ceil(remainingWindowMs / Math.max(effectiveRemaining, 1)),
    );

    const candidateNext = Math.max(state.nextAllowedAt, now + intervalMs);
    if (
      state.nextAllowedAt <= now ||
      candidateNext >= state.nextAllowedAt + RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS
    ) {
      state.nextAllowedAt = candidateNext;
      rateLimitLogger?.trace?.("Updated pacing nextAllowedAt", {
        rateLimitKey: this.key,
        nextAllowedAt: state.nextAllowedAt,
        intervalMs,
        remainingWindowMs,
        effectiveRemaining,
      });
    }

    return null;
  }

  onDispatch(_logger?: Logger): void {}

  onComplete(logger?: Logger): void {
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const state = this.state;
    if (!state || state.reserved <= 0) return;
    state.reserved -= 1;
    rateLimitLogger?.trace?.("Released rate limit reservation", {
      rateLimitKey: this.key,
      reserved: state.reserved,
      remaining: state.remaining,
      resetAt: state.resetAt,
      nextAllowedAt: state.nextAllowedAt,
    });
  }

  updateFromHeaders(
    _metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined {
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const limitRequests = readHeaderValue(headers, "x-ratelimit-limit-requests");
    const remainingRequests = readHeaderValue(headers, "x-ratelimit-remaining-requests");
    const resetRequests = readHeaderValue(headers, "x-ratelimit-reset-requests");
    const retryAfter = readHeaderValue(headers, "retry-after");
    const retryAfterMs = retryAfter ? parseRetryAfterMs(retryAfter) : undefined;

    const now = Date.now();
    const existing = this.state;
    let state: RateLimitWindowState | undefined;
    let headerSnapshot: RateLimitHeaderSnapshot | undefined;

    if (limitRequests && remainingRequests && resetRequests) {
      const limit = Number(limitRequests);
      const remaining = Number(remainingRequests);
      if (!Number.isFinite(limit) || !Number.isFinite(remaining)) {
        rateLimitLogger?.debug?.("Invalid rate limit numeric headers; skipping", {
          rateLimitKey: this.key,
          limitRequests,
          remainingRequests,
        });
        return undefined;
      }

      const resetRequestsMs = parseResetDurationToMs(resetRequests);
      if (resetRequestsMs === undefined) {
        rateLimitLogger?.debug?.("Unable to parse reset duration; skipping", {
          rateLimitKey: this.key,
          resetRequests,
        });
        return undefined;
      }

      const parsedResetAt = now + resetRequestsMs;
      const isSameWindow = !!existing && now < existing.resetAt;
      const resetAt = isSameWindow ? Math.max(existing.resetAt, parsedResetAt) : parsedResetAt;
      const nextAllowedAt = isSameWindow ? Math.max(existing.nextAllowedAt, now) : now;
      const reserved = Math.max(0, existing?.reserved ?? 0);

      state = {
        limit,
        remaining: isSameWindow ? Math.min(existing.remaining, remaining) : remaining,
        resetAt,
        reserved,
        nextAllowedAt,
      };
      headerSnapshot = {
        limitRequests,
        remainingRequests,
        resetRequests,
        resetRequestsMs,
      };
    } else if (retryAfterMs === undefined) {
      rateLimitLogger?.trace?.("Missing rate limit headers; skipping", {
        rateLimitKey: this.key,
        hasLimit: !!limitRequests,
        hasRemaining: !!remainingRequests,
        hasReset: !!resetRequests,
        hasRetryAfter: !!retryAfter,
      });
      return undefined;
    }

    if (!state) {
      if (retryAfterMs === undefined) {
        rateLimitLogger?.trace?.("Retry-After missing or unparsable; skipping", {
          rateLimitKey: this.key,
          retryAfter,
        });
        return undefined;
      }
      const targetAt = now + retryAfterMs;
      const isSameWindow = !!existing && now < existing.resetAt;
      state = {
        limit: existing?.limit ?? 1,
        remaining: 0,
        resetAt: isSameWindow ? Math.max(existing.resetAt, targetAt) : targetAt,
        reserved: Math.max(0, existing?.reserved ?? 0),
        nextAllowedAt: Math.max(existing?.nextAllowedAt ?? now, targetAt),
      };
      headerSnapshot = { retryAfter, retryAfterMs };
    } else if (retryAfterMs !== undefined) {
      const targetAt = now + retryAfterMs;
      state = {
        ...state,
        remaining: 0,
        resetAt: Math.max(state.resetAt, targetAt),
        nextAllowedAt: Math.max(state.nextAllowedAt, targetAt),
      };
      headerSnapshot = { ...headerSnapshot, retryAfter, retryAfterMs };
    }

    this.state = state;
    rateLimitLogger?.debug?.("Applied rate limit headers to state", {
      rateLimitKey: this.key,
      limit: state.limit,
      remaining: state.remaining,
      effectiveRemaining: Math.max(0, state.remaining - state.reserved),
      resetAt: state.resetAt,
      nextAllowedAt: state.nextAllowedAt,
      resetRequestsMs: headerSnapshot?.resetRequestsMs,
      retryAfterMs: headerSnapshot?.retryAfterMs,
    });

    return {
      key: this.key,
      headerSnapshot: headerSnapshot ?? {},
      state,
    };
  }
}

export type RateLimitStrategyFactory = (key: string) => RateLimitStrategy;

export class TrafficRateLimiter {
  private readonly strategies = new Map<string, RateLimitStrategy>();
  private wakeUpTimeout?: ReturnType<typeof setTimeout>;
  private wakeUpAt?: number;
  private readonly onWakeUp: SchedulerCallback;
  private readonly strategyFactory: RateLimitStrategyFactory;

  constructor(onWakeUp: SchedulerCallback, strategyFactory?: RateLimitStrategyFactory) {
    this.onWakeUp = onWakeUp;
    this.strategyFactory = strategyFactory ?? ((key) => new DefaultRateLimitStrategy(key));
  }

  resolve(next: QueuedRequest, key: string, logger?: Logger): DispatchDecision | null {
    const strategy = this.strategies.get(key);
    if (!strategy) {
      logger
        ?.child({ module: "rate-limiter" })
        ?.trace?.("Rate limit state missing; allow request", { rateLimitKey: key });
      return null;
    }
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
}
