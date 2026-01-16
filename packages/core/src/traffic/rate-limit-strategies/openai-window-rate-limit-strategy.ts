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
import { parseRetryAfterMs, readHeaderValue } from "../traffic-error-utils";
import type { RateLimitOptions, TrafficRequestMetadata } from "../traffic-types";
import { DefaultRateLimitStrategy } from "./default-rate-limit-strategy";
import type {
  RateLimitStrategy,
  RateLimitUpdateResult,
  RateLimitUsage,
} from "./rate-limit-strategy";
import { parseResetDurationToMs } from "./rate-limit-utils";

export class OpenAIWindowRateLimitStrategy implements RateLimitStrategy {
  readonly handlesTokenLimits = true;

  private readonly key: string;
  private readonly window: DefaultRateLimitStrategy;
  private readonly windowMs = 60_000;

  private readonly requestsPerMinute?: number;
  private readonly tokensPerMinute?: number;

  private requestState?: RateLimitWindowState;
  private tokenState?: RateLimitWindowState;

  // Used only during bootstrap when headers are not yet known
  private bootstrapReserved = 0;

  constructor(key: string, options?: RateLimitOptions) {
    this.key = key;
    this.window = new DefaultRateLimitStrategy(key);

    // Fixed 60s window; burst size intentionally ignored
    this.requestsPerMinute = this.normalizeLimit(options?.requestsPerMinute);
    this.tokensPerMinute = this.normalizeLimit(options?.tokensPerMinute);
  }

  /**
   * MAIN ENTRYPOINT
   *
   * Order matters:
   * 1. Enforce request-rate window (RPM)
   * 2. Enforce token-rate window (TPM)
   * 3. Otherwise allow
   */
  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    // --- Request window enforcement ---
    if (this.requestsPerMinute !== undefined) {
      const decision = this.resolveRequestWindow(next, logger);
      if (decision) return decision;
    } else {
      // Fallback fixed-window strategy
      const decision = this.window.resolve(next, logger);
      if (decision) return decision;

      // Bootstrap protection: allow exactly one in-flight request
      if (!next.rateLimitKey && this.tokensPerMinute === undefined) {
        const log = logger?.child({ module: "rate-limiter" });

        if (this.bootstrapReserved >= 1) {
          log?.debug?.("OpenAI rate limit bootstrap active; waiting", {
            rateLimitKey: this.key,
            bootstrapReserved: this.bootstrapReserved,
          });
          return { kind: "wait" };
        }

        this.bootstrapReserved += 1;
        next.rateLimitKey = this.key;

        log?.debug?.("OpenAI rate limit bootstrap reserved", {
          rateLimitKey: this.key,
          bootstrapReserved: this.bootstrapReserved,
        });
      }
    }

    // --- Token window enforcement ---
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

