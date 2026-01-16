import type { Logger } from "../logger";
import type { DispatchDecision, QueuedRequest } from "./traffic-controller-internal";
import type { AdaptiveLimiterConfig, TrafficRequestMetadata } from "./traffic-types";

/**
 * Per-key adaptive throttling state.
 *
 * This state answers:
 * - How many recent 429s have we seen?
 * - How long should we slow down future requests?
 * - Until when are we in cooldown?
 */
type AdaptiveLimiterState = {
  /** Timestamps of recent 429 responses (ms since epoch) */
  recent429s: number[];

  /** Current penalty delay applied after threshold breach */
  penaltyMs: number;

  /** If set, requests must wait until this timestamp */
  cooldownUntil?: number;

  /** Last time we observed a 429 (used for decay logic) */
  last429At?: number;
};

/**
 * Default tuning values.
 * These are conservative and provider-agnostic.
 */
const DEFAULT_ADAPTIVE_LIMITER: Required<AdaptiveLimiterConfig> = {
  windowMs: 30_000, // Lookback window for counting 429s
  threshold: 3, // Number of 429s before penalizing
  minPenaltyMs: 500, // Initial slowdown
  maxPenaltyMs: 10_000, // Hard cap on slowdown
  penaltyMultiplier: 2, // Exponential backoff factor
  decayMs: 10_000, // Time without 429s before reducing penalty
};

export class TrafficAdaptiveLimiter {
  private readonly config: Required<AdaptiveLimiterConfig>;

  /**
   * Key → adaptive throttling state
   */
  private readonly state = new Map<string, AdaptiveLimiterState>();

  /**
   * Builds provider/model key from request metadata
   */
  private readonly buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;

  constructor(options: {
    adaptiveLimiter?: AdaptiveLimiterConfig;
    buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;
  }) {
    // Merge defaults with user overrides
    this.config = {
      ...DEFAULT_ADAPTIVE_LIMITER,
      ...(options.adaptiveLimiter ?? {}),
    };

    this.buildRateLimitKey = options.buildRateLimitKey;
  }

  /**
   * Decide whether the next request must wait due to adaptive throttling.
   *
   * This is called BEFORE dispatch.
   */
  resolve(next: QueuedRequest, now: number): DispatchDecision | null {
    const key = this.buildAdaptiveKey(next.request.metadata, next.tenantId, next.rateLimitKey);

    const state = this.state.get(key);
    if (!state) {
      // No prior rate-limit history → allow immediately
      return null;
    }

    // Gradually reduce penalty if no recent 429s
    this.applyPenaltyDecay(state, now);

    // If still in cooldown, instruct scheduler to wait
    if (state.cooldownUntil !== undefined && now < state.cooldownUntil) {
      return {
        kind: "wait",
        wakeUpAt: state.cooldownUntil,
      };
    }

    return null;
  }

  /**
   * Record that a request hit a rate limit (HTTP 429).
   *
   * This:
   * - Tracks recent 429s
   * - Escalates penalty if threshold is exceeded
   * - Respects Retry-After if provided
   */
  recordRateLimitHit(options: {
    metadata: TrafficRequestMetadata | undefined;
    tenantId: string;
    rateLimitKey?: string;
    retryAfterMs?: number;
    logger?: Logger;
  }): void {
    const key = this.buildAdaptiveKey(options.metadata, options.tenantId, options.rateLimitKey);

    const state = this.getOrCreateState(key);
    const now = Date.now();

    const { windowMs, threshold, minPenaltyMs, maxPenaltyMs, penaltyMultiplier } = this.config;

    // Record this 429
    state.last429At = now;

    // Keep only 429s within rolling window
    state.recent429s = state.recent429s.filter((ts) => now - ts <= windowMs);
    state.recent429s.push(now);

    // Not enough failures yet → no throttling
    if (state.recent429s.length < threshold) {
      return;
    }

    /**
     * Escalate penalty:
     * - Start at minPenaltyMs
     * - Multiply exponentially
     * - Clamp to maxPenaltyMs
     */
    const previousPenalty = state.penaltyMs > 0 ? state.penaltyMs : minPenaltyMs;

    const nextPenalty = Math.min(
      maxPenaltyMs,
      Math.max(minPenaltyMs, Math.round(previousPenalty * penaltyMultiplier)),
    );

    state.penaltyMs = nextPenalty;

    /**
     * Honor upstream Retry-After if provided.
     * We always take the longer delay.
     */
    const retryAfterPenalty = typeof options.retryAfterMs === "number" ? options.retryAfterMs : 0;

    const cooldownMs = Math.max(nextPenalty, retryAfterPenalty);
    state.cooldownUntil = now + cooldownMs;
  }

