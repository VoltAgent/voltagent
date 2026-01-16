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
  TrafficResponseMetadata,
} from "./traffic-types";

/**
 * TrafficCircuitBreaker
 * =====================
 *
 * Purpose:
 * - Prevent hammering unhealthy provider/model combinations
 * - Open circuits on repeated failures or timeouts
 * - Allow controlled recovery via probes (half-open)
 * - Reroute requests using fallback chains or wait policies
 *
 * Scope:
 * - Per provider+model (rateLimitKey)
 * - Integrates with queueing, retries, and fallback routing
 */
export class TrafficCircuitBreaker {
  /**
   * Circuit state per provider/model key
   */
  private readonly circuitBreakers = new Map<string, CircuitState>();

  /**
   * Fallback chains per model or provider::model
   */
  private readonly fallbackChains: Map<string, FallbackChainEntry[]>;

  /**
   * Optional global fallback policy configuration
   */
  private readonly fallbackPolicy?: FallbackPolicyConfig;

  /**
   * Canonical key builder for provider/model isolation
   */
  private readonly buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;

  constructor(options: {
    fallbackChains?: Record<string, FallbackChainEntry[]>;
    fallbackPolicy?: FallbackPolicyConfig;
    buildRateLimitKey: (metadata?: TrafficRequestMetadata) => string;
  }) {
    this.buildRateLimitKey = options.buildRateLimitKey;
    this.fallbackChains = new Map(
      Object.entries(options.fallbackChains ?? DEFAULT_FALLBACK_CHAINS),
    );
    this.fallbackPolicy = options.fallbackPolicy;
  }

  // ===========================================================================
  // 1. REQUEST ADMISSION (ENTRYPOINT)
  // ===========================================================================

  /**
   * resolve()
   *
   * Called BEFORE dispatch.
   *
   * Decides whether:
   * - request may proceed
   * - request must wait
   * - request should be rerouted to fallback
   * - request must be rejected immediately
   */
  resolve(next: QueuedRequest, logger?: Logger): DispatchDecision | null {
    const log = logger?.child({ module: "circuit-breaker" });
    const visitedCircuitKeys = new Set<string>();

    /**
     * Loop exists ONLY to allow multi-step fallback traversal.
     * Each iteration represents "try current model, else fallback".
     */
    while (true) {
      const circuitKey = this.buildRateLimitKey(next.request.metadata);
      next.circuitKey = circuitKey;
      visitedCircuitKeys.add(circuitKey);

      log?.trace?.("Evaluating circuit", {
        circuitKey,
        provider: next.request.metadata?.provider,
        model: next.request.metadata?.model,
      });

      // ---- Circuit evaluation (pure decision) ----
      const evaluation = this.evaluateCircuitState(circuitKey, log);
      next.circuitStatus = evaluation.state;

      if (evaluation.allowRequest) {
        // Circuit allows traffic → proceed normally
        return null;
      }

      // ---- Circuit is OPEN ----
      const { policy, policyId } = this.resolveFallbackPolicy(next.request.metadata);

      // Path A: policy says "wait"
      if (policy.mode === "wait") {
        const wakeUpAt =
          evaluation.retryAfterMs !== undefined ? Date.now() + evaluation.retryAfterMs : undefined;

        log?.debug?.("Circuit open; waiting", {
          circuitKey,
          policyId,
          retryAfterMs: evaluation.retryAfterMs,
        });

        return { kind: "wait", wakeUpAt };
      }

      // Path B: policy allows fallback
      const fallback = this.findFallbackTarget(next.request.metadata, visitedCircuitKeys, log);

      if (!fallback || !next.request.createFallbackRequest) {
        // No viable fallback → reject fast
        this.rejectCircuitOpen(next, circuitKey, evaluation.retryAfterMs, log);
        return { kind: "skip" };
      }

      const fallbackRequest = next.request.createFallbackRequest(fallback);
      if (!fallbackRequest) {
        log?.warn?.("Fallback creation failed; skipping", { fallback });
        return { kind: "skip" };
      }

      // Switch request context and retry loop with fallback model
      this.applyFallbackRequest(next, fallbackRequest, fallback, log, {
        previousCircuitKey: circuitKey,
        reason: "circuit-open",
        policyId,
      });
    }
  }