      if (state.reserved > 0) state.reserved -= 1;
      state.remaining = Math.max(0, state.remaining - 1);
      return;
    }

    if (this.bootstrapReserved > 0) {
      this.bootstrapReserved -= 1;
    }

    this.window.onComplete(logger);
  }

  /**
   * Records actual token usage after completion
   */
  recordUsage(usage: RateLimitUsage, logger?: Logger, reservedTokens?: number): void {
    const tokens = this.resolveTokenCount(usage);
    if (tokens <= 0) return;

    const now = Date.now();
    const state = this.ensureTokenState(now);
    if (!state) return;

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
    const requestUpdate =
      this.requestsPerMinute !== undefined
        ? undefined
        : this.window.updateFromHeaders(metadata, headers, logger);

    const tokenUpdate = this.applyTokenHeaderUpdates(headers, logger);

    if (!requestUpdate) return tokenUpdate;
    if (!tokenUpdate?.headerSnapshot) return requestUpdate;

    return {
      ...requestUpdate,
      headerSnapshot: {
        ...requestUpdate.headerSnapshot,
        ...tokenUpdate.headerSnapshot,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // REQUEST WINDOW (RPM)
  // ---------------------------------------------------------------------------

  private resolveRequestWindow(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const log = logger?.child({ module: "rate-limiter" });
    const now = Date.now();
    const state = this.ensureRequestState(now);

    const effectiveRemaining = Math.max(0, state.remaining - state.reserved);
    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;

    // Exhaustion handling
    if (effectiveRemaining <= RATE_LIMIT_EXHAUSTION_BUFFER) {
      if (now < probeAt) {
        log?.debug?.("OpenAI request window exhausted; waiting for probe", {
          rateLimitKey: this.key,
          remaining: state.remaining,
          reserved: state.reserved,
          resetAt: state.resetAt,
          probeAt,
        });
        return { kind: "wait", wakeUpAt: probeAt };
      }

      if (state.reserved > 0) {
        log?.debug?.("OpenAI request window exhausted but in-flight reservations exist; waiting", {
          rateLimitKey: this.key,
          remaining: state.remaining,
          reserved: state.reserved,
          resetAt: state.resetAt,
        });
        return { kind: "wait" };
      }
    }

    // Pacing
    if (now < state.nextAllowedAt) {
      const wakeUpAt = Math.min(state.resetAt, state.nextAllowedAt);
      log?.debug?.("OpenAI request pacing; waiting", {
        rateLimitKey: this.key,
        nextAllowedAt: state.nextAllowedAt,
        waitMs: wakeUpAt - now,
      });
      return { kind: "wait", wakeUpAt };
    }

    // Reserve slot
    state.reserved += 1;
    next.rateLimitKey = this.key;

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

  // ---------------------------------------------------------------------------
  // TOKEN WINDOW (TPM)
  // ---------------------------------------------------------------------------

  private resolveTokenWindow(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const log = logger?.child({ module: "rate-limiter" });
    const now = Date.now();
    const state = this.ensureTokenState(now);
    if (!state) return null;

    const estimated = next.estimatedTokens;

    if (typeof estimated === "number" && estimated > 0) {
      if (state.remaining >= estimated) {
        state.remaining -= estimated;
        next.reservedTokens = estimated;
        return null;
      }
    } else if (state.remaining > 0) {
      return null;
    }

    const probeAt = state.resetAt + RATE_LIMIT_PROBE_DELAY_MS;
    log?.debug?.("OpenAI token window exhausted; waiting", {
      rateLimitKey: this.key,
      remaining: state.remaining,
      resetAt: state.resetAt,
      probeAt,
    });

    return { kind: "wait", wakeUpAt: probeAt };
  }

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

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

  private ensureTokenState(now: number): RateLimitWindowState | undefined {
    const configuredLimit = this.tokensPerMinute;
    const state = this.tokenState;

    if (!state) {
      if (configuredLimit === undefined) return undefined;
      this.tokenState = {
        limit: configuredLimit,
        remaining: configuredLimit,
        resetAt: now + this.windowMs,
        reserved: 0,
        nextAllowedAt: now,
      };
      return this.tokenState;
    }

    if (now >= state.resetAt) {
      const limit = configuredLimit ?? state.limit;
      this.tokenState = {
        limit,
        remaining: limit,
        resetAt: now + this.windowMs,
        reserved: 0,
        nextAllowedAt: now,
      };
      return this.tokenState;
    }

    if (configuredLimit !== undefined && configuredLimit !== state.limit) {
      state.limit = configuredLimit;
      state.remaining = Math.min(state.remaining, configuredLimit);
    }

    return state;
  }

  // ---------------------------------------------------------------------------
  // HEADER UPDATES
  // ---------------------------------------------------------------------------

  private applyTokenHeaderUpdates(
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined {
    const log = logger?.child({ module: "rate-limiter" });

    const limitTokens = readHeaderValue(headers, "x-ratelimit-limit-tokens");
    const remainingTokens = readHeaderValue(headers, "x-ratelimit-remaining-tokens");
    const resetTokens = readHeaderValue(headers, "x-ratelimit-reset-tokens");
    const retryAfter = readHeaderValue(headers, "retry-after");

    const limit = Number(limitTokens);
    const remaining = Number(remainingTokens);
    const resetTokensMs = resetTokens ? parseResetDurationToMs(resetTokens) : undefined;
    const retryAfterMs = retryAfter ? parseRetryAfterMs(retryAfter) : undefined;

    if (!Number.isFinite(limit) || !Number.isFinite(remaining) || resetTokensMs === undefined) {
      log?.trace?.("OpenAI token headers missing or invalid; skipping", {
        rateLimitKey: this.key,
      });
      return undefined;
    }

    const now = Date.now();
    const configuredLimit = this.tokensPerMinute;
    const effectiveLimit = configuredLimit === undefined ? limit : Math.min(configuredLimit, limit);

    const clampedRemaining = Math.max(0, Math.min(remaining, effectiveLimit));
    const resetAt = now + resetTokensMs;

    this.tokenState = {
      limit: effectiveLimit,
      remaining: clampedRemaining,
      resetAt,
      reserved: 0,
      nextAllowedAt: now,
    };

    log?.debug?.("OpenAI token headers applied", {
      rateLimitKey: this.key,
      limit: effectiveLimit,
      remaining: clampedRemaining,
      resetAt,
      retryAfterMs,
    });

    return {
      key: this.key,
      headerSnapshot: {
        limitTokens,
        remainingTokens,
        resetTokens,
        resetTokensMs,
        retryAfter,
        retryAfterMs,
      },
      state: this.tokenState,
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private normalizeLimit(value: number | undefined): number | undefined {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  private resolveTokenCount(usage: RateLimitUsage): number {
    const totalTokens = usage.totalTokens;
    if (typeof totalTokens === "number" && Number.isFinite(totalTokens)) {
      return totalTokens;
    }

    const inputTokens = usage.inputTokens;
    const outputTokens = usage.outputTokens;
    const input = typeof inputTokens === "number" && Number.isFinite(inputTokens) ? inputTokens : 0;
    const output =
      typeof outputTokens === "number" && Number.isFinite(outputTokens) ? outputTokens : 0;

    return input + output;
  }
}
