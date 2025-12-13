import {
  CIRCUIT_COOLDOWN_MS,
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_FAILURE_WINDOW_MS,
  DEFAULT_FALLBACK_CHAINS,
} from "./traffic-constants";
import type {
  CircuitState,
  CircuitStateStatus,
  DispatchDecision,
  QueuedRequest,
} from "./traffic-controller-internal";
import { extractStatusCode } from "./traffic-error-utils";
import { CircuitBreakerOpenError } from "./traffic-errors";
import type { TrafficRequestMetadata } from "./traffic-types";

export class TrafficCircuitBreaker {
  private readonly circuitBreakers = new Map<string, CircuitState>();
  private readonly fallbackChains: Map<string, string[]>;
  private readonly buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;

  constructor(options: {
    fallbackChains?: Record<string, string[]>;
    buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;
  }) {
    this.buildRateLimitKey = options.buildRateLimitKey;
    const chains = options.fallbackChains ?? DEFAULT_FALLBACK_CHAINS;
    this.fallbackChains = new Map(Object.entries(chains));
  }

  resolve(next: QueuedRequest): DispatchDecision | null {
    const visited = new Set<string>();

    while (true) {
      const key = this.buildRateLimitKey(next.request.metadata);
      next.circuitKey = key;

      const model = next.request.metadata?.model;
      if (model) visited.add(model);

      const evaluation = this.evaluateCircuitState(key);
      next.circuitStatus = evaluation.state;

      if (evaluation.allowRequest) return null;

      const fallback = this.findFallbackModel(next.request.metadata, visited);
      if (!fallback || !next.request.createFallbackRequest) {
        next.reject(
          new CircuitBreakerOpenError(
            `Circuit open for ${key}`,
            next.request.metadata,
            evaluation.retryAfterMs,
          ),
        );
        return { kind: "skip" };
      }

      const fallbackRequest = next.request.createFallbackRequest(fallback);
      if (!fallbackRequest) return { kind: "skip" };

      next.request = fallbackRequest;
      next.attempt = 1;
      next.rateLimitKey = undefined;
      next.etaMs = undefined;
      next.circuitKey = undefined;
      next.circuitStatus = undefined;
    }
  }

  markTrial(item: QueuedRequest): void {
    const key = item.circuitKey;
    if (!key) return;
    const state = this.circuitBreakers.get(key);
    if (state && state.status === "half-open" && !state.trialInFlight) {
      state.trialInFlight = true;
    }
  }

  recordSuccess(metadata?: TrafficRequestMetadata): void {
    const key = this.buildRateLimitKey(metadata);
    this.circuitBreakers.delete(key);
  }

  recordFailure(metadata: TrafficRequestMetadata | undefined, error: unknown): void {
    const status = extractStatusCode(error);
    if (!this.isCircuitBreakerStatus(status)) {
      this.circuitBreakers.delete(this.buildRateLimitKey(metadata));
      return;
    }

    const key = this.buildRateLimitKey(metadata);
    const now = Date.now();
    const state =
      this.circuitBreakers.get(key) ??
      ({ status: "closed", failureTimestamps: [] } as CircuitState);

    state.failureTimestamps = state.failureTimestamps.filter(
      (t) => now - t <= CIRCUIT_FAILURE_WINDOW_MS,
    );
    state.failureTimestamps.push(now);

    if (
      state.status === "half-open" ||
      state.failureTimestamps.length >= CIRCUIT_FAILURE_THRESHOLD
    ) {
      state.status = "open";
      state.openedAt = now;
      state.trialInFlight = false;
    }

    this.circuitBreakers.set(key, state);
  }

  private evaluateCircuitState(key: string): {
    allowRequest: boolean;
    state: CircuitStateStatus;
    retryAfterMs?: number;
  } {
    const state = this.circuitBreakers.get(key);
    if (!state) return { allowRequest: true, state: "closed" };

    const now = Date.now();

    if (state.status === "open") {
      const elapsed = state.openedAt ? now - state.openedAt : 0;
      if (elapsed >= CIRCUIT_COOLDOWN_MS) {
        state.status = "half-open";
        state.trialInFlight = false;
        state.failureTimestamps = [];
        return { allowRequest: true, state: "half-open" };
      }
      return {
        allowRequest: false,
        state: "open",
        retryAfterMs: CIRCUIT_COOLDOWN_MS - elapsed,
      };
    }

    if (state.status === "half-open" && state.trialInFlight) {
      return { allowRequest: false, state: "half-open" };
    }

    return { allowRequest: true, state: state.status };
  }

  private findFallbackModel(
    metadata: TrafficRequestMetadata | undefined,
    visitedModels: Set<string>,
  ): string | undefined {
    const currentModel = metadata?.model;
    if (!currentModel) {
      return undefined;
    }

    const chain = this.fallbackChains.get(currentModel);
    if (!chain) {
      return undefined;
    }

    const provider = metadata?.provider;
    for (const candidate of chain) {
      if (visitedModels.has(candidate)) {
        continue;
      }

      const candidateKey = this.buildRateLimitKey({
        provider,
        model: candidate,
      });

      const evaluation = this.evaluateCircuitState(candidateKey);
      if (evaluation.allowRequest) {
        visitedModels.add(candidate);
        return candidate;
      }
    }

    return undefined;
  }

  private isCircuitBreakerStatus(status?: number): boolean {
    return status === 429 || (status !== undefined && status >= 500);
  }
}
