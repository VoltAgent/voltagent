import { describe, expect, it, vi } from "vitest";
import { buildRetryPlan } from "./traffic-retry";

describe("buildRetryPlan", () => {
  it("respects Retry-After for 429s", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      const plan = buildRetryPlan(
        {
          status: 429,
          response: { headers: { "retry-after": "2" } },
        },
        1,
      );

      expect(plan).toBeTruthy();
      expect(plan?.reason).toBe("rateLimit");
      expect(plan?.delayMs).toBeGreaterThanOrEqual(2_000);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("parses HTTP-date Retry-After values", () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
      const plan = buildRetryPlan(
        {
          statusCode: 429,
          response: { headers: { "retry-after": "Wed, 01 Jan 2020 00:00:03 GMT" } },
        },
        1,
      );

      expect(plan).toBeTruthy();
      expect(plan?.delayMs).toBeGreaterThanOrEqual(3_000);
    } finally {
      vi.useRealTimers();
      randomSpy.mockRestore();
    }
  });
});
