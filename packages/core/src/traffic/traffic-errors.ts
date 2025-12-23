import type { Logger } from "../logger";
import { extractRetryAfterMs, extractStatusCode } from "./traffic-error-utils";
import type { TrafficRequestMetadata } from "./traffic-types";

export type RateLimitErrorOptions = {
  metadata?: TrafficRequestMetadata;
  retryAfterMs?: number;
  tenantId?: string;
  key?: string;
};

export class CircuitBreakerOpenError extends Error {
  readonly retryAfterMs?: number;
  readonly metadata?: TrafficRequestMetadata;

  constructor(message: string, metadata?: TrafficRequestMetadata, retryAfterMs?: number) {
    super(message);
    this.name = "CircuitBreakerOpenError";
    this.metadata = metadata;
    this.retryAfterMs = retryAfterMs;
  }
}

export class RateLimitedUpstreamError extends Error {
  readonly status = 429;
  readonly retryAfterMs?: number;
  readonly metadata?: TrafficRequestMetadata;
  readonly provider?: string;
  readonly model?: string;
  readonly tenantId?: string;
  readonly key?: string;

  constructor(
    message: string,
    metadata?: TrafficRequestMetadata,
    retryAfterMs?: number,
    options?: { tenantId?: string; key?: string },
  );
  constructor(message: string, options?: RateLimitErrorOptions);
  constructor(
    message: string,
    metadataOrOptions?: TrafficRequestMetadata | RateLimitErrorOptions,
    retryAfterMs?: number,
    legacyOptions?: { tenantId?: string; key?: string },
  ) {
    super(message);
    this.name = "RateLimitedUpstreamError";
    const isOptions =
      metadataOrOptions &&
      (Object.prototype.hasOwnProperty.call(metadataOrOptions, "metadata") ||
        Object.prototype.hasOwnProperty.call(metadataOrOptions, "retryAfterMs") ||
        Object.prototype.hasOwnProperty.call(metadataOrOptions, "key"));

    const metadata = isOptions
      ? (metadataOrOptions as RateLimitErrorOptions).metadata
      : (metadataOrOptions as TrafficRequestMetadata | undefined);
    const retryAfter = isOptions
      ? (metadataOrOptions as RateLimitErrorOptions).retryAfterMs
      : retryAfterMs;
    const tenantId = isOptions
      ? (metadataOrOptions as RateLimitErrorOptions).tenantId
      : legacyOptions?.tenantId;
    const key = isOptions ? (metadataOrOptions as RateLimitErrorOptions).key : legacyOptions?.key;

    this.metadata = metadata;
    this.retryAfterMs = retryAfter;
    this.provider = metadata?.provider;
    this.model = metadata?.model;
    this.tenantId = tenantId ?? metadata?.tenantId;
    this.key = key;
  }
}

export function normalizeRateLimitError(options: {
  error: unknown;
  metadata?: TrafficRequestMetadata;
  tenantId?: string;
  key?: string;
  logger?: Logger;
}): RateLimitedUpstreamError | undefined {
  const { error, metadata, tenantId, key, logger } = options;
  const retryAfterMs =
    error instanceof RateLimitedUpstreamError
      ? (error.retryAfterMs ?? extractRetryAfterMs(error, logger))
      : extractRetryAfterMs(error, logger);

  if (error instanceof RateLimitedUpstreamError) {
    const baseMetadata = metadata ?? error.metadata;
    const baseTenant = tenantId ?? error.tenantId;
    const baseKey = key ?? error.key;
    if (
      error.metadata === baseMetadata &&
      error.retryAfterMs === retryAfterMs &&
      error.tenantId === baseTenant &&
      error.key === baseKey
    ) {
      return error;
    }
    return new RateLimitedUpstreamError(error.message, {
      metadata: baseMetadata,
      retryAfterMs,
      tenantId: baseTenant,
      key: baseKey,
    });
  }

  const status = extractStatusCode(error, logger);
  if (status !== 429) return undefined;

  const message = error instanceof Error ? error.message : "Rate limit exceeded";
  return new RateLimitedUpstreamError(message, {
    metadata,
    retryAfterMs,
    tenantId,
    key,
  });
}
