import type { Logger } from "../../logger";
import {
  RATE_LIMIT_EXHAUSTION_BUFFER,
  RATE_LIMIT_MIN_PACE_INTERVAL_MS,
  RATE_LIMIT_NEXT_ALLOWED_UPDATE_THRESHOLD_MS,
  RATE_LIMIT_PROBE_DELAY_MS,
} from "../traffic-constants";
import type {
  DispatchDecision,
  QueuedRequest,
  RateLimitWindowState,
} from "../traffic-controller-internal";
import type { RateLimitOptions, TrafficRequestMetadata } from "../traffic-types";
import { DefaultRateLimitStrategy } from "./default-rate-limit-strategy";
import type {
  RateLimitStrategy,
  RateLimitUpdateResult,
  RateLimitUsage,
} from "./rate-limit-strategy";

export class OpenAIWindowRateLimitStrategy implements RateLimitStrategy {
  readonly handlesTokenLimits: boolean;
  private readonly window: DefaultRateLimitStrategy;
  private readonly key: string;
  private readonly requestsPerMinute?: number;
  private readonly tokensPerMinute?: number;
  private requestState?: RateLimitWindowState;
  private tokenState?: RateLimitWindowState;
  private bootstrapReserved = 0;
  private readonly windowMs = 60_000;

  constructor(key: string, options?: RateLimitOptions) {
    this.key = key;
    this.window = new DefaultRateLimitStrategy(key);
    // Window strategy enforces fixed 60s windows; burstSize is intentionally ignored here.
    this.requestsPerMinute = this.normalizeLimit(options?.requestsPerMinute);
    this.tokensPerMinute = this.normalizeLimit(options?.tokensPerMinute);
    this.handlesTokenLimits = this.tokensPerMinute !== undefined;
  }

  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    if (this.requestsPerMinute !== undefined) {
      const requestDecision = this.resolveRequestWindow(next, logger);
      if (requestDecision) return requestDecision;
    } else {
      const decision = this.window.resolve(next, logger);
      if (decision) return decision;

      if (!next.rateLimitKey && this.tokensPerMinute === undefined) {
        const rateLimitLogger = logger?.child({ module: "rate-limiter" });
        if (this.bootstrapReserved >= 1) {
          rateLimitLogger?.debug?.("OpenAI rate limit bootstrap active; waiting", {
            rateLimitKey: this.key,
            bootstrapReserved: this.bootstrapReserved,
          });
          return { kind: "wait" };
        }

        this.bootstrapReserved += 1;
        next.rateLimitKey = this.key;
        rateLimitLogger?.debug?.("OpenAI rate limit bootstrap reserved", {
          rateLimitKey: this.key,
          bootstrapReserved: this.bootstrapReserved,
        });
      }
    }

