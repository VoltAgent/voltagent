/* ============================================================
 * Imports
 * ============================================================ */

import type { Logger } from "../logger"; // Logger used for structured retry diagnostics

import {
  MAX_RETRY_ATTEMPTS, // Default max retries for non-timeout errors
  RATE_LIMIT_BASE_BACKOFF_MS, // Base delay for rate-limit retries
  RATE_LIMIT_JITTER_FACTOR, // Random jitter factor for rate-limit retries
  SERVER_ERROR_BASE_BACKOFF_MS, // Base delay for 5xx retries
  SERVER_ERROR_JITTER_FACTOR, // Random jitter factor for server-error retries
  TIMEOUT_BASE_BACKOFF_MS, // Base delay for timeout retries
  TIMEOUT_JITTER_FACTOR, // Random jitter factor for timeout retries
  TIMEOUT_RETRY_ATTEMPTS, // Lower retry cap for timeouts
} from "./traffic-constants";

import {
  extractRetryAfterMs, // Reads Retry-After header or equivalent
  extractStatusCode, // Extracts HTTP-like status code from error
  isTimeoutError, // Detects timeout errors across providers
} from "./traffic-error-utils";

import { RateLimitedUpstreamError } from "./traffic-errors"; // Explicit 429 error wrapper

import type {
  RetryPlan, // Result returned by retry logic
  RetryPolicy, // User-defined retry policy function
  RetryPolicyConfig, // Policy configuration container
  RetryPolicyContext, // Context passed to retry policy
  RetryReason, // Normalized retry reason enum
} from "./traffic-types";

/* ============================================================
 * Public Type Re-exports
 * ============================================================ */

export type {
  RetryPlan,
  RetryPolicy,
  RetryPolicyConfig,
  RetryPolicyContext,
  RetryReason,
} from "./traffic-types";

/* ============================================================
 * Retry Reason Detection
 * ============================================================ */

function getRetryReason(error: unknown, logger?: Logger): RetryReason | undefined {
  // Explicit rate-limit error always maps to rateLimit
  if (error instanceof RateLimitedUpstreamError) return "rateLimit";

  // Attempt to extract a status code from arbitrary error shapes
  const status = extractStatusCode(error, logger);

  // HTTP 429 → rate limiting
  if (status === 429) return "rateLimit";

  // HTTP 5xx → server-side failure
  if (status && status >= 500) return "serverError";

  // HTTP 408 or detected timeout → timeout retry
  if (status === 408 || isTimeoutError(error, logger)) return "timeout";

  // Any other error is considered non-retryable
  return undefined;
}

/* ============================================================
 * Exponential Backoff Computation
 * ============================================================ */

function computeBackoffDelay(reason: RetryReason, attempt: number): number {
  // Select base delay depending on failure class
  // (timeouts are treated differently from 5xx and 429s)
  const base =
    reason === "serverError"
      ? SERVER_ERROR_BASE_BACKOFF_MS
      : reason === "timeout"
        ? TIMEOUT_BASE_BACKOFF_MS
        : RATE_LIMIT_BASE_BACKOFF_MS;

  // Select jitter multiplier for the same failure class
  // Jitter prevents thundering-herd retries
  const jitter =
    reason === "serverError"
      ? SERVER_ERROR_JITTER_FACTOR
      : reason === "timeout"
        ? TIMEOUT_JITTER_FACTOR
        : RATE_LIMIT_JITTER_FACTOR;

  // Exponential growth: base * 2^(attempt-1)
  // attempt=1 → base
  // attempt=2 → base*2
  const exp = base * 2 ** (attempt - 1);

  // Add randomized jitter on top of exponential delay
  // This spreads retries across time instead of synchronizing them
  return Math.round(exp + exp * jitter * Math.random());
}

/* ============================================================
 * Retry Policy Resolution
 * ============================================================ */

