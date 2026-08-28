/**
 * Tests for FixedWindowCounterLimiter
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitExceededError } from "../errors";
import type { RateLimitConfig } from "../types";
import { FixedWindowCounterLimiter } from "./fixed-window";

describe("FixedWindowCounterLimiter", () => {
  let limiter: FixedWindowCounterLimiter;
  let config: RateLimitConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    config = {
      strategy: "fixed_window",
      limit: 5,
      windowMs: 60000, // 1 minute
      onExceeded: "throw",
    };
    limiter = new FixedWindowCounterLimiter(config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should initialize with provided config", () => {
      expect(limiter).toBeDefined();
      const stats = limiter.getStats();
      expect(stats.limit).toBe(5);
      expect(stats.remaining).toBe(5);
      expect(stats.current).toBe(0);
    });
  });

  describe("acquire", () => {
    it("should allow requests within limit", async () => {
      await expect(limiter.acquire()).resolves.not.toThrow();
      await expect(limiter.acquire()).resolves.not.toThrow();
      await expect(limiter.acquire()).resolves.not.toThrow();

      const stats = limiter.getStats();
      expect(stats.current).toBe(3);
      expect(stats.remaining).toBe(2);
    });

    it("should throw error when limit exceeded and onExceeded=throw", async () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      // Next request should throw
      await expect(limiter.acquire()).rejects.toThrow(RateLimitExceededError);
    });

    it("should delay when limit exceeded and onExceeded=delay", async () => {
      const delayLimiter = new FixedWindowCounterLimiter({
        ...config,
        onExceeded: "delay",
      });

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await delayLimiter.acquire();
      }

      // Next request should delay
      const acquirePromise = delayLimiter.acquire();

      // Should not resolve immediately
      let resolved = false;
      acquirePromise.then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(resolved).toBe(false);

      // Advance time to reset window
      await vi.advanceTimersByTimeAsync(60000);
      await acquirePromise;
      expect(resolved).toBe(true);
    });

    it("should reset counter when window expires", async () => {
      // Use 3 requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getStats().current).toBe(3);

      // Advance time past window
      await vi.advanceTimersByTimeAsync(60000);

      // Next acquire should reset counter
      await limiter.acquire();
      const stats = limiter.getStats();
      expect(stats.current).toBe(1);
      expect(stats.remaining).toBe(4);
    });
  });

  describe("check", () => {
    it("should return true when requests are available", async () => {
      expect(limiter.check()).toBe(true);
      await limiter.acquire();
      expect(limiter.check()).toBe(true);
    });
    it("should return false when limit is reached", async () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.check()).toBe(false);
    });

    it("should return true after window reset", async () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.check()).toBe(false);

      // Advance time past window
      await vi.advanceTimersByTimeAsync(60000);

      expect(limiter.check()).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return accurate statistics", async () => {
      await limiter.acquire();
      await limiter.acquire();

      const stats = limiter.getStats();
      expect(stats.limit).toBe(5);
      expect(stats.current).toBe(2);
      expect(stats.remaining).toBe(3);
      expect(stats.resetAt).toBeInstanceOf(Date);
    });

    it("should update resetAt based on windowMs", async () => {
      const now = Date.now();
      await limiter.acquire();

      const stats = limiter.getStats();
      const resetTime = stats.resetAt.getTime();

      // Reset time should be approximately now + windowMs
      expect(resetTime).toBeGreaterThanOrEqual(now + config.windowMs - 100);
      expect(resetTime).toBeLessThanOrEqual(now + config.windowMs + 100);
    });
  });

  describe("reset", () => {
    it("should reset counter and window", async () => {
      // Use some requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getStats().current).toBe(3);

      limiter.reset();

      const stats = limiter.getStats();
      expect(stats.current).toBe(0);
      expect(stats.remaining).toBe(5);
    });

    it("should allow requests after reset", async () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.check()).toBe(false);

      limiter.reset();

      expect(limiter.check()).toBe(true);
      await expect(limiter.acquire()).resolves.not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle limit of 1", async () => {
      const singleLimiter = new FixedWindowCounterLimiter({
        ...config,
        limit: 1,
      });

      await expect(singleLimiter.acquire()).resolves.not.toThrow();
      await expect(singleLimiter.acquire()).rejects.toThrow(RateLimitExceededError);
    });

    it("should handle very short windows", async () => {
      const shortWindowLimiter = new FixedWindowCounterLimiter({
        ...config,
        windowMs: 100, // 100ms window
      });

      await shortWindowLimiter.acquire();
      expect(shortWindowLimiter.check()).toBe(true);

      // Advance past window
      await vi.advanceTimersByTimeAsync(100);

      await shortWindowLimiter.acquire();
      expect(shortWindowLimiter.getStats().current).toBe(1);
    });

    it("should handle concurrent requests", async () => {
      const promises = Array.from({ length: 5 }, () => limiter.acquire());
      await expect(Promise.all(promises)).resolves.not.toThrow();

      const stats = limiter.getStats();
      expect(stats.current).toBe(5);
      expect(stats.remaining).toBe(0);

      await expect(limiter.acquire()).rejects.toThrow(RateLimitExceededError);
    });
  });
});
