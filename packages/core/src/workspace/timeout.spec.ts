import { afterEach, describe, expect, it, vi } from "vitest";
import { withOperationTimeout } from "./timeout";

describe("withOperationTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the task result when no timeout is set", async () => {
    const result = await withOperationTimeout(async () => "ok", undefined, undefined);
    expect(result).toBe("ok");
  });

  it("throws when the timeout elapses", async () => {
    vi.useFakeTimers();
    const task = () =>
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("late"), 50);
      });

    const promise = withOperationTimeout(task, undefined, 10);
    const expectation = expect(promise).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(20);
    await expectation;
  });

  it("throws when the abort signal is already aborted", async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      withOperationTimeout(async () => "ok", { abortController } as any, 100),
    ).rejects.toThrow("aborted");
  });
});