function resolveRetryPolicy(
  context: RetryPolicyContext,
  config?: RetryPolicyConfig,
): RetryPolicy | undefined {
  // No config → no custom policy
  if (!config) return undefined;

  // 1. Exact routing-key match (highest specificity)
  if (context.key) {
    const direct = config.modelPolicyMap?.[context.key];
    if (direct) return direct;
  }

  // 2. provider::model composite key
  const providerModelKey =
    context.metadata?.provider && context.metadata?.model
      ? `${context.metadata.provider}::${context.metadata.model}`
      : undefined;

  if (providerModelKey) {
    const composite = config.modelPolicyMap?.[providerModelKey];
    if (composite) return composite;
  }

  // 3. Provider-level fallback
  const provider = context.metadata?.provider;
  if (provider) {
    const providerPolicy = config.providerPolicyMap?.[provider];
    if (providerPolicy) return providerPolicy;
  }

  // 4. Default policy (lowest specificity)
  return config.default;
}

/* ============================================================
 * Core Retry Plan Builder (No Policy)
 * ============================================================ */

export function buildRetryPlan(
  error: unknown,
  attempt: number,
  logger?: Logger,
): RetryPlan | undefined {
  // Create a child logger scoped to retry logic
  const retryLogger = logger?.child({ module: "retry" });

  // Classify the error into a retry reason
  const reason = getRetryReason(error, retryLogger);

  // If error is not retryable, exit early
  if (!reason) {
    retryLogger?.debug?.("No retry reason detected; skipping retry", {
      attempt,
    });
    return undefined;
  }

  // Use a stricter retry cap for timeouts
  const maxAttempts = reason === "timeout" ? TIMEOUT_RETRY_ATTEMPTS : MAX_RETRY_ATTEMPTS;

  // Abort if retry budget is exhausted
  if (attempt >= maxAttempts) {
    retryLogger?.debug?.("Retry attempts exhausted; skipping retry", {
      attempt,
      max: maxAttempts,
      reason,
    });
    return undefined;
  }

  // Compute exponential backoff delay
  const computedDelayMs = computeBackoffDelay(reason, attempt);

  // If rate-limited, respect Retry-After if present
  const retryAfterMs =
    reason === "rateLimit"
      ? error instanceof RateLimitedUpstreamError
        ? error.retryAfterMs
        : extractRetryAfterMs(error, retryLogger)
      : undefined;

  // Final delay = max(computed backoff, Retry-After)
  // Ensures we never retry earlier than the provider allows
  const delayMs =
    retryAfterMs === undefined ? computedDelayMs : Math.max(computedDelayMs, retryAfterMs);

  // Log final retry decision for observability
  retryLogger?.debug?.("Retry plan built", {
    attempt,
    reason,
    delayMs,
    computedDelayMs,
    retryAfterMs,
    max: maxAttempts,
  });

  // Return concrete retry plan
  return {
    reason,
    delayMs,
  };
}

/* ============================================================
 * Policy-Aware Retry Plan Builder (Top-Level)
 * ============================================================ */

export function buildRetryPlanWithPolicy(
  context: RetryPolicyContext,
  policyConfig?: RetryPolicyConfig,
): RetryPlan | undefined {
  // Logger scoped to retry evaluation
  const retryLogger = context.logger?.child({ module: "retry" });

  // Resolve the most specific retry policy, if any
  const policy = resolveRetryPolicy(context, policyConfig);

  // If a policy exists, allow it to decide first
  if (policy) {
    const planned = policy(context);

    // Policy explicitly requested a retry
    if (planned) {
      retryLogger?.debug?.("Retry policy returned a plan", {
        attempt: context.attempt,
        reason: planned.reason,
        delayMs: planned.delayMs,
      });
      return planned;
    }

    // Policy explicitly declined retry
    retryLogger?.debug?.("Retry policy declined to retry", {
      attempt: context.attempt,
    });
  }

  // Fallback to default retry heuristics
  return buildRetryPlan(context.error, context.attempt, context.logger);
}
