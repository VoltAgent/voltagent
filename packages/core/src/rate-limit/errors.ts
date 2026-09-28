/**
 * Custom errors for rate limiting
 */

import type { RateLimitStats } from "./types";

/**
 * Error thrown when rate limit is exceeded and onExceeded='throw'
 */
export class RateLimitExceededError extends Error {
  /** Current rate limit statistics */
  public readonly stats: RateLimitStats;
  /** When the rate limit will reset */
  public readonly resetAt: Date;
  /** Scope that was rate limited */
  public readonly scope: string;

  /**
   * Milliseconds until reset (dynamically calculated)
   * Always returns fresh value based on current time
   */
  public get retryAfter(): number {
    return Math.max(0, this.resetAt.getTime() - Date.now());
  }

  constructor(params: { stats: RateLimitStats; scope: string; message?: string }) {
    const defaultMessage = `Rate limit exceeded for ${params.scope}. Limit: ${params.stats.limit} requests. Resets at ${params.stats.resetAt.toISOString()}`;
    super(params.message || defaultMessage);

    this.name = "RateLimitExceededError";
    this.stats = params.stats;
    this.resetAt = params.stats.resetAt;
    this.scope = params.scope;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitExceededError);
    }
  }

  /**
   * Get a user-friendly error message
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      scope: this.scope,
      retryAfter: this.retryAfter,
      resetAt: this.resetAt.toISOString(),
      stats: this.stats,
    };
  }
}
