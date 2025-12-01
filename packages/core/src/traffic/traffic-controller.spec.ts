import { describe, expect, it, vi } from "vitest";
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
      const controller = new TrafficController({
        maxConcurrent: 1,
        rateLimits: {
          "p0::m0": { capacity: 1, refillPerSecond: 1 },
        },
      });

      // Exhaust the bucket for the P0 key so it initially waits
      const buckets = (controller as unknown as { rateLimitBuckets: Map<string, any> })
        .rateLimitBuckets;
      buckets.set("p0::m0", {
        tokens: 0,
        capacity: 1,
        refillPerMs: 1 / 1000,
        lastRefill: Date.now(),
      });

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
