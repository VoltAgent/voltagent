import { describe, expect, it, vi } from "vitest";
import { createSuspendController } from "./suspend-controller";

describe("createSuspendController", () => {
  it("should create a controller with all required methods", () => {
    const controller = createSuspendController();

    expect(controller).toBeDefined();
    expect(controller.signal).toBeInstanceOf(AbortSignal);
    expect(controller.suspend).toBeInstanceOf(Function);
    expect(controller.cancel).toBeInstanceOf(Function);
    expect(controller.isSuspended).toBeInstanceOf(Function);
    expect(controller.isCancelled).toBeInstanceOf(Function);
    expect(controller.getReason).toBeInstanceOf(Function);
    expect(controller.getCancelReason).toBeInstanceOf(Function);
  });

  it("should start in non-suspended state", () => {
    const controller = createSuspendController();

    expect(controller.isSuspended()).toBe(false);
    expect(controller.isCancelled()).toBe(false);
    expect(controller.getReason()).toBeUndefined();
    expect(controller.getCancelReason()).toBeUndefined();
    expect(controller.signal.aborted).toBe(false);
  });

  it("should suspend with a reason", () => {
    const controller = createSuspendController();
    const reason = "User requested suspension";

    controller.suspend(reason);

    expect(controller.isSuspended()).toBe(true);
    expect(controller.getReason()).toBe(reason);
    expect(controller.signal.aborted).toBe(true);
  });

  it("should suspend without a reason", () => {
    const controller = createSuspendController();

    controller.suspend();

    expect(controller.isSuspended()).toBe(true);
    expect(controller.getReason()).toBeUndefined();
    expect(controller.signal.aborted).toBe(true);
  });

  it("should cancel with a reason", () => {
    const controller = createSuspendController();
    const reason = "User requested cancellation";

    controller.cancel(reason);

    expect(controller.isCancelled()).toBe(true);
    expect(controller.isSuspended()).toBe(false);
    expect(controller.getReason()).toBe(reason);
    expect(controller.getCancelReason()).toBe(reason);
    expect(controller.signal.aborted).toBe(true);
  });

  it("should cancel without a reason", () => {
    const controller = createSuspendController();

    controller.cancel();

    expect(controller.isCancelled()).toBe(true);
    expect(controller.getCancelReason()).toBeUndefined();
    expect(controller.signal.aborted).toBe(true);
  });

  it("should maintain suspension state after multiple calls", () => {
    const controller = createSuspendController();

    controller.suspend("First reason");
    controller.suspend("Second reason");

    expect(controller.isSuspended()).toBe(true);
    expect(controller.getReason()).toBe("First reason"); // Should keep the first reason
    expect(controller.signal.aborted).toBe(true);
  });

  it("should not override cancellation with suspension", () => {
    const controller = createSuspendController();

    controller.cancel("Stop now");
    controller.suspend("Later suspend");

    expect(controller.isCancelled()).toBe(true);
    expect(controller.isSuspended()).toBe(false);
    expect(controller.getReason()).toBe("Stop now");
  });

  it("should work with AbortSignal event listeners", async () => {
    const controller = createSuspendController();

    const abortPromise = new Promise<void>((resolve) => {
      controller.signal.addEventListener("abort", () => {
        expect(controller.isSuspended()).toBe(true);
        expect(controller.getReason()).toBe("Test abort");
        resolve();
      });
    });

    controller.suspend("Test abort");

    await abortPromise;
  });

  it("should notify listeners when cancelled", async () => {
    const controller = createSuspendController();

    const abortPromise = new Promise<void>((resolve) => {
      controller.signal.addEventListener("abort", () => {
        expect(controller.isCancelled()).toBe(true);
        expect(controller.getCancelReason()).toBe("Test cancel");
        resolve();
      });
    });

    controller.cancel("Test cancel");

    await abortPromise;
  });

  it("should be independent instances", () => {
    const controller1 = createSuspendController();
    const controller2 = createSuspendController();

    controller1.suspend("Controller 1");

    expect(controller1.isSuspended()).toBe(true);
    expect(controller1.getReason()).toBe("Controller 1");
    expect(controller2.isSuspended()).toBe(false);
    expect(controller2.getReason()).toBeUndefined();
  });
});
