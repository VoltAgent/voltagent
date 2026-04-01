import { describe, expect, it, vi } from "vitest";
import { ElysiaSseBridge } from "./elysia-sse-bridge";

describe("ElysiaSseBridge", () => {
  it("should send events correctly", async () => {
    const sendEvent = vi.fn();
    const closeStream = vi.fn();
    const bridge = new ElysiaSseBridge(sendEvent, closeStream);

    await bridge.send({
      data: "test data",
      event: "test-event",
      id: "123",
    });

    expect(sendEvent).toHaveBeenCalledWith("test data", {
      event: "test-event",
      id: "123",
    });
  });

  it("should close the stream correctly", async () => {
    const sendEvent = vi.fn();
    const closeStream = vi.fn();
    const bridge = new ElysiaSseBridge(sendEvent, closeStream);

    await bridge.close();

    expect(closeStream).toHaveBeenCalled();
  });

  it("should handle abort signal", async () => {
    const sendEvent = vi.fn();
    const closeStream = vi.fn();
    const controller = new AbortController();
    const bridge = new ElysiaSseBridge(sendEvent, closeStream, controller.signal);

    const abortListener = vi.fn();
    bridge.onAbort(abortListener);

    controller.abort();

    // Wait for microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(abortListener).toHaveBeenCalled();
  });

  it("should call abort listener immediately if already aborted", async () => {
    const sendEvent = vi.fn();
    const closeStream = vi.fn();
    const controller = new AbortController();
    controller.abort();

    const bridge = new ElysiaSseBridge(sendEvent, closeStream, controller.signal);

    const abortListener = vi.fn();
    bridge.onAbort(abortListener);

    // Wait for microtasks
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(abortListener).toHaveBeenCalled();
  });
});
