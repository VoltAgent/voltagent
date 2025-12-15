import type { Logger } from "../logger";
import {
  CIRCUIT_COOLDOWN_MS,
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_FAILURE_WINDOW_MS,
  CIRCUIT_TIMEOUT_THRESHOLD,
  CIRCUIT_TIMEOUT_WINDOW_MS,
  DEFAULT_FALLBACK_CHAINS,
} from "./traffic-constants";
import type {
  CircuitState,
  CircuitStateStatus,
  DispatchDecision,
  QueuedRequest,
} from "./traffic-controller-internal";
import { extractStatusCode, isTimeoutError } from "./traffic-error-utils";
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

  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const circuitLogger = logger?.child({ module: "circuit-breaker" });
    const visited = new Set<string>();

    while (true) {
      const key = this.buildRateLimitKey(next.request.metadata);
      next.circuitKey = key;
      circuitLogger?.trace?.("Circuit resolve step", {
        circuitKey: key,
        provider: next.request.metadata?.provider,
        model: next.request.metadata?.model,
      });

      const model = next.request.metadata?.model;
      if (model) visited.add(model);

      const evaluation = this.evaluateCircuitState(key, circuitLogger);
      next.circuitStatus = evaluation.state;
      circuitLogger?.debug?.("Circuit evaluated", {
        circuitKey: key,
        state: evaluation.state,
        allowRequest: evaluation.allowRequest,
        retryAfterMs: evaluation.retryAfterMs,
      });

      if (evaluation.allowRequest) return null;

      const fallback = this.findFallbackModel(next.request.metadata, visited, circuitLogger);
      circuitLogger?.debug?.("Circuit open; attempting fallback", {
        circuitKey: key,
        currentModel: next.request.metadata?.model,
        fallback,
        visitedModels: Array.from(visited),
      });
      if (!fallback || !next.request.createFallbackRequest) {
        next.reject(
          new CircuitBreakerOpenError(
            `Circuit open for ${key}`,
            next.request.metadata,
            evaluation.retryAfterMs,
          ),
        );
        circuitLogger?.warn?.("No fallback available; rejecting request", {
          circuitKey: key,
          retryAfterMs: evaluation.retryAfterMs,
        });
        return { kind: "skip" };
      }

      const fallbackRequest = next.request.createFallbackRequest(fallback);
      if (!fallbackRequest) {
        circuitLogger?.warn?.("createFallbackRequest returned undefined; skipping", {
          circuitKey: key,
          fallback,
        });
        return { kind: "skip" };
      }

      next.request = fallbackRequest;
      next.attempt = 1;
      next.rateLimitKey = undefined;
      next.etaMs = undefined;
      next.circuitKey = undefined;
      next.circuitStatus = undefined;
      circuitLogger?.debug?.("Switched to fallback request", {
        previousCircuitKey: key,
        fallbackModel: fallback,
      });
    }
  }

  markTrial(item: QueuedRequest, logger?: Logger): void {
    const circuitLogger = logger?.child({ module: "circuit-breaker" });
    const key = item.circuitKey;
    if (!key) return;
    const state = this.circuitBreakers.get(key);
    if (state && state.status === "half-open" && !state.trialInFlight) {
      state.trialInFlight = true;
      circuitLogger?.debug?.("Marked half-open trial in flight", { circuitKey: key });
    }
  }

  recordSuccess(metadata?: TrafficRequestMetadata, logger?: Logger): void {
    const circuitLogger = logger?.child({ module: "circuit-breaker" });
    const key = this.buildRateLimitKey(metadata);
    this.circuitBreakers.delete(key);
    circuitLogger?.debug?.("Circuit success; cleared circuit state", {
      circuitKey: key,
      provider: metadata?.provider,
      model: metadata?.model,
    });
  }

  recordFailure(
    metadata: TrafficRequestMetadata | undefined,
    error: unknown,
    logger?: Logger,
  ): void {
    const circuitLogger = logger?.child({ module: "circuit-breaker" });
    const key = this.buildRateLimitKey(metadata);
    const status = extractStatusCode(error, logger);
    const isTimeout = status === 408 || isTimeoutError(error, logger);
    const isStatusEligible = this.isCircuitBreakerStatus(status);
    const isTimeoutEligible = !isStatusEligible && isTimeout;
    const isEligible = isStatusEligible || isTimeoutEligible;

    circuitLogger?.debug?.("Circuit failure observed", {
      circuitKey: key,
      status,
      isTimeout,
      eligible: isEligible,
      provider: metadata?.provider,
      model: metadata?.model,
    });

    if (!isEligible) {
      this.circuitBreakers.delete(key);
      circuitLogger?.debug?.("Failure not eligible for circuit breaker; cleared circuit state", {
        circuitKey: key,
        status,
        isTimeout,
      });
      return;
    }

    const now = Date.now();
    const state =
      this.circuitBreakers.get(key) ??
      ({ status: "closed", failureTimestamps: [], timeoutTimestamps: [] } as CircuitState);

    state.failureTimestamps = state.failureTimestamps.filter(
      (t) => now - t <= CIRCUIT_FAILURE_WINDOW_MS,
    );
    state.timeoutTimestamps = state.timeoutTimestamps.filter(
      (t) => now - t <= CIRCUIT_TIMEOUT_WINDOW_MS,
    );

    state.failureTimestamps.push(now);
    if (isTimeoutEligible) {
      state.timeoutTimestamps.push(now);
    }

    if (
      state.status === "half-open" ||
      state.failureTimestamps.length >= CIRCUIT_FAILURE_THRESHOLD ||
      state.timeoutTimestamps.length >= CIRCUIT_TIMEOUT_THRESHOLD
    ) {
      const openReasons: string[] = [];
      if (state.status === "half-open") openReasons.push("half-open-failure");
      if (state.failureTimestamps.length >= CIRCUIT_FAILURE_THRESHOLD) {
        openReasons.push("failure-threshold");
      }
      if (state.timeoutTimestamps.length >= CIRCUIT_TIMEOUT_THRESHOLD) {
        openReasons.push("timeout-threshold");
      }

      state.status = "open";
      state.openedAt = now;
      state.trialInFlight = false;
      circuitLogger?.warn?.("Circuit opened", {
        circuitKey: key,
        openReasons,
        status,
        isTimeout,
        failureCount: state.failureTimestamps.length,
        failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
        timeoutCount: state.timeoutTimestamps.length,
        timeoutThreshold: CIRCUIT_TIMEOUT_THRESHOLD,
        openedAt: state.openedAt,
      });
    }

    this.circuitBreakers.set(key, state);
    circuitLogger?.trace?.("Circuit state updated", {
      circuitKey: key,
      status: state.status,
      failureCount: state.failureTimestamps.length,
      failureWindowMs: CIRCUIT_FAILURE_WINDOW_MS,
      timeoutCount: state.timeoutTimestamps.length,
      timeoutWindowMs: CIRCUIT_TIMEOUT_WINDOW_MS,
    });
  }

  private evaluateCircuitState(
    key: string,
    logger?: Logger,
  ): {
    allowRequest: boolean;
    state: CircuitStateStatus;
    retryAfterMs?: number;
  } {
    const state = this.circuitBreakers.get(key);
    if (!state) {
      logger?.trace?.("Circuit state missing; allow request", { circuitKey: key });
      return { allowRequest: true, state: "closed" };
    }

    const now = Date.now();

    if (state.status === "open") {
      const elapsed = state.openedAt ? now - state.openedAt : 0;
      if (elapsed >= CIRCUIT_COOLDOWN_MS) {
        state.status = "half-open";
        state.trialInFlight = false;
        state.failureTimestamps = [];
        state.timeoutTimestamps = [];
        logger?.debug?.("Circuit transitioned to half-open", { circuitKey: key });
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
    logger?: Logger,
  ): string | undefined {
    const currentModel = metadata?.model;
    if (!currentModel) {
      logger?.trace?.("No current model; no fallback", {});
      return undefined;
    }

    const chain = this.fallbackChains.get(currentModel);
    if (!chain) {
      logger?.trace?.("No fallback chain for model", { currentModel });
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

      const evaluation = this.evaluateCircuitState(candidateKey, logger);
      if (evaluation.allowRequest) {
        visitedModels.add(candidate);
        logger?.debug?.("Selected fallback model", {
          currentModel,
          fallbackModel: candidate,
          fallbackCircuitKey: candidateKey,
        });
        return candidate;
      }
    }

    return undefined;
  }

  private isCircuitBreakerStatus(status?: number): boolean {
    return status === 429 || (status !== undefined && status >= 500);
  }
}
