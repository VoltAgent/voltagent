/**
 * Tests for RateLimitManager
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitExceededError } from "./errors";
import { RateLimitManager } from "./manager";
import type { AgentRateLimitConfig } from "./types";

describe("RateLimitManager", () => {
  let manager: RateLimitManager;
  let config: AgentRateLimitConfig;

  beforeEach(() => {
    vi.useFakeTimers();
    config = {
      llm: {
        maxRequestsPerMinute: 10,
        strategy: "fixed_window",
        onExceeded: "throw",
      },
      providers: {
        openai: {
          maxRequestsPerMinute: 5,
          strategy: "fixed_window",
          onExceeded: "throw",
        },
      },
      tools: {
        search_tool: {
          maxRequestsPerMinute: 3,
          strategy: "fixed_window",
          onExceeded: "throw",
        },
      },
    };
    manager = new RateLimitManager("test-agent", config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should initialize with provided config", () => {
      expect(manager).toBeDefined();
    });
  });

  describe("checkLLMRateLimit", () => {
    it("should allow requests within global LLM limit", async () => {
      for (let i = 0; i < 10; i++) {
        await expect(
          manager.checkLLMRateLimit({ provider: "unknown", model: "test-model" })
        ).resolves.not.toThrow();
      }

      // 11th request should throw
      await expect(
        manager.checkLLMRateLimit({ provider: "unknown", model: "test-model" })
      ).rejects.toThrow(RateLimitExceededError);
    });

    it("should prioritize provider-specific limit over global limit", async () => {
      // OpenAI has limit of 5, global has 10
      for (let i = 0; i < 5; i++) {
        await expect(
          manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" })
        ).resolves.not.toThrow();
      }

      // 6th OpenAI request should throw
      await expect(
        manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" })
      ).rejects.toThrow(RateLimitExceededError);
    });

    it("should handle different providers independently", async () => {
      // Use 5 OpenAI requests
      for (let i = 0; i < 5; i++) {
        await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });
      }

      // Claude should still have full global limit available
      for (let i = 0; i < 10; i++) {
        await expect(
          manager.checkLLMRateLimit({ provider: "anthropic", model: "claude-3" })
        ).resolves.not.toThrow();
      }
    });

    it("should allow requests when no limit configured", async () => {
      const noLimitManager = new RateLimitManager("test-agent", {});

      for (let i = 0; i < 100; i++) {
        await expect(
          noLimitManager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" })
        ).resolves.not.toThrow();
      }
    });

    it("should handle provider name case-insensitively", async () => {
      await manager.checkLLMRateLimit({ provider: "OpenAI", model: "gpt-4" });
      await manager.checkLLMRateLimit({ provider: "OPENAI", model: "gpt-4" });
      await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });

      const stats = manager.getAllStats();
      // Should only have one limiter for openai
      const openaiKeys = Object.keys(stats).filter((key) => key.includes("openai"));
      expect(openaiKeys.length).toBe(1);
    });
  });

  describe("checkToolRateLimit", () => {
    it("should allow requests within tool limit", async () => {
      for (let i = 0; i < 3; i++) {
        await expect(manager.checkToolRateLimit("search_tool")).resolves.not.toThrow();
      }

      // 4th request should throw
      await expect(manager.checkToolRateLimit("search_tool")).rejects.toThrow(
        RateLimitExceededError
      );
    });

    it("should allow unlimited requests for unconfigured tools", async () => {
      for (let i = 0; i < 100; i++) {
        await expect(manager.checkToolRateLimit("unconfigured_tool")).resolves.not.toThrow();
      }
    });

    it("should handle different tools independently", async () => {
      // Use up search_tool limit
      for (let i = 0; i < 3; i++) {
        await manager.checkToolRateLimit("search_tool");
      }

      // Other tools should work fine
      await expect(manager.checkToolRateLimit("other_tool")).resolves.not.toThrow();
    });
  });

  describe("getAllStats", () => {
    it("should return stats for all active limiters", async () => {
      // Trigger creation of different limiters
      await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });
      await manager.checkLLMRateLimit({ provider: "anthropic", model: "claude-3" });
      await manager.checkToolRateLimit("search_tool");

      const stats = manager.getAllStats();
      expect(Object.keys(stats).length).toBeGreaterThan(0);

      for (const [key, stat] of Object.entries(stats)) {
        expect(key).toBeTruthy();
        expect(stat).toHaveProperty("limit");
        expect(stat).toHaveProperty("current");
        expect(stat).toHaveProperty("remaining");
        expect(stat).toHaveProperty("resetAt");
      }
    });

    it("should return empty object when no limiters created", () => {
      const stats = manager.getAllStats();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe("resetAll", () => {
    it("should reset all active limiters", async () => {
      // Use some requests
      await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });
      await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });
      await manager.checkToolRateLimit("search_tool");

      manager.resetAll();

      const stats = manager.getAllStats();
      for (const stat of Object.values(stats)) {
        expect(stat.current).toBe(0);
        expect(stat.remaining).toBe(stat.limit);
      }
    });

    it("should allow requests after reset", async () => {
      // Use up openai limit
      for (let i = 0; i < 5; i++) {
        await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });
      }

      await expect(
        manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" })
      ).rejects.toThrow(RateLimitExceededError);

      manager.resetAll();

      await expect(
        manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" })
      ).resolves.not.toThrow();
    });
  });

  describe("limiter creation", () => {
    it("should create limiter on first access", async () => {
      const stats1 = manager.getAllStats();
      expect(Object.keys(stats1).length).toBe(0);

      await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });

      const stats2 = manager.getAllStats();
      expect(Object.keys(stats2).length).toBe(1);
    });

    it("should reuse existing limiter", async () => {
      await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });
      await manager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" });

      const stats = manager.getAllStats();
      expect(Object.keys(stats).length).toBe(1); // Only one limiter should exist

      const openaiStats = Object.values(stats)[0];
      expect(openaiStats.current).toBe(2); // Both requests counted
    });
  });

  describe("configuration validation", () => {
    it("should handle missing maxRequestsPerMinute gracefully", async () => {
      const invalidConfig = {
        llm: {
          strategy: "fixed_window" as const,
          onExceeded: "throw" as const,
          // Missing maxRequestsPerMinute - should be allowed through without rate limiting
        },
      };

      const invalidManager = new RateLimitManager("test", invalidConfig);

      // Should not throw - when config is invalid/incomplete, it allows requests through
      // This is a graceful degradation approach
      await expect(
        invalidManager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" })
      ).resolves.not.toThrow();

      // Verify multiple requests are allowed (no rate limiting applied)
      for (let i = 0; i < 10; i++) {
        await expect(
          invalidManager.checkLLMRateLimit({ provider: "openai", model: "gpt-4" })
        ).resolves.not.toThrow();
      }
    });
  });

  describe("delay behavior", () => {
    it("should delay requests when onExceeded=delay", async () => {
      const delayConfig: AgentRateLimitConfig = {
        llm: {
          maxRequestsPerMinute: 2,
          strategy: "fixed_window",
          onExceeded: "delay",
        },
      };

      const delayManager = new RateLimitManager("test-agent", delayConfig);

      // Use up limit
      await delayManager.checkLLMRateLimit({ provider: "test", model: "test" });
      await delayManager.checkLLMRateLimit({ provider: "test", model: "test" });

      // Next request should delay
      const checkPromise = delayManager.checkLLMRateLimit({ provider: "test", model: "test" });

      let resolved = false;
      checkPromise.then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(resolved).toBe(false);

      // Advance to reset
      await vi.advanceTimersByTimeAsync(60000);
      await checkPromise;
      expect(resolved).toBe(true);
    });
  });
});
