import { describe, expect, it, vi } from "vitest";
import { CIRCUIT_FAILURE_THRESHOLD, RATE_LIMIT_PROBE_DELAY_MS } from "./traffic-constants";
import { TrafficController } from "./traffic-controller";

describe("TrafficController priority scheduling", () => {
  it("prioritizes P0 over lower priorities when runnable", async () => {
    const controller = new TrafficController({ maxConcurrent: 1 });
    const order: string[] = [];

    const p1 = controller.handleText({
      metadata: { provider: "p", model: "m1", priority: "P1" },
      execute: async () => {
        order.push("P1");
        return "P1";
      },
    });

    const p2 = controller.handleText({
      metadata: { provider: "p", model: "m2", priority: "P2" },
      execute: async () => {
        order.push("P2");
        return "P2";
      },
    });

    const p0 = controller.handleText({
      metadata: { provider: "p", model: "m0", priority: "P0" },
      execute: async () => {
        order.push("P0");
        return "P0";
      },
    });

    await Promise.all([p0, p1, p2]);

    expect(order[0]).toBe("P0");
    expect(order).toEqual(["P0", "P1", "P2"]);
  });

  it("allows lower priorities to proceed when a higher priority request is rate limited", async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({ maxConcurrent: 1 });
      controller.updateRateLimitFromHeaders(
        { provider: "p0", model: "m0" },
        {
          "x-ratelimit-limit-requests": "1",
          "x-ratelimit-remaining-requests": "0",
          "x-ratelimit-reset-requests": "1s",
        },
      );

      const order: string[] = [];

      const p0 = controller.handleText({
        metadata: { provider: "p0", model: "m0", priority: "P0" },
        execute: async () => {
          order.push("P0");
          return "P0";
        },
      });

      const p1 = controller.handleText({
        metadata: { provider: "p1", model: "m1", priority: "P1" },
        execute: async () => {
          order.push("P1");
          return "P1";
        },
      });

      await vi.runAllTimersAsync();
      await Promise.all([p0, p1]);

      expect(order[0]).toBe("P1");
      expect(order[1]).toBe("P0");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TrafficController concurrency limits", () => {
  it("shares provider/model limits across tenants", async () => {
    const controller = new TrafficController({
      maxConcurrent: 2,
      maxConcurrentPerProviderModel: 1,
    });
    const started: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = controller.handleText({
      tenantId: "tenant-a",
      metadata: { provider: "openai", model: "gpt-4o", priority: "P1" },
      execute: async () => {
        started.push("tenant-a");
        await firstGate;
        return "a";
      },
    });

    const second = controller.handleText({
      tenantId: "tenant-b",
      metadata: { provider: "openai", model: "gpt-4o", priority: "P1" },
      execute: async () => {
        started.push("tenant-b");
        return "b";
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual(["tenant-a"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(started).toEqual(["tenant-a", "tenant-b"]);
  });
});

describe("TrafficController rate limit headers", () => {
  it("parses OpenAI-style compound reset durations (e.g. 1m30.951s)", () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(1_000_000));
      const controller = new TrafficController({ maxConcurrent: 1 });
      const now = Date.now();

      const result = controller.updateRateLimitFromHeaders(
        { provider: "openai.responses", model: "gpt-4o-mini" },
        {
          "x-ratelimit-limit-requests": "10000",
          "x-ratelimit-remaining-requests": "9989",
          "x-ratelimit-reset-requests": "1m30.951s",
        },
      );

      expect(result).toBeTruthy();
      expect(result?.headerSnapshot.resetRequestsMs).toBeCloseTo(90_951, 6);
      expect(result?.state.limit).toBe(10000);
      expect(result?.state.remaining).toBe(9989);
      expect(result?.state.resetAt).toBe(now + 90_951);
      expect(result?.state.reserved).toBe(0);
      expect(result?.state.nextAllowedAt).toBe(now);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps resetAt monotonic when headers shorten the reset duration", () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({ maxConcurrent: 1 });

      const first = controller.updateRateLimitFromHeaders(
        { provider: "openai.responses", model: "gpt-4o-mini" },
        {
          "x-ratelimit-limit-requests": "10000",
          "x-ratelimit-remaining-requests": "9999",
          "x-ratelimit-reset-requests": "60s",
        },
      );

      expect(first).toBeTruthy();
      expect(first?.state.resetAt).toBe(60_000);

      vi.setSystemTime(new Date(10_000));
      const second = controller.updateRateLimitFromHeaders(
        { provider: "openai.responses", model: "gpt-4o-mini" },
        {
          "x-ratelimit-limit-requests": "10000",
          "x-ratelimit-remaining-requests": "9998",
          "x-ratelimit-reset-requests": "5s",
        },
      );

      expect(second).toBeTruthy();
      expect(second?.state.resetAt).toBe(60_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never increases remaining within the same window", () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({ maxConcurrent: 1 });

      const first = controller.updateRateLimitFromHeaders(
        { provider: "openai.responses", model: "gpt-4o-mini" },
        {
          "x-ratelimit-limit-requests": "10",
          "x-ratelimit-remaining-requests": "9",
          "x-ratelimit-reset-requests": "60s",
        },
      );

      expect(first?.state.remaining).toBe(9);
      expect(first?.state.resetAt).toBe(60_000);

      vi.setSystemTime(new Date(10_000));
      const second = controller.updateRateLimitFromHeaders(
        { provider: "openai.responses", model: "gpt-4o-mini" },
        {
          "x-ratelimit-limit-requests": "10",
          "x-ratelimit-remaining-requests": "8",
          "x-ratelimit-reset-requests": "50s",
        },
      );

      expect(second?.state.remaining).toBe(8);
      expect(second?.state.resetAt).toBe(60_000);

      vi.setSystemTime(new Date(20_000));
      const third = controller.updateRateLimitFromHeaders(
        { provider: "openai.responses", model: "gpt-4o-mini" },
        {
          "x-ratelimit-limit-requests": "10",
          "x-ratelimit-remaining-requests": "9",
          "x-ratelimit-reset-requests": "40s",
        },
      );

      expect(third?.state.remaining).toBe(8);
      expect(third?.state.resetAt).toBe(60_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies Retry-After even when x-ratelimit headers are missing", async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({ maxConcurrent: 1 });
      const order: string[] = [];

      controller.updateRateLimitFromHeaders(
        { provider: "p", model: "m" },
        {
          "retry-after": "2",
        },
      );

      const p0 = controller.handleText({
        metadata: { provider: "p", model: "m", priority: "P0" },
        execute: async () => {
          order.push("P0");
          return "P0";
        },
      });

      await vi.advanceTimersByTimeAsync(1_999);
      expect(order).toEqual([]);

      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();
      await p0;
      expect(order).toEqual(["P0"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TrafficController token limits", () => {
  it("blocks OpenAI when the token window is exhausted even without RPM config", async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({
        maxConcurrent: 1,
        rateLimits: {
          "openai::gpt-4o": {
            requestsPerMinute: 0,
            tokensPerMinute: 2,
          },
        },
      });
      const order: string[] = [];

      const first = controller.handleText({
        tenantId: "tenant-a",
        metadata: { provider: "openai", model: "gpt-4o", priority: "P1" },
        execute: async () => {
          order.push("first");
          return "first";
        },
        extractUsage: () => ({ totalTokens: 2 }),
      });

      const second = controller.handleText({
        tenantId: "tenant-b",
        metadata: { provider: "openai", model: "gpt-4o", priority: "P1" },
        execute: async () => {
          order.push("second");
          return "second";
        },
        extractUsage: () => ({ totalTokens: 1 }),
      });

      await first;
      expect(order).toEqual(["first"]);

      await vi.advanceTimersByTimeAsync(60_000 + RATE_LIMIT_PROBE_DELAY_MS - 1);
      expect(order).toEqual(["first"]);

      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();
      await second;
      expect(order).toEqual(["first", "second"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reserves estimated tokens before dispatch", async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({
        maxConcurrent: 2,
        rateLimits: {
          "openai::gpt-4o": {
            requestsPerMinute: 0,
            tokensPerMinute: 2,
          },
        },
      });
      const order: string[] = [];
      let releaseFirst!: () => void;
      const firstGate = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      const first = controller.handleText({
        tenantId: "tenant-a",
        metadata: { provider: "openai", model: "gpt-4o", priority: "P1" },
        estimatedTokens: 2,
        execute: async () => {
          order.push("first");
          await firstGate;
          return "first";
        },
        extractUsage: () => ({ totalTokens: 2 }),
      });

      const second = controller.handleText({
        tenantId: "tenant-b",
        metadata: { provider: "openai", model: "gpt-4o", priority: "P1" },
        estimatedTokens: 1,
        execute: async () => {
          order.push("second");
          return "second";
        },
        extractUsage: () => ({ totalTokens: 1 }),
      });

      await Promise.resolve();
      expect(order).toEqual(["first"]);

      await vi.advanceTimersByTimeAsync(60_000 + RATE_LIMIT_PROBE_DELAY_MS - 1);
      await Promise.resolve();
      expect(order).toEqual(["first"]);

      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();
      await Promise.resolve();
      expect(order).toEqual(["first", "second"]);

      releaseFirst();
      await Promise.all([first, second]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TrafficController stream reporting", () => {
  it("slows down after stream 429 errors", async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({
        maxConcurrent: 1,
        adaptiveLimiter: {
          windowMs: 1_000,
          threshold: 1,
          minPenaltyMs: 10,
          maxPenaltyMs: 10,
          penaltyMultiplier: 1,
          decayMs: 1_000,
        },
      });
      const metadata = {
        provider: "p",
        model: "m",
        priority: "P1" as const,
        tenantId: "tenant-a",
      };

      controller.reportStreamFailure(
        metadata,
        Object.assign(new Error("rate limit"), { status: 429 }),
      );

      const order: string[] = [];
      const request = controller.handleText({
        tenantId: "tenant-a",
        metadata,
        execute: async () => {
          order.push("run");
          return "ok";
        },
      });

      await Promise.resolve();
      expect(order).toEqual([]);

      await vi.advanceTimersByTimeAsync(9);
      await Promise.resolve();
      expect(order).toEqual([]);

      await vi.advanceTimersByTimeAsync(1);
      await vi.runAllTimersAsync();
      await request;
      expect(order).toEqual(["run"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats post-start stream failures as circuit breaker failures", async () => {
    const controller = new TrafficController({
      maxConcurrent: 1,
      fallbackChains: {
        primary: ["fallback"],
      },
    });
    const tenantId = "tenant-1";
    const metadata = { provider: "p", model: "primary", priority: "P1" as const };

    await controller.handleStream({
      tenantId,
      metadata,
      execute: async () => ({ ok: true }),
    });

    for (let i = 0; i < CIRCUIT_FAILURE_THRESHOLD; i += 1) {
      controller.reportStreamFailure(metadata, new Error("stream-failure"));
    }

    const order: string[] = [];
    await controller.handleStream({
      tenantId,
      metadata,
      execute: async () => {
        order.push("primary");
        return "primary";
      },
      createFallbackRequest: (target) => ({
        tenantId,
        metadata: {
          provider: "p",
          model: typeof target === "string" ? target : target.model,
          priority: "P1",
        },
        execute: async () => {
          const modelId = typeof target === "string" ? target : target.model;
          order.push(modelId);
          return modelId;
        },
      }),
    });

    expect(order).toEqual(["fallback"]);
  });
});

describe("TrafficController queue timeouts", () => {
  it("lets fallback requests wait after queue timeout without rejecting", async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date(0));
      const controller = new TrafficController({
        maxConcurrent: 1,
        fallbackChains: {
          "p::m": ["m-fallback"],
        },
      });
      const order: string[] = [];
      let releaseFirst!: () => void;
      const firstGate = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });

      const first = controller.handleText({
        tenantId: "tenant-a",
        metadata: { provider: "p", model: "m", priority: "P1" },
        execute: async () => {
          order.push("first");
          await firstGate;
          return "first";
        },
      });

      const second = controller.handleText({
        tenantId: "tenant-a",
        metadata: { provider: "p", model: "m", priority: "P1" },
        maxQueueWaitMs: 1,
        execute: async () => {
          order.push("primary");
          return "primary";
        },
        createFallbackRequest: (target) => ({
          tenantId: "tenant-a",
          metadata: {
            provider: "p",
            model: typeof target === "string" ? target : target.model,
            priority: "P1",
          },
          maxQueueWaitMs: 1,
          execute: async () => {
            order.push("fallback");
            return "fallback";
          },
        }),
      });

      await Promise.resolve();
      expect(order).toEqual(["first"]);

      await vi.advanceTimersByTimeAsync(2);

      const third = controller.handleText({
        tenantId: "tenant-a",
        metadata: { provider: "p", model: "other", priority: "P1" },
        execute: async () => {
          order.push("third");
          return "third";
        },
      });

      await Promise.resolve();
      expect(order).toEqual(["first"]);

      releaseFirst();
      await vi.runAllTimersAsync();

      await expect(second).resolves.toBe("fallback");
      await Promise.all([first, third]);

      expect(order).toEqual(["first", "fallback", "third"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