  // ===========================================================================
  // 2. QUEUE TIMEOUT FALLBACK
  // ===========================================================================

  /**
   * tryFallback()
   *
   * Used when a request waited too long in queue.
   * Does NOT consider circuit state again; only policy + availability.
   */
  tryFallback(next: QueuedRequest, reason: "queue-timeout", logger?: Logger): boolean {
    const log = logger?.child({ module: "circuit-breaker" });
    const { policy, policyId } = this.resolveFallbackPolicy(next.request.metadata);

    if (policy.mode === "wait") {
      log?.debug?.("Queue-timeout fallback disabled by policy", { policyId });
      return false;
    }

    const visited = new Set<string>();
    visited.add(this.buildRateLimitKey(next.request.metadata));

    const fallback = this.findFallbackTarget(next.request.metadata, visited, log);
    if (!fallback || !next.request.createFallbackRequest) return false;

    const fallbackRequest = next.request.createFallbackRequest(fallback);
    if (!fallbackRequest) return false;

    this.applyFallbackRequest(next, fallbackRequest, fallback, log, {
      reason,
      policyId,
    });

    return true;
  }

  // ===========================================================================
  // 3. CIRCUIT STATE MUTATION (AFTER EXECUTION)
  // ===========================================================================

  /**
   * recordSuccess()
   *
   * Any successful response resets the circuit entirely.
   */
  recordSuccess(metadata?: TrafficRequestMetadata, logger?: Logger): void {
    const log = logger?.child({ module: "circuit-breaker" });
    const key = this.buildRateLimitKey(metadata);

    this.circuitBreakers.delete(key);

    log?.debug?.("Circuit reset after success", {
      circuitKey: key,
      provider: metadata?.provider,
      model: metadata?.model,
    });
  }

  /**
   * recordFailure()
   *
   * Observes a failure and decides whether to open the circuit.
   */
  recordFailure(
    metadata: TrafficRequestMetadata | undefined,
    error: unknown,
    logger?: Logger,
  ): void {
    const log = logger?.child({ module: "circuit-breaker" });
    const key = this.buildRateLimitKey(metadata);

    // ---------------------------------------------------------------------------
    // STEP 1: Decide whether this failure should affect the circuit breaker
    // ---------------------------------------------------------------------------

    const status = extractStatusCode(error, logger);
    const isTimeout = status === 408 || isTimeoutError(error, logger);

    const isEligibleFailure =
      this.isCircuitBreakerStatus(status) || (!this.isCircuitBreakerStatus(status) && isTimeout);

    if (!isEligibleFailure) {
      // Any non-eligible error resets the circuit history
      this.circuitBreakers.delete(key);
      return;
    }

    // ---------------------------------------------------------------------------
    // STEP 2: Load (or create) circuit state
    // ---------------------------------------------------------------------------

    const now = Date.now();

    const state =
      this.circuitBreakers.get(key) ??
      ({
        status: "closed",
        failureTimestamps: [],
        timeoutTimestamps: [],
      } as CircuitState);

    // ---------------------------------------------------------------------------
    // STEP 3: Forget old failures (this is the "rolling window")
    // ---------------------------------------------------------------------------
    // Meaning:
    //   "Only failures within the last N milliseconds matter"

    const failureWindowStart = now - CIRCUIT_FAILURE_WINDOW_MS;
    const timeoutWindowStart = now - CIRCUIT_TIMEOUT_WINDOW_MS;

    state.failureTimestamps = state.failureTimestamps.filter(
      (timestamp) => timestamp >= failureWindowStart,
    );

    state.timeoutTimestamps = state.timeoutTimestamps.filter(
      (timestamp) => timestamp >= timeoutWindowStart,
    );

    // ---------------------------------------------------------------------------
    // STEP 4: Record the current failure
    // ---------------------------------------------------------------------------

    state.failureTimestamps.push(now);

    if (isTimeout) {
      state.timeoutTimestamps.push(now);
    }

    // ---------------------------------------------------------------------------
    // STEP 5: Decide whether the circuit must open
    // ---------------------------------------------------------------------------
    // The circuit opens if:
    //   - A failure happens during half-open (probe failed), OR
    //   - Too many failures in the recent window, OR
    //   - Too many timeouts in the recent window

    const exceededFailureThreshold = state.failureTimestamps.length >= CIRCUIT_FAILURE_THRESHOLD;

    const exceededTimeoutThreshold = state.timeoutTimestamps.length >= CIRCUIT_TIMEOUT_THRESHOLD;

    const shouldOpenCircuit =
      state.status === "half-open" || exceededFailureThreshold || exceededTimeoutThreshold;

    if (shouldOpenCircuit) {
      state.status = "open";
      state.openedAt = now;
      state.trialInFlight = false;
      state.nextProbeAt = now + CIRCUIT_PROBE_INTERVAL_MS;

      log?.warn?.("Circuit opened", {
        circuitKey: key,
        failureCount: state.failureTimestamps.length,
        timeoutCount: state.timeoutTimestamps.length,
        failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
        timeoutThreshold: CIRCUIT_TIMEOUT_THRESHOLD,
      });
    }

    // ---------------------------------------------------------------------------
    // STEP 6: Persist updated state
    // ---------------------------------------------------------------------------

    this.circuitBreakers.set(key, state);
  }

