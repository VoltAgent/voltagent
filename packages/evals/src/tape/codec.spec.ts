import { describe, expect, it } from "vitest";
import { captureTapeValue, restoreTapeValue, tapeDigest } from "./codec.js";

describe("strict tape values", () => {
  it("preserves negative zero and rejects custom array prototypes", () => {
    expect(Object.is(restoreTapeValue(captureTapeValue(-0)), -0)).toBe(true);
    expect(tapeDigest(-0)).not.toBe(tapeDigest(0));
    class CustomArray extends Array {}
    expect(() => captureTapeValue(new CustomArray(1, 2))).toThrow();
    expect(() => restoreTapeValue({ kind: "array", value: new CustomArray() })).toThrow();
  });
  it("preserves undefined separately from null and detaches values", () => {
    const input = { absent: undefined, present: null, values: [false, 0, ""] };
    const encoded = captureTapeValue(input);
    input.values[0] = true;
    expect(restoreTapeValue(encoded)).toEqual({
      absent: undefined,
      present: null,
      values: [false, 0, ""],
    });
    expect(tapeDigest({ a: 1, b: 2 })).toBe(tapeDigest({ b: 2, a: 1 }));
    expect(tapeDigest({ x: undefined })).not.toBe(tapeDigest({ x: null }));
    expect(tapeDigest({ x: undefined })).not.toBe(tapeDigest({}));
  });
  it("rejects getters, hooks, cycles and nonfinite values before execution", () => {
    let executed = false;
    const getter = Object.defineProperty({}, "secret", {
      enumerable: true,
      get() {
        executed = true;
        return 1;
      },
    });
    const hook = {
      toJSON() {
        executed = true;
        return null;
      },
    };
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    for (const value of [getter, hook, cycle, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(() => captureTapeValue(value)).toThrow();
    }
    expect(executed).toBe(false);
  });
  it("bounds values and refuses malformed encoded objects", () => {
    expect(() => captureTapeValue("large", { maxBytes: 2 })).toThrow();
    expect(() => restoreTapeValue({ kind: "number", value: "1" })).toThrow();
    expect(() => restoreTapeValue({ kind: "undefined", value: "hidden" })).toThrow();
  });
  it("rejects hidden and symbol properties on arrays and encoded object entries", () => {
    const hidden = Object.defineProperty([1], "hidden", { value: "secret" });
    expect(() => captureTapeValue(hidden)).toThrow();
    const entries = Object.defineProperty([], "hidden", { value: "secret" });
    expect(() => restoreTapeValue({ kind: "array", value: entries })).toThrow();
    const pair = ["key", { kind: "null" }];
    Object.defineProperty(pair, Symbol("hidden"), { value: "secret" });
    expect(() => restoreTapeValue({ kind: "object", value: [pair] })).toThrow();
  });
});
