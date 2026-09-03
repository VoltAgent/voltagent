import { describe, expect, it, vi } from "vitest";
import { SimpleEventEmitter } from "./simple-event-emitter";

describe("SimpleEventEmitter", () => {
  it("off() removes a once() listener before it fires", () => {
    const emitter = new SimpleEventEmitter();
    const listener = vi.fn();

    emitter.once("evt", listener);
    emitter.off("evt", listener);

    // once() registers an internal wrapper, so off() must resolve the original
    // listener back to that wrapper — otherwise the removed listener still fires.
    expect(emitter.listenerCount("evt")).toBe(0);
    emitter.emit("evt");
    expect(listener).not.toHaveBeenCalled();
  });

  it("once() still fires exactly once and then removes itself", () => {
    const emitter = new SimpleEventEmitter();
    const listener = vi.fn();

    emitter.once("evt", listener);
    emitter.emit("evt");
    emitter.emit("evt");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount("evt")).toBe(0);
  });
});
