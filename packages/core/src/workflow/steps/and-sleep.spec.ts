import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andSleep } from "./and-sleep";
import { andSleepUntil } from "./and-sleep-until";

afterEach(() => {
  vi.useRealTimers();
});

describe("andSleep", () => {
  it("returns input data after sleeping", async () => {
    const step = andSleep({
      id: "sleep",
      duration: 0,
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("waits for the configured duration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const step = andSleep({
      id: "sleep",
      duration: 100,
    });

    let resolved = false;
    const resultPromise = step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );
    resultPromise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(99);
    await Promise.resolve();
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await resultPromise;
    expect(result).toEqual({ ok: true });
  });

  it("treats negative durations as zero", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const step = andSleep({
      id: "sleep",
      duration: -10,
    });

    const resultPromise = step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );

    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result).toEqual({ ok: true });
  });
});

describe("andSleepUntil", () => {
  it("returns input data when sleepUntil is in the past", async () => {
    const step = andSleepUntil({
      id: "sleep-until",
      date: new Date(Date.now() - 1000),
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("waits until the target date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const step = andSleepUntil({
      id: "sleep-until",
      date: () => new Date(Date.now() + 100),
    });

    let resolved = false;
    const resultPromise = step.execute(
      createMockWorkflowExecuteContext({
        data: { ok: true },
      }),
    );
    resultPromise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(99);
    await Promise.resolve();
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await resultPromise;
    expect(result).toEqual({ ok: true });
  });

  it("throws when the date is invalid", async () => {
    const step = andSleepUntil({
      id: "sleep-until",
      date: new Date("invalid"),
    });

    await expect(
      step.execute(
        createMockWorkflowExecuteContext({
          data: { ok: true },
        }),
      ),
    ).rejects.toThrow("andSleepUntil expected a valid Date");
  });
});