  /**
   * Record a successful request.
   *
   * Success allows penalty to decay over time.
   * Once penalty reaches zero, the state is effectively reset.
   */
  recordSuccess(options: {
    metadata: TrafficRequestMetadata | undefined;
    tenantId: string;
    rateLimitKey?: string;
  }): void {
    const key = this.buildAdaptiveKey(options.metadata, options.tenantId, options.rateLimitKey);

    const state = this.state.get(key);
    if (!state) return;

    const now = Date.now();

    this.applyPenaltyDecay(state, now);

    // Fully recovered → clear historical state
    if (state.penaltyMs === 0) {
      state.cooldownUntil = undefined;
      state.recent429s = [];
      state.last429At = undefined;
    }
  }

  /**
   * Gradually reduce penalty after enough time without 429s.
   *
   * This prevents permanent throttling.
   */
  // TODO(adaptive-limiter):
  // Consider switching from "one-step-per-touch" lazy decay to a
  // time-catch-up decay model (TCP-style).
  //
  // Current behavior:
  // - Penalty decays by at most one step per call to applyPenaltyDecay()
  // - Long idle periods do NOT fully decay penalty
  // - Recovery speed is bounded by request traffic, not wall-clock time
  //
  // Alternative (future):
  // - Compute how many decay intervals elapsed since last429At
  // - Apply multiple decay steps in one call (catch-up decay)
  // - Faster recovery after long silence, closer to TCP congestion control
  //
  // Tradeoff:
  // - Pros: quicker recovery for low-traffic tenants
  // - Cons: higher risk of burst re-entry after long idle
  // - Must preserve safety against sudden thundering herds

  private applyPenaltyDecay(state: AdaptiveLimiterState, now: number): void {
    const { decayMs, penaltyMultiplier } = this.config;

    // Too soon after last failure → no decay yet
    if (state.last429At !== undefined && now - state.last429At < decayMs) {
      return;
    }

    // Reduce penalty exponentially
    if (state.penaltyMs > 0) {
      state.penaltyMs = Math.max(0, Math.floor(state.penaltyMs / penaltyMultiplier));
    }
  }

  /**
   * Get existing state or initialize a fresh one.
   */
  private getOrCreateState(key: string): AdaptiveLimiterState {
    const existing = this.state.get(key);
    if (existing) return existing;

    const created: AdaptiveLimiterState = {
      recent429s: [],
      penaltyMs: 0,
    };

    this.state.set(key, created);
    return created;
  }

  /**
   * Build a stable adaptive limiter key.
   *
   * Ensures tenant isolation even if the upstream key
   * does not include tenant information.
   */
  private buildAdaptiveKey(
    metadata: TrafficRequestMetadata | undefined,
    tenantId: string,
    rateLimitKeyOverride?: string,
  ): string {
    const baseKey = rateLimitKeyOverride ?? this.buildRateLimitKey(metadata);

    // If tenant is already encoded, do not duplicate
    if (baseKey.includes("tenant=")) {
      return baseKey;
    }

    const tenant = metadata?.tenantId ?? tenantId ?? "default";

    return `${baseKey}::tenant=${encodeURIComponent(tenant)}`;
  }
}
