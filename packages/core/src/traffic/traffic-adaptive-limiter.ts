import type { Logger } from "../logger";
import type { DispatchDecision, QueuedRequest } from "./traffic-controller-internal";
import type { AdaptiveLimiterConfig, TrafficRequestMetadata } from "./traffic-types";

type AdaptiveLimiterState = {
  recent429s: number[];
  penaltyMs: number;
  cooldownUntil?: number;
  last429At?: number;
};

const DEFAULT_ADAPTIVE_LIMITER: Required<AdaptiveLimiterConfig> = {
  windowMs: 30_000,
  threshold: 3,
  minPenaltyMs: 500,
  maxPenaltyMs: 10_000,
  penaltyMultiplier: 2,
  decayMs: 10_000,
};

export class TrafficAdaptiveLimiter {
  private readonly config: Required<AdaptiveLimiterConfig>;
  private readonly state = new Map<string, AdaptiveLimiterState>();
  private readonly buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;

  constructor(options: {
    adaptiveLimiter?: AdaptiveLimiterConfig;
    buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;
  }) {
    this.config = {
      ...DEFAULT_ADAPTIVE_LIMITER,
      ...(options.adaptiveLimiter ?? {}),
    };
    this.buildRateLimitKey = options.buildRateLimitKey;
  }

  resolve(next: QueuedRequest, now: number): DispatchDecision | null {
    const key = this.buildAdaptiveKey(next.request.metadata, next.tenantId, next.rateLimitKey);
    const state = this.state.get(key);
    if (!state) return null;

    this.applyDecay(state, now);
    if (state.cooldownUntil !== undefined && now < state.cooldownUntil) {
      return { kind: "wait", wakeUpAt: state.cooldownUntil };
    }

    return null;
  }

  recordRateLimitHit(options: {
    metadata: TrafficRequestMetadata | undefined;
    tenantId: string;
    rateLimitKey?: string;
    retryAfterMs?: number;
    logger?: Logger;
  }): void {
    const key = this.buildAdaptiveKey(options.metadata, options.tenantId, options.rateLimitKey);
    const state = this.getState(key);
    const now = Date.now();
    const { windowMs, threshold, minPenaltyMs, maxPenaltyMs, penaltyMultiplier } = this.config;

    state.last429At = now;
    state.recent429s = state.recent429s.filter((timestamp) => now - timestamp <= windowMs);
    state.recent429s.push(now);

    if (state.recent429s.length < threshold) {
      return;
    }

    const basePenalty = state.penaltyMs > 0 ? state.penaltyMs : minPenaltyMs;
    const nextPenalty = Math.min(
      maxPenaltyMs,
      Math.max(minPenaltyMs, Math.round(basePenalty * penaltyMultiplier)),
    );
    state.penaltyMs = nextPenalty;
    const retryPenalty = typeof options.retryAfterMs === "number" ? options.retryAfterMs : 0;
    const cooldownMs = Math.max(nextPenalty, retryPenalty);
    state.cooldownUntil = now + cooldownMs;
  }

  recordSuccess(options: {
    metadata: TrafficRequestMetadata | undefined;
    tenantId: string;
    rateLimitKey?: string;
  }): void {
    const key = this.buildAdaptiveKey(options.metadata, options.tenantId, options.rateLimitKey);
    const state = this.state.get(key);
    if (!state) return;

    const now = Date.now();
    this.applyDecay(state, now);
    if (state.penaltyMs === 0) {
      state.cooldownUntil = undefined;
      state.recent429s = [];
      state.last429At = undefined;
    }
  }

  private applyDecay(state: AdaptiveLimiterState, now: number): void {
    const { decayMs, penaltyMultiplier } = this.config;
    if (state.last429At && now - state.last429At < decayMs) {
      return;
    }

    if (state.penaltyMs > 0) {
      state.penaltyMs = Math.max(0, Math.floor(state.penaltyMs / penaltyMultiplier));
    }
  }

  private getState(key: string): AdaptiveLimiterState {
    const existing = this.state.get(key);
    if (existing) return existing;
    const created: AdaptiveLimiterState = { recent429s: [], penaltyMs: 0 };
    this.state.set(key, created);
    return created;
  }

  private buildAdaptiveKey(
    metadata: TrafficRequestMetadata | undefined,
    tenantId: string,
    rateLimitKeyOverride?: string,
  ): string {
    const rateLimitKey = rateLimitKeyOverride ?? this.buildRateLimitKey(metadata);
    if (rateLimitKey.includes("tenant=")) {
      return rateLimitKey;
    }
    const tenant = metadata?.tenantId ?? tenantId ?? "default";
    return `${rateLimitKey}::tenant=${encodeURIComponent(tenant)}`;
  }
}
