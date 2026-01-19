import type { Logger } from "../../logger";
import { RATE_LIMIT_PROBE_DELAY_MS } from "../traffic-constants";
import type {
  DispatchDecision,
  QueuedRequest,
  RateLimitWindowState,
} from "../traffic-controller-internal";
import { parseRetryAfterMs, readHeaderValue } from "../traffic-error-utils";
import type { RateLimitOptions, TrafficRequestMetadata } from "../traffic-types";
import type {
  RateLimitStrategy,
  RateLimitUpdateResult,
  RateLimitUsage,
} from "./rate-limit-strategy";
import { parseResetDurationToMs } from "./rate-limit-utils";

export class OpenAIWindowRateLimitStrategy implements RateLimitStrategy {
  readonly handlesTokenLimits = true;

  private readonly key: string;
  private readonly windowMs = 60_000;

  private readonly requestsPerMinute?: number;
  private readonly tokensPerMinute?: number;

  private requestState?: RateLimitWindowState;
  private tokenState?: RateLimitWindowState;

  // Used only during bootstrap when headers are not yet known
  private bootstrapReserved = 0;

  constructor(key: string, options?: RateLimitOptions) {
    this.key = key;

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
   * Rate limiting is fully reactive.
   *
   * OpenAI response headers and 429/Retry-After are the sole source of truth.
   * No proactive pacing or smoothing is applied.
   *
   * Behavior:
   * - Requests are allowed immediately while headers report remaining quota.
   * - Requests are blocked only when headers or 429 responses instruct us to wait.
   */
  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const now = Date.now();
    const requestState = this.ensureRequestState(now);
    const tokenState = this.ensureTokenState(now);

    if (!requestState || !tokenState) {
      if (requestState && requestState.remaining <= 0 && now < requestState.resetAt) {
        return { kind: "wait", wakeUpAt: requestState.resetAt };
      }
      if (tokenState && tokenState.remaining <= 0 && now < tokenState.resetAt) {
        return { kind: "wait", wakeUpAt: tokenState.resetAt };
      }

      // Bootstrap after reset: allow a single probe request until headers refresh.
      if (!next.rateLimitKey) {
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

      return null;
    }

    // --- Request window enforcement ---
    if (this.requestsPerMinute !== undefined || this.requestState) {
      const decision = this.resolveRequestWindow(next, logger);
      if (decision) return decision;
    }

    // --- Token window enforcement ---
    const tokenDecision = this.resolveTokenWindow(next, logger);
    if (tokenDecision) return tokenDecision;

    return null;
  }

  // TODO: Can this handle streams?
  onDispatch(_logger?: Logger): void {}

  onComplete(_logger?: Logger): void {
    if (this.requestState) {
      const now = Date.now();
      const state = this.ensureRequestState(now);
      if (!state) return;

      if (state.slotReservedForStream > 0) state.slotReservedForStream -= 1;
      state.remaining = Math.max(0, state.remaining - 1);
      return;
    }

    if (this.bootstrapReserved > 0) {
      this.bootstrapReserved -= 1;
    }
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
    const requestUpdate = this.applyRequestHeaderUpdates(metadata, headers, logger);

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

  /**
   * NOTE FOR MAINTAINERS:
   *
   * This strategy is intentionally reactive-only.
   * Request pacing / smoothing is NOT applied.
   *
   * To add pacing in the future:
   * 1. Compute a pacing timestamp based on:
   *    - remaining requests
   *    - time until resetAt
   * 2. Before allowing a request, block until that timestamp.
   * 3. Ensure pacing is ignored once remaining <= 0 (reset waiting takes priority).
   *
   * Do NOT mix pacing with header parsing.
   * Pacing must act only on already-derived window state.
   */
  private resolveRequestWindow(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const log = logger?.child({ module: "rate-limiter" });
    const now = Date.now();
    const state = this.ensureRequestState(now);
    if (!state) return null;

    const reserved = state.slotReservedForStream;
    const effectiveRemaining = Math.max(0, state.remaining - reserved);

    if (effectiveRemaining <= 0 && now < state.resetAt) {
      log?.debug?.("OpenAI request window exhausted; waiting for reset", {
        rateLimitKey: this.key,
        remaining: state.remaining,
        reserved,
        resetAt: state.resetAt,
      });
      return { kind: "wait", wakeUpAt: state.resetAt };
    }

    state.slotReservedForStream += 1;
    next.rateLimitKey = this.key;
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

  private ensureRequestState(now: number): RateLimitWindowState | undefined {
    const configuredLimit = this.requestsPerMinute;
    const state = this.requestState;

    if (!state) return undefined;

    if (now >= state.resetAt) {
      this.requestState = undefined; // After reset, discard state and re-bootstrap.
      return undefined;
    }

    if (configuredLimit !== undefined && configuredLimit !== state.limit) {
      state.limit = configuredLimit;
      state.remaining = Math.min(state.remaining, configuredLimit);
    }

    return state;
  }

  private ensureTokenState(now: number): RateLimitWindowState | undefined {
    const configuredLimit = this.tokensPerMinute;
    const state = this.tokenState;

    if (!state) return undefined;

    if (now >= state.resetAt) {
      this.tokenState = undefined; // After reset, discard state and re-bootstrap.
      return undefined;
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
      slotReservedForStream: 0,
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

  private applyRequestHeaderUpdates(
    metadata: TrafficRequestMetadata | undefined,
    headers: unknown,
    logger?: Logger,
  ): RateLimitUpdateResult | undefined {
    void metadata;
    const log = logger?.child({ module: "rate-limiter" });
    const limitRequests = readHeaderValue(headers, "x-ratelimit-limit-requests");
    const remainingRequests = readHeaderValue(headers, "x-ratelimit-remaining-requests");
    const resetRequests = readHeaderValue(headers, "x-ratelimit-reset-requests");
    const retryAfter = readHeaderValue(headers, "retry-after");
    const retryAfterMs = retryAfter ? parseRetryAfterMs(retryAfter) : undefined;

    const now = Date.now();
    const existing = this.requestState;
    const configuredLimit = this.requestsPerMinute;
    let state: RateLimitWindowState | undefined;
    let headerSnapshot: {
      limitRequests?: string;
      remainingRequests?: string;
      resetRequests?: string;
      resetRequestsMs?: number;
      retryAfter?: string;
      retryAfterMs?: number;
    } = {};

    if (limitRequests && remainingRequests && resetRequests) {
      const limit = Number(limitRequests);
      const remaining = Number(remainingRequests);
      if (!Number.isFinite(limit) || !Number.isFinite(remaining)) {
        log?.debug?.("Invalid OpenAI request limit headers; skipping", {
          rateLimitKey: this.key,
          limitRequests,
          remainingRequests,
        });
        return undefined;
      }

      const resetRequestsMs = parseResetDurationToMs(resetRequests);
      if (resetRequestsMs === undefined) {
        log?.debug?.("Unable to parse request reset duration; skipping", {
          rateLimitKey: this.key,
          resetRequests,
        });
        return undefined;
      }

      const effectiveLimit =
        configuredLimit === undefined ? limit : Math.min(configuredLimit, limit);
      const clampedRemaining = Math.max(0, Math.min(remaining, effectiveLimit));
      const resetAt = now + resetRequestsMs;
      const reserved = Math.max(0, existing?.slotReservedForStream ?? 0);

      state = {
        limit: effectiveLimit,
        remaining: clampedRemaining,
        resetAt,
        slotReservedForStream: reserved,
        nextAllowedAt: now,
      };
      headerSnapshot = {
        limitRequests,
        remainingRequests,
        resetRequests,
        resetRequestsMs,
      };
    } else if (retryAfterMs === undefined) {
      log?.trace?.("OpenAI request headers missing or invalid; skipping", {
        rateLimitKey: this.key,
        hasLimit: !!limitRequests,
        hasRemaining: !!remainingRequests,
        hasReset: !!resetRequests,
        hasRetryAfter: !!retryAfter,
      });
      return undefined;
    }

    if (!state) {
      if (retryAfterMs === undefined) return undefined;
      const targetAt = now + retryAfterMs;
      const limit = configuredLimit ?? existing?.limit ?? 1;
      state = {
        limit,
        remaining: 0,
        resetAt: Math.max(existing?.resetAt ?? targetAt, targetAt),
        slotReservedForStream: Math.max(0, existing?.slotReservedForStream ?? 0),
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

    this.requestState = state;

    log?.debug?.("OpenAI request headers applied", {
      rateLimitKey: this.key,
      limit: state.limit,
      remaining: state.remaining,
      resetAt: state.resetAt,
      retryAfterMs: headerSnapshot.retryAfterMs,
    });

    return {
      key: this.key,
      headerSnapshot,
      state,
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
