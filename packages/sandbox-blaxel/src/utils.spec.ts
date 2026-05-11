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
    expect(content).toBe("éé");
    expect(Buffer.byteLength(content, "utf-8")).toBe(4);
    expect(truncated).toBe(true);
    // Result round-trips as valid UTF-8 (no split codepoints).
    expect(Buffer.from(content, "utf-8").toString("utf-8")).toBe(content);
  });

  it("walks back to a codepoint boundary instead of splitting mid-byte", () => {
    // "h" = 1 byte, "é" = 2 bytes. maxBytes=2 would land inside "é"; the cut
    // point should walk back to just "h".
    const { content, truncated } = truncateOutput("hé", 2);
    expect(content).toBe("h");
    expect(truncated).toBe(true);
  });

  it("handles a 4-byte codepoint that doesn't fit by walking back to empty", () => {
    // U+1F600 GRINNING FACE = 4 bytes. With maxBytes=3 there is no valid
    // prefix that ends on a codepoint boundary, so the result is empty.
    const { content, truncated } = truncateOutput("😀", 3);
    expect(content).toBe("");
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
