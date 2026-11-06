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

  it("off() removes only the newest registration when on() and once() share a listener", () => {
    const emitter = new SimpleEventEmitter();
    const listener = vi.fn();

    emitter.on("evt", listener);
    emitter.once("evt", listener);
    expect(emitter.listenerCount("evt")).toBe(2);

    // Like Node's EventEmitter, off() drops the newest matching entry (the once()
    // wrapper here), leaving the persistent on() registration intact.
    emitter.off("evt", listener);
    expect(emitter.listenerCount("evt")).toBe(1);

    emitter.emit("evt");
    emitter.emit("evt");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(emitter.listenerCount("evt")).toBe(1);
  });
});