  // ===========================================================================
  // 4. CIRCUIT STATE EVALUATION (PURE)
  // ===========================================================================

  /**
   * evaluateCircuitState()
   *
   * Pure decision function.
   * Does NOT mutate request.
   */
  private evaluateCircuitState(
    key: string,
    logger?: Logger,
  ): {
    allowRequest: boolean;
    state: CircuitStateStatus;
    retryAfterMs?: number;
  } {
    const state = this.circuitBreakers.get(key);
    if (!state) return { allowRequest: true, state: "closed" };

    const now = Date.now();

    if (state.status === "open") {
      const elapsed = state.openedAt ? now - state.openedAt : 0;
      const cooldownRemaining = Math.max(0, CIRCUIT_COOLDOWN_MS - elapsed);
      const probeRemaining = Math.max(0, (state.nextProbeAt ?? 0) - now);

      if (cooldownRemaining === 0 || probeRemaining === 0) {
        state.status = "half-open";
        state.trialInFlight = false;
        state.failureTimestamps = [];
        state.timeoutTimestamps = [];
        state.nextProbeAt = undefined;

        logger?.debug?.("Circuit half-open", { circuitKey: key });
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

  // ===========================================================================
  // 5. FALLBACK RESOLUTION
  // ===========================================================================

  private resolveFallbackPolicy(metadata: TrafficRequestMetadata | undefined): {
    policy: FallbackPolicy;
    policyId?: string;
  } {
    const rawPolicyId =
      metadata?.fallbackPolicyId ??
      (metadata?.taskType
        ? this.fallbackPolicy?.taskTypePolicyIds?.[metadata.taskType]
        : undefined) ??
      this.fallbackPolicy?.defaultPolicyId;

    const policyId = rawPolicyId && rawPolicyId.length > 0 ? rawPolicyId : undefined;
    const configuredPolicy = policyId ? this.fallbackPolicy?.policies?.[policyId] : undefined;

    return {
      policy: configuredPolicy ?? { mode: "fallback" },
      policyId,
    };
  }

  private findFallbackTarget(
    metadata: TrafficRequestMetadata | undefined,
    visitedKeys: Set<string>,
    logger?: Logger,
  ): FallbackChainEntry | undefined {
    const currentModel = metadata?.model;
    if (!currentModel) return;

    const provider = metadata?.provider;
    const chain = this.resolveFallbackChain(provider, currentModel);
    if (!chain) return;

    for (const candidate of chain) {
      if (this.isShortResponseFallback(candidate)) return candidate;

      const target = this.normalizeFallbackTarget(candidate, provider);
      const candidateKey = this.buildRateLimitKey({
        ...(metadata ?? {}),
        provider: target.provider,
        model: target.model,
      });

      if (visitedKeys.has(candidateKey)) continue;

      if (this.evaluateCircuitState(candidateKey, logger).allowRequest) {
        visitedKeys.add(candidateKey);
        return candidate;
      }
    }

    return undefined;
  }

  // ===========================================================================
  // 6. FALLBACK APPLICATION (REQUEST MUTATION)
  // ===========================================================================

  private applyFallbackRequest<TResponse>(
    next: QueuedRequest<TResponse>,
    fallbackRequest: QueuedRequest<TResponse>["request"],
    _fallback: FallbackChainEntry,
    logger?: Logger,
    context?: { previousCircuitKey?: string; reason?: string; policyId?: string },
  ): void {
    next.request = fallbackRequest;
    next.attempt = 1;

    // Reset scheduling & concurrency metadata
    next.estimatedTokens = fallbackRequest.estimatedTokens;
    next.reservedTokens = undefined;
    next.tenantConcurrencyKey = undefined;
    next.providerModelConcurrencyKey = undefined;
    next.rateLimitKey = undefined;
    next.etaMs = undefined;
    next.circuitKey = undefined;
    next.circuitStatus = undefined;

    if (context?.reason === "queue-timeout") {
      next.queueTimeoutDisabled = true;
    }

    logger?.debug?.("Applied fallback request", context);
  }

  // ===========================================================================
  // 7. SMALL HELPERS
  // ===========================================================================

  private rejectCircuitOpen(
    next: QueuedRequest,
    circuitKey: string,
    retryAfterMs?: number,
    logger?: Logger,
  ): void {
    const error = new CircuitBreakerOpenError(
      `Circuit open for ${circuitKey}`,
      next.request.metadata,
      retryAfterMs,
    );

    (error as CircuitBreakerOpenError & { traffic?: TrafficResponseMetadata }).traffic = {
      rateLimitKey: circuitKey,
      retryAfterMs,
      tenantId: next.request.metadata?.tenantId ?? next.tenantId,
      priority: next.request.metadata?.priority,
      taskType: next.request.metadata?.taskType,
    };

    next.reject(error);
    logger?.warn?.("Circuit open; rejecting request", { circuitKey, retryAfterMs });
  }

  private resolveFallbackChain(
    provider: string | undefined,
    model: string,
  ): FallbackChainEntry[] | undefined {
    return (
      (provider ? this.fallbackChains.get(`${provider}::${model}`) : undefined) ??
      this.fallbackChains.get(model)
    );
  }

  private normalizeFallbackTarget(
    candidate: Exclude<FallbackChainEntry, { kind: "short-response" }>,
    provider: string | undefined,
  ): FallbackTarget {
    return typeof candidate === "string"
      ? { provider, model: candidate }
      : { provider: candidate.provider ?? provider, model: candidate.model };
  }

  private isShortResponseFallback(
    candidate: FallbackChainEntry,
  ): candidate is { kind: "short-response"; text: string } {
    return (
      typeof candidate === "object" &&
      candidate !== null &&
      "kind" in candidate &&
      candidate.kind === "short-response"
    );
  }

  private isCircuitBreakerStatus(status?: number): boolean {
    return status === 429 || (status !== undefined && status >= 500);
  }

  /**
   * markTrial()
   *
   * Called when a request is actually dispatched while the circuit
   * is in half-open state.
   *
   * Ensures that only ONE probe request is in-flight at any time.
   */
  markTrial(item: QueuedRequest, logger?: Logger): void {
    const log = logger?.child({ module: "circuit-breaker" });
    const key = item.circuitKey;
    if (!key) return;

    const state = this.circuitBreakers.get(key);
    if (!state) return;

    if (state.status === "half-open" && !state.trialInFlight) {
      state.trialInFlight = true;
      log?.debug?.("Marked half-open trial in flight", { circuitKey: key });
    }
  }
}
