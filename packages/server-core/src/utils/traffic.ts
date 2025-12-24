import type { TrafficResponseMetadata } from "@voltagent/core";

export function buildTrafficHeaders(traffic?: TrafficResponseMetadata): Record<string, string> {
  if (!traffic) return {};

  const headers: Record<string, string> = {};

  if (typeof traffic.retryAfterMs === "number" && Number.isFinite(traffic.retryAfterMs)) {
    headers["Retry-After"] = String(Math.max(0, Math.ceil(traffic.retryAfterMs / 1000)));
  }

  if (traffic.rateLimitRemaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(traffic.rateLimitRemaining);
  }

  if (typeof traffic.rateLimitResetAt === "number" && Number.isFinite(traffic.rateLimitResetAt)) {
    headers["X-RateLimit-Reset"] = String(Math.max(0, Math.ceil(traffic.rateLimitResetAt / 1000)));
  } else if (
    typeof traffic.rateLimitResetInMs === "number" &&
    Number.isFinite(traffic.rateLimitResetInMs)
  ) {
    const resetAt = Date.now() + Math.max(0, traffic.rateLimitResetInMs);
    headers["X-RateLimit-Reset"] = String(Math.max(0, Math.ceil(resetAt / 1000)));
  }

  if (traffic.queueEtaMs !== undefined) {
    headers["X-Queue-ETA"] = String(traffic.queueEtaMs);
  }

  if (traffic.rateLimitKey) {
    headers["X-RateLimit-Key"] = traffic.rateLimitKey;
  }

  return headers;
}
