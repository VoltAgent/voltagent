import type { Logger } from "../logger";
import {
  CIRCUIT_COOLDOWN_MS,
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_FAILURE_WINDOW_MS,
  CIRCUIT_PROBE_INTERVAL_MS,
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
import type {
  FallbackChainEntry,
  FallbackPolicy,
  FallbackPolicyConfig,
  FallbackTarget,
  TrafficRequestMetadata,
} from "./traffic-types";

export class TrafficCircuitBreaker {
  private readonly circuitBreakers = new Map<string, CircuitState>();
  private readonly fallbackChains: Map<string, FallbackChainEntry[]>;
  private readonly fallbackPolicy?: FallbackPolicyConfig;
  private readonly buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;

  constructor(options: {
    fallbackChains?: Record<string, FallbackChainEntry[]>;
    fallbackPolicy?: FallbackPolicyConfig;
    buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;
  }) {
    this.buildRateLimitKey = options.buildRateLimitKey;
    const chains = options.fallbackChains ?? DEFAULT_FALLBACK_CHAINS;
    this.fallbackChains = new Map(Object.entries(chains));
    this.fallbackPolicy = options.fallbackPolicy;
  }

  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const circuitLogger = logger?.child({ module: "circuit-breaker" });
    const visitedKeys = new Set<string>();

    while (true) {
      const key = this.buildRateLimitKey(next.request.metadata);
      next.circuitKey = key;
      visitedKeys.add(key);
      circuitLogger?.trace?.("Circuit resolve step", {
        circuitKey: key,
        provider: next.request.metadata?.provider,
        model: next.request.metadata?.model,
      });

      const evaluation = this.evaluateCircuitState(key, circuitLogger);
      next.circuitStatus = evaluation.state;
      circuitLogger?.debug?.("Circuit evaluated", {
        circuitKey: key,
        state: evaluation.state,
        allowRequest: evaluation.allowRequest,
        retryAfterMs: evaluation.retryAfterMs,
      });

      if (evaluation.allowRequest) return null;

      const { policy, policyId } = this.resolveFallbackPolicy(next.request.metadata);
      if (policy.mode === "wait") {
        const wakeUpAt =
          evaluation.retryAfterMs !== undefined ? Date.now() + evaluation.retryAfterMs : undefined;
        circuitLogger?.debug?.("Circuit open; waiting per fallback policy", {
          circuitKey: key,
          policyId,
          retryAfterMs: evaluation.retryAfterMs,
          wakeUpAt,
        });
        return { kind: "wait", wakeUpAt };
      }

      const fallback = this.findFallbackTarget(next.request.metadata, visitedKeys, circuitLogger);
      circuitLogger?.debug?.("Circuit open; attempting fallback", {
        circuitKey: key,
        currentModel: next.request.metadata?.model,
        fallback,
        visitedKeys: Array.from(visitedKeys),
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

      this.applyFallbackRequest(next, fallbackRequest, fallback, circuitLogger, {
        previousCircuitKey: key,
        reason: "circuit-open",
      });
    }
  }

  tryFallback(next: QueuedRequest, reason: "queue-timeout", logger?: Logger): boolean {
    const circuitLogger = logger?.child({ module: "circuit-breaker" });
    const { policy, policyId } = this.resolveFallbackPolicy(next.request.metadata);
    if (policy.mode === "wait") {
      circuitLogger?.debug?.("Fallback skipped by policy", {
        policyId,
        reason,
        provider: next.request.metadata?.provider,
        model: next.request.metadata?.model,
      });
      return false;
    }

    const visitedKeys = new Set<string>();
    const key = this.buildRateLimitKey(next.request.metadata);
    visitedKeys.add(key);

    const fallback = this.findFallbackTarget(next.request.metadata, visitedKeys, circuitLogger);
    if (!fallback || !next.request.createFallbackRequest) {
      circuitLogger?.debug?.("Fallback unavailable for request", {
        reason,
        provider: next.request.metadata?.provider,
        model: next.request.metadata?.model,
        fallback,
      });
      return false;
    }

    const fallbackRequest = next.request.createFallbackRequest(fallback);
    if (!fallbackRequest) {
      circuitLogger?.warn?.("createFallbackRequest returned undefined; skipping", {
        reason,
        fallback,
      });
      return false;
    }

    this.applyFallbackRequest(next, fallbackRequest, fallback, circuitLogger, {
      previousCircuitKey: key,
      reason,
      policyId,
    });
    return true;
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
      state.nextProbeAt = now + CIRCUIT_PROBE_INTERVAL_MS;
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
      if (state.nextProbeAt === undefined) {
        state.nextProbeAt = now + CIRCUIT_PROBE_INTERVAL_MS;
      }
      const cooldownRemaining = Math.max(0, CIRCUIT_COOLDOWN_MS - elapsed);
      const probeRemaining = Math.max(0, state.nextProbeAt - now);
      if (probeRemaining === 0 || cooldownRemaining === 0) {
        state.status = "half-open";
        state.trialInFlight = false;
        state.failureTimestamps = [];
        state.timeoutTimestamps = [];
        state.nextProbeAt = undefined;
        logger?.debug?.("Circuit transitioned to half-open", {
          circuitKey: key,
          reason: cooldownRemaining === 0 ? "cooldown" : "probe",
        });
        return { allowRequest: true, state: "half-open" };
      }
      return {
        allowRequest: false,
        state: "open",
        retryAfterMs: Math.min(cooldownRemaining, probeRemaining),
      };
    }

    if (state.status === "half-open" && state.trialInFlight) {
      return { allowRequest: false, state: "half-open" };
    }

    return { allowRequest: true, state: state.status };
  }

  private resolveFallbackPolicy(metadata: TrafficRequestMetadata | undefined): {
    policy: FallbackPolicy;
    policyId?: string;
  } {
    const policyId =
      metadata?.fallbackPolicyId ??
      (metadata?.taskType
        ? this.fallbackPolicy?.taskTypePolicyIds?.[metadata.taskType]
        : undefined) ??
      this.fallbackPolicy?.defaultPolicyId;

    const policy = policyId ? this.fallbackPolicy?.policies?.[policyId] : undefined;
    return {
      policy: policy ?? { mode: "fallback" },
      policyId,
    };
  }

  private applyFallbackRequest<TResponse>(
    next: QueuedRequest<TResponse>,
    fallbackRequest: QueuedRequest<TResponse>["request"],
    fallback: FallbackChainEntry,
    logger?: Logger,
    context?: { previousCircuitKey?: string; reason?: string; policyId?: string },
  ): void {
    next.request = fallbackRequest;
    next.attempt = 1;
    next.tenantConcurrencyKey = undefined;
    next.providerModelConcurrencyKey = undefined;
    next.rateLimitKey = undefined;
    next.etaMs = undefined;
    next.circuitKey = undefined;
    next.circuitStatus = undefined;
    logger?.debug?.("Switched to fallback request", {
      previousCircuitKey: context?.previousCircuitKey,
      fallbackModel: fallback,
      reason: context?.reason,
      policyId: context?.policyId,
    });
  }

  private findFallbackTarget(
    metadata: TrafficRequestMetadata | undefined,
    visitedKeys: Set<string>,
    logger?: Logger,
  ): FallbackChainEntry | undefined {
    const currentModel = metadata?.model;
    if (!currentModel) {
      logger?.trace?.("No current model; no fallback", {});
      return undefined;
    }

    const provider = metadata?.provider;
    const chain = this.resolveFallbackChain(provider, currentModel);
    if (!chain) {
      logger?.trace?.("No fallback chain for model", {
        currentModel,
        provider,
      });
      return undefined;
    }

    for (const candidate of chain) {
      const target = this.normalizeFallbackTarget(candidate, provider);
      const candidateMetadata: TrafficRequestMetadata = {
        ...(metadata ?? {}),
        provider: target.provider ?? provider,
        model: target.model,
      };
      const candidateKey = this.buildRateLimitKey(candidateMetadata);
      if (visitedKeys.has(candidateKey)) {
        continue;
      }

      const evaluation = this.evaluateCircuitState(candidateKey, logger);
      if (evaluation.allowRequest) {
        visitedKeys.add(candidateKey);
        logger?.debug?.("Selected fallback target", {
          currentModel,
          currentProvider: provider,
          fallbackModel: target.model,
          fallbackProvider: target.provider ?? provider,
          fallbackCircuitKey: candidateKey,
        });
        return candidate;
      }
    }

    return undefined;
  }

  private resolveFallbackChain(
    provider: string | undefined,
    model: string,
  ): FallbackChainEntry[] | undefined {
    const providerKey = provider ? `${provider}::${model}` : undefined;
    if (providerKey) {
      const providerChain = this.fallbackChains.get(providerKey);
      if (providerChain) return providerChain;
    }
    return this.fallbackChains.get(model);
  }

  private normalizeFallbackTarget(
    candidate: FallbackChainEntry,
    provider: string | undefined,
  ): FallbackTarget {
    if (typeof candidate === "string") {
      return { provider, model: candidate };
    }
    return {
      provider: candidate.provider ?? provider,
      model: candidate.model,
    };
  }

  private isCircuitBreakerStatus(status?: number): boolean {
    return status === 429 || (status !== undefined && status >= 500);
  }
}
