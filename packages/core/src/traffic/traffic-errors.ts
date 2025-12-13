import type { TrafficRequestMetadata } from "./traffic-types";

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
