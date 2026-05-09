import { describe, expect, it, vi } from "vitest";
import { toError, truncateOutput, withEventListener } from "./utils";

describe("toError", () => {
  it("returns the same Error instance when given an Error", () => {
    const err = new Error("oops");
    expect(toError(err)).toBe(err);
  });

  it("preserves Error subclass instances", () => {
    const err = new TypeError("bad type");
    expect(toError(err)).toBe(err);
  });

  it("wraps a string in a new Error", () => {
    const result = toError("string error");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("string error");
  });

  it("wraps null in a new Error with 'null' message", () => {
    expect(toError(null).message).toBe("null");
  });

  it("wraps undefined in a new Error with 'undefined' message", () => {
    expect(toError(undefined).message).toBe("undefined");
  });

  it("wraps a plain object via String()", () => {
    expect(toError({ foo: 1 }).message).toBe("[object Object]");
  });
});

describe("truncateOutput", () => {
  it("returns input unchanged when within byte limit", () => {
    expect(truncateOutput("hello", 100)).toEqual({ content: "hello", truncated: false });
  });

  it("returns empty + not truncated when input is empty string", () => {
    expect(truncateOutput("", 100)).toEqual({ content: "", truncated: false });
  });

  it("flags truncated when maxBytes is 0 and value is non-empty", () => {
    expect(truncateOutput("hello", 0)).toEqual({ content: "", truncated: true });
  });

  it("flags truncated when maxBytes is negative and value is non-empty", () => {
    expect(truncateOutput("hello", -10)).toEqual({ content: "", truncated: true });
  });

  it("truncates byte-bounded for ASCII content", () => {
    const { content, truncated } = truncateOutput("abcdefghij", 4);
    expect(content).toBe("abcd");
    expect(truncated).toBe(true);
  });

  it("counts UTF-8 bytes, not characters", () => {
    // "é" is 2 bytes in UTF-8.
    const input = "éééé"; // 8 bytes
    const { content, truncated } = truncateOutput(input, 4);
    expect(Buffer.byteLength(content, "utf-8")).toBeLessThanOrEqual(4);
    expect(truncated).toBe(true);
  });
});

describe("withEventListener", () => {
  it("attaches listener, runs callback, returns its value, then detaches", async () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const result = await withEventListener({
      target,
      event: "ping",
      listener,
      run: async () => {
        target.dispatchEvent(new Event("ping"));
        return 42;
      },
    });
    expect(result).toBe(42);
    expect(listener).toHaveBeenCalledOnce();
    // After run resolves the listener should be detached.
    target.dispatchEvent(new Event("ping"));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("detaches the listener even when run() throws", async () => {
    const target = new EventTarget();
    const listener = vi.fn();
    await expect(
      withEventListener({
        target,
        event: "ping",
        listener,
        run: async () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");
    target.dispatchEvent(new Event("ping"));
    expect(listener).not.toHaveBeenCalled();
  });

  it("forwards options to addEventListener (e.g. once)", async () => {
    const target = new EventTarget();
    const listener = vi.fn();
    await withEventListener({
      target,
      event: "ping",
      listener,
      options: { once: true },
      run: async () => {
        target.dispatchEvent(new Event("ping"));
        target.dispatchEvent(new Event("ping"));
      },
    });
    expect(listener).toHaveBeenCalledOnce();
  });
});