    const tokenDecision = this.resolveTokenWindow(next, logger);
    if (tokenDecision) return tokenDecision;
    return null;
  }

  onDispatch(logger?: Logger): void {
    if (this.requestsPerMinute === undefined) {
      this.window.onDispatch(logger);
    }
  }

  onComplete(logger?: Logger): void {
    if (this.requestsPerMinute !== undefined) {
      const now = Date.now();
      const state = this.ensureRequestState(now);
      if (state.reserved > 0) {
        state.reserved -= 1;
      }
      state.remaining = Math.max(0, state.remaining - 1);
      return;
    }

    if (this.bootstrapReserved > 0) {
      this.bootstrapReserved -= 1;
    }
    this.window.onComplete(logger);
  }

  recordUsage(usage: RateLimitUsage, logger?: Logger, reservedTokens?: number): void {
    if (this.tokensPerMinute === undefined) return;
    const tokens = this.resolveTokenCount(usage);
    if (tokens <= 0) return;

    const now = Date.now();
    const state = this.ensureTokenState(now);
    const reserved = typeof reservedTokens === "number" ? reservedTokens : 0;
    const delta = tokens - reserved;
    if (delta > 0) {
      state.remaining = Math.max(0, state.remaining - delta);
    } else if (delta < 0) {
      state.remaining = Math.min(state.limit, state.remaining + Math.abs(delta));
    }
    logger?.child({ module: "rate-limiter" })?.trace?.("OpenAI token usage recorded", {
      rateLimitKey: this.key,
      tokens,
      remaining: state.remaining,
      resetAt: state.resetAt,
    });
  }

  updateFromHeaders(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined {
    if (this.requestsPerMinute !== undefined) {
      return undefined;
    }
    return this.window.updateFromHeaders(metadata, headers, logger);
  }

  private resolveRequestWindow(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const now = Date.now();
    const state = this.ensureRequestState(now);
    const effectiveRemaining = Math.max(0, state.remaining - state.reserved);
    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;

    if (effectiveRemaining <= RATE_LIMIT_EXHAUSTION_BUFFER) {
      if (now < probeAt) {
        rateLimitLogger?.debug?.("OpenAI request window exhausted; waiting for probe", {
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
        rateLimitLogger?.debug?.(
          "OpenAI request window exhausted but in-flight reservations exist; waiting",
          {
            rateLimitKey: this.key,
            remaining: state.remaining,
            reserved: state.reserved,
            effectiveRemaining,
            resetAt: state.resetAt,
          },
        );
        return { kind: "wait" };
      }
    }

    if (now < state.nextAllowedAt) {
      rateLimitLogger?.debug?.("OpenAI request window pacing; waiting until nextAllowedAt", {
        rateLimitKey: this.key,
        nextAllowedAt: state.nextAllowedAt,
        resetAt: state.resetAt,
        waitMs: Math.min(state.resetAt, state.nextAllowedAt) - now,
      });
      return { kind: "wait", wakeUpAt: Math.min(state.resetAt, state.nextAllowedAt) };
    }

    state.reserved += 1;
    next.rateLimitKey = this.key;
    rateLimitLogger?.trace?.("Reserved OpenAI request window slot", {
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
      rateLimitLogger?.trace?.("Updated OpenAI request pacing nextAllowedAt", {
        rateLimitKey: this.key,
        nextAllowedAt: state.nextAllowedAt,
        intervalMs,
        remainingWindowMs,
        effectiveRemaining,
      });
    }

    return null;
  }

  private resolveTokenWindow(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    if (this.tokensPerMinute === undefined) return null;
    const rateLimitLogger = logger?.child({ module: "rate-limiter" });
    const now = Date.now();
    const state = this.ensureTokenState(now);
    const estimatedTokens = next.estimatedTokens;

    if (typeof estimatedTokens === "number" && estimatedTokens > 0) {
      if (state.remaining >= estimatedTokens) {
        state.remaining = Math.max(0, state.remaining - estimatedTokens);
        next.reservedTokens = estimatedTokens;
        return null;
      }
    } else if (state.remaining > 0) {
      return null;
    }

    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;
    rateLimitLogger?.debug?.("OpenAI token window exhausted; waiting", {
      rateLimitKey: this.key,
      remaining: state.remaining,
      resetAt: state.resetAt,
      probeAt,
    });
    return { kind: "wait", wakeUpAt: probeAt };
  }

  private ensureRequestState(now: number): RateLimitWindowState {
    const limit = this.requestsPerMinute ?? 0;
    const state = this.requestState;
    if (!state || now >= state.resetAt) {
      this.requestState = {
        limit,
        remaining: limit,
        resetAt: now + this.windowMs,
        reserved: 0,
        nextAllowedAt: now,
      };
      return this.requestState;
    }
    return state;
  }

  private ensureTokenState(now: number): RateLimitWindowState {
    const limit = this.tokensPerMinute ?? 0;
    const state = this.tokenState;
    if (!state || now >= state.resetAt) {
      this.tokenState = {
        limit,
        remaining: limit,
        resetAt: now + this.windowMs,
        reserved: 0,
        nextAllowedAt: now,
      };
      return this.tokenState;
    }
    return state;
  }

  private normalizeLimit(value: number | undefined): number | undefined {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  private resolveTokenCount(usage: RateLimitUsage): number {
    const total = Number.isFinite(usage.totalTokens) ? usage.totalTokens : undefined;
    if (total !== undefined) return total;
    const input = Number.isFinite(usage.inputTokens) ? usage.inputTokens : 0;
    const output = Number.isFinite(usage.outputTokens) ? usage.outputTokens : 0;
    return input + output;
  }
}
