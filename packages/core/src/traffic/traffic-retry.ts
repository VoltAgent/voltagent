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
import { extractStatusCode, isTimeoutError } from "./traffic-error-utils";

export type RetryReason = "rateLimit" | "serverError" | "timeout";

export function buildRetryPlan(
  error: unknown,
  attempt: number,
): { delayMs: number; reason: RetryReason } | undefined {
  const reason = getRetryReason(error);
  if (!reason) return undefined;

  const max = reason === "timeout" ? TIMEOUT_RETRY_ATTEMPTS : MAX_RETRY_ATTEMPTS;
  if (attempt >= max) return undefined;

  return {
    reason,
    delayMs: computeBackoffDelay(reason, attempt),
  };
}

function getRetryReason(error: unknown): RetryReason | undefined {
  const status = extractStatusCode(error);
  if (status === 429) return "rateLimit";
  if (status && status >= 500) return "serverError";
  if (status === 408 || isTimeoutError(error)) return "timeout";
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
