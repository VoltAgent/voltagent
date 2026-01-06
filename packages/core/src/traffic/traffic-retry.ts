import type { Logger } from "../logger";
import {
  MAX_RETRY_ATTEMPTS,
  RATE_LIMIT_BASE_BACKOFF_MS,
  RATE_LIMIT_JITTER_FACTOR,
  SERVER_ERROR_BASE_BACKOFF_MS,
  SERVER_ERROR_JITTER_FACTOR,
  TIMEOUT_BASE_BACKOFF_MS,
  TIMEOUT_JITTER_FACTOR,
  TIMEOUT_RETRY_ATTEMPTS,
} from "./traffic-constants";
import { extractRetryAfterMs, extractStatusCode, isTimeoutError } from "./traffic-error-utils";
import { RateLimitedUpstreamError } from "./traffic-errors";
import type {
  RetryPlan,
  RetryPolicy,
  RetryPolicyConfig,
  RetryPolicyContext,
  RetryReason,
} from "./traffic-types";

export type {
  RetryPlan,
  RetryPolicy,
  RetryPolicyConfig,
  RetryPolicyContext,
  RetryReason,
} from "./traffic-types";

export function buildRetryPlan(
  error: unknown,
  attempt: number,
  logger?: Logger,
): RetryPlan | undefined {
  const retryLogger = logger?.child({ module: "retry" });
  const reason = getRetryReason(error, retryLogger);
  if (!reason) {
    retryLogger?.debug?.("No retry reason detected; skipping retry", { attempt });
    return undefined;
  }

  const max = reason === "timeout" ? TIMEOUT_RETRY_ATTEMPTS : MAX_RETRY_ATTEMPTS;
  if (attempt >= max) {
    retryLogger?.debug?.("Retry attempts exhausted; skipping retry", {
      attempt,
      max,
      reason,
    });
    return undefined;
  }

  const computedDelayMs = computeBackoffDelay(reason, attempt);
  const retryAfterMs =
    reason === "rateLimit"
      ? error instanceof RateLimitedUpstreamError
        ? error.retryAfterMs
        : extractRetryAfterMs(error, retryLogger)
      : undefined;
  const delayMs =
    retryAfterMs === undefined ? computedDelayMs : Math.max(computedDelayMs, retryAfterMs);

  retryLogger?.debug?.("Retry plan built", {
    attempt,
    reason,
    delayMs,
    computedDelayMs,
    retryAfterMs,
    max,
  });

  return {
    reason,
    delayMs,
  };
}

export function buildRetryPlanWithPolicy(
  context: RetryPolicyContext,
  policyConfig?: RetryPolicyConfig,
): RetryPlan | undefined {
  const retryLogger = context.logger?.child({ module: "retry" });
  const policy = resolveRetryPolicy(context, policyConfig);
  if (policy) {
    const planned = policy(context);
    if (planned) {
      retryLogger?.debug?.("Retry policy returned a plan", {
        attempt: context.attempt,
        reason: planned.reason,
        delayMs: planned.delayMs,
      });
      return planned;
    }
    retryLogger?.debug?.("Retry policy declined to retry", { attempt: context.attempt });
  }

  return buildRetryPlan(context.error, context.attempt, context.logger);
}

function resolveRetryPolicy(
  context: RetryPolicyContext,
  config?: RetryPolicyConfig,
): RetryPolicy | undefined {
  if (!config) return undefined;
  const modelPolicy = context.key ? config.models?.[context.key] : undefined;
  if (modelPolicy) return modelPolicy;
  const providerModelKey =
    context.metadata?.provider && context.metadata?.model
      ? `${context.metadata.provider}::${context.metadata.model}`
      : undefined;
  const providerModelPolicy = providerModelKey ? config.models?.[providerModelKey] : undefined;
  if (providerModelPolicy) return providerModelPolicy;
  const provider = context.metadata?.provider;
  const providerPolicy = provider ? config.providers?.[provider] : undefined;
  if (providerPolicy) return providerPolicy;
  return config.default;
}

function getRetryReason(error: unknown, logger?: Logger): RetryReason | undefined {
  if (error instanceof RateLimitedUpstreamError) return "rateLimit";
  const status = extractStatusCode(error, logger);
  if (status === 429) return "rateLimit";
  if (status && status >= 500) return "serverError";
  if (status === 408 || isTimeoutError(error, logger)) return "timeout";
  return undefined;
}

function computeBackoffDelay(reason: RetryReason, attempt: number): number {
  const base =
    reason === "serverError"
      ? SERVER_ERROR_BASE_BACKOFF_MS
      : reason === "timeout"
        ? TIMEOUT_BASE_BACKOFF_MS
        : RATE_LIMIT_BASE_BACKOFF_MS;

  const jitter =
    reason === "serverError"
      ? SERVER_ERROR_JITTER_FACTOR
      : reason === "timeout"
        ? TIMEOUT_JITTER_FACTOR
        : RATE_LIMIT_JITTER_FACTOR;

  const exp = base * 2 ** (attempt - 1);
  return Math.round(exp + exp * jitter * Math.random());
}
