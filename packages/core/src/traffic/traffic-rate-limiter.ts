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
import type { TrafficRequestMetadata } from "./traffic-types";

export type RateLimitHeaderSnapshot = {
  limitRequests: string;
  remainingRequests: string;
  resetRequests: string;
  resetRequestsMs: number;
};

export type RateLimitUpdateResult = {
  key: string;
  headerSnapshot: RateLimitHeaderSnapshot;
  state: RateLimitWindowState;
};

type SchedulerCallback = () => void;

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers) return undefined;

  if (typeof (headers as { get?: unknown }).get === "function") {
    const v = (headers as { get: (name: string) => unknown }).get(name);
    return v === null || v === undefined ? undefined : String(v);
  }

  if (typeof headers !== "object") return undefined;

  const entries = Object.entries(headers as Record<string, unknown>);
  const target = name.toLowerCase();
  const match = entries.find(([k]) => String(k).toLowerCase() === target);
  if (!match) return undefined;

  const value = match[1];
  if (Array.isArray(value)) {
    const first = value[0];
    return first === null || first === undefined ? undefined : String(first);
  }
  return value === null || value === undefined ? undefined : String(value);
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

export class TrafficRateLimiter {
  private readonly rateLimitStates = new Map<string, RateLimitWindowState>();
  private wakeUpTimeout?: ReturnType<typeof setTimeout>;
  private wakeUpAt?: number;
  private readonly onWakeUp: SchedulerCallback;

  constructor(onWakeUp: SchedulerCallback) {
    this.onWakeUp = onWakeUp;
  }

  resolve(next: QueuedRequest, key: string): DispatchDecision | null {
    const state = this.rateLimitStates.get(key);
    if (!state) return null;

    const now = Date.now();
    const effectiveRemaining = Math.max(0, state.remaining - state.reserved);
    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;

    if (effectiveRemaining <= RATE_LIMIT_EXHAUSTION_BUFFER) {
      if (now < probeAt) {
        return { kind: "wait", wakeUpAt: probeAt };
      }
      if (state.reserved > 0) {
        return { kind: "wait" };
      }
    }

    if (now < state.nextAllowedAt) {
      return { kind: "wait", wakeUpAt: Math.min(state.resetAt, state.nextAllowedAt) };
    }

    state.reserved += 1;
    next.rateLimitKey = key;

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
    }

    return null;
  }

  scheduleWakeUpAt(wakeUpAt: number): void {
    const now = Date.now();
    const target = Math.max(now, wakeUpAt);

    if (this.wakeUpTimeout && this.wakeUpAt !== undefined && this.wakeUpAt <= target) {
      return;
    }

    if (this.wakeUpTimeout) clearTimeout(this.wakeUpTimeout);

    this.wakeUpAt = target;
    this.wakeUpTimeout = setTimeout(
      () => {
        this.wakeUpTimeout = undefined;
        this.wakeUpAt = undefined;
        this.onWakeUp();
      },
      Math.max(1, target - now),
    );
  }

  releaseReservation(key?: string): void {
    if (!key) return;
    const state = this.rateLimitStates.get(key);
    if (!state || state.reserved <= 0) return;
    state.reserved -= 1;
  }

  updateFromHeaders(
    _metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    key: string,
  ): RateLimitUpdateResult | undefined {
    const limitRequests = readHeader(headers, "x-ratelimit-limit-requests");
    const remainingRequests = readHeader(headers, "x-ratelimit-remaining-requests");
    const resetRequests = readHeader(headers, "x-ratelimit-reset-requests");

    if (!limitRequests || !remainingRequests || !resetRequests) return undefined;

    const limit = Number(limitRequests);
    const remaining = Number(remainingRequests);
    if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return undefined;

    const resetRequestsMs = parseResetDurationToMs(resetRequests);
    if (resetRequestsMs === undefined) return undefined;

    const now = Date.now();
    const parsedResetAt = now + resetRequestsMs;

    const existing = this.rateLimitStates.get(key);
    const isSameWindow = !!existing && now < existing.resetAt;
    const resetAt = isSameWindow ? Math.max(existing.resetAt, parsedResetAt) : parsedResetAt;
    const nextAllowedAt = isSameWindow ? Math.max(existing.nextAllowedAt, now) : now;
    const reserved = Math.max(0, existing?.reserved ?? 0);

    const state: RateLimitWindowState = {
      limit,
      remaining: isSameWindow ? Math.min(existing.remaining, remaining) : remaining,
      resetAt,
      reserved,
      nextAllowedAt,
    };

    this.rateLimitStates.set(key, state);

    return {
      key,
      headerSnapshot: {
        limitRequests,
        remainingRequests,
        resetRequests,
        resetRequestsMs,
      },
      state,
    };
  }
}
