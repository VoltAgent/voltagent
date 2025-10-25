/**
 * Fixed Window Counter Rate Limiter
 *
 * Implements a simple fixed-window rate limiting algorithm:
 * - Tracks number of requests in a fixed time window
 * - Resets counter when window expires
 * - Efficient and easy to understand
 *
 * Example: 10 requests per minute
 * - Window: 0:00 - 1:00, allows 10 requests
 * - At 1:00, window resets, allows 10 more requests
 */

import { RateLimitExceededError } from "../errors";
import type { RateLimiter, RateLimitExceededAction, RateLimitStats } from "../types";

export interface FixedWindowCounterConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Action when limit exceeded */
  onExceeded?: RateLimitExceededAction;
  /** Scope identifier for error messages */
  scope?: string;
}

export class FixedWindowCounterLimiter implements RateLimiter {
  private count: number = 0;
  private windowStart: number;
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly onExceeded: RateLimitExceededAction;
  private readonly scope: string;

  constructor(config: FixedWindowCounterConfig) {
    this.limit = config.limit;
    this.windowMs = config.windowMs;
    this.onExceeded = config.onExceeded || "delay";
    this.scope = config.scope || "unknown";
    this.windowStart = Date.now();
  }

  /**
   * Acquire permission to proceed
   * Either waits or throws based on onExceeded configuration
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.count = 0;
      this.windowStart = now;
    }

    // Check if we're over the limit
    if (this.count >= this.limit) {
      const stats = this.getStats();

      if (this.onExceeded === "throw") {
        throw new RateLimitExceededError({
          stats,
          scope: this.scope,
        });
      } else {
        // Delay until window resets
        const waitTime = this.windowStart + this.windowMs - now;
        if (waitTime > 0) {
          await this.delay(waitTime);
        }
        // After waiting, reset window and retry
        this.count = 0;
        this.windowStart = Date.now();
      }
    }

    // Increment counter
    this.count++;
  }

  /**
   * Check if request can proceed without blocking
   */
  check(): boolean {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      return true;
    }

    return this.count < this.limit;
  }

  /**
   * Get current statistics
   */
  getStats(): RateLimitStats {
    const now = Date.now();
    const resetAt = new Date(this.windowStart + this.windowMs);

    // If window has expired, return fresh stats
    if (now - this.windowStart >= this.windowMs) {
      return {
        remaining: this.limit,
        limit: this.limit,
        current: 0,
        resetAt: new Date(now + this.windowMs),
      };
    }

    return {
      remaining: Math.max(0, this.limit - this.count),
      limit: this.limit,
      current: this.count,
      resetAt,
    };
  }

  /**
   * Reset the limiter state
   */
  reset(): void {
    this.count = 0;
    this.windowStart = Date.now();
  }

  /**
   * Internal delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
