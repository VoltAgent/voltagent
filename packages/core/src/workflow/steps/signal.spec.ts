import { afterEach, describe, expect, it, vi } from "vitest";
import { waitWithSignal } from "./signal";

const MAX_TIMEOUT_MS = 2_147_483_647;

afterEach(() => {
  vi.useRealTimers();
});

describe("waitWithSignal", () => {
  it("waits for the full duration when it exceeds the timer limit", async () => {
    vi.useFakeTimers();

    const onComplete = vi.fn();
    const wait = waitWithSignal(MAX_TIMEOUT_MS + 100).then(onComplete);

    await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_MS + 99);
    expect(onComplete).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await wait;
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it.each([
    ["cancel", { type: "cancelled" }, "WORKFLOW_CANCELLED"],
    ["suspend", undefined, "WORKFLOW_SUSPENDED"],
  ])("can %s a long wait after the first timer elapses", async (_action, reason, error) => {
    vi.useFakeTimers();

    const controller = new AbortController();
    const wait = waitWithSignal(MAX_TIMEOUT_MS + 100, controller.signal);

    await vi.advanceTimersByTimeAsync(MAX_TIMEOUT_MS);
    controller.abort(reason);

    await expect(wait).rejects.toThrow(error);
    expect(vi.getTimerCount()).toBe(0);
  });
});
