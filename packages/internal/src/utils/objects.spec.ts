import { afterEach, describe, expect, it, vi } from "vitest";
import { deepClone, hasKey } from "./objects";

describe("deepClone", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves binary data and shared backing buffers in the fallback", () => {
    const buffer = new ArrayBuffer(8);
    const bytes = new Uint8Array(buffer, 2, 4);
    bytes.set([1, 2, 3, 4]);
    const view = new DataView(buffer, 2, 4);
    const original = { fn: () => "test", buffer, bytes, view, repeated: bytes };
    const cloned = deepClone(original);
    expect(cloned.buffer).toBeInstanceOf(ArrayBuffer);
    expect(cloned.buffer).not.toBe(buffer);
    expect(cloned.bytes).toBeInstanceOf(Uint8Array);
    expect(cloned.bytes.byteLength).toBe(4);
    expect(cloned.bytes.byteOffset).toBe(2);
    expect([...cloned.bytes]).toEqual([1, 2, 3, 4]);
    expect(cloned.bytes.buffer).toBe(cloned.buffer);
    expect(cloned.view.buffer).toBe(cloned.buffer);
    expect(cloned.view.byteOffset).toBe(2);
    expect(cloned.view.getUint8(1)).toBe(2);
    expect(cloned.repeated).toBe(cloned.bytes);
    cloned.bytes[0] = 9;
    expect(cloned.view.getUint8(0)).toBe(9);
    expect(bytes[0]).toBe(1);
  });

  it("clones shared buffers and their views without sharing the original storage", () => {
    const buffer = new SharedArrayBuffer(8);
    const bytes = new Uint16Array(buffer, 2, 2);
    bytes.set([123, 456]);
    const cloned = deepClone({ fn: () => "test", bytes, buffer });
    expect(cloned.buffer).toBeInstanceOf(SharedArrayBuffer);
    expect(cloned.buffer).not.toBe(buffer);
    expect(cloned.bytes.buffer).toBe(cloned.buffer);
    expect(cloned.bytes.byteOffset).toBe(2);
    expect([...cloned.bytes]).toEqual([123, 456]);
    cloned.bytes[0] = 999;
    expect(bytes[0]).toBe(123);
  });

  it("supports environments without SharedArrayBuffer during the fallback", () => {
    vi.stubGlobal("SharedArrayBuffer", undefined);
    const original = { fn: () => "test", nested: { value: 1 } };
    const cloned = deepClone(original);
    expect(cloned.nested).toEqual(original.nested);
    expect(cloned.nested).not.toBe(original.nested);
  });

  it("isolates nested data when functions prevent structured cloning", () => {
    const shared = { labels: ["original"] };
    const original = { fn: () => "test", first: shared, second: shared };
    const cloned = deepClone(original);
    cloned.first.labels.push("changed");
    expect(original.first.labels).toEqual(["original"]);
    expect(cloned.second).toBe(cloned.first);
    expect(cloned.fn).toBe(original.fn);
  });

  it("preserves cycles when functions prevent structured cloning", () => {
    const original: { fn: () => string; self?: unknown } = { fn: () => "test" };
    original.self = original;
    const cloned = deepClone(original);
    expect(cloned.self).toBe(cloned);
    expect(cloned.fn).toBe(original.fn);
  });

  it("deep-clones arrays and primitives when structuredClone is unavailable", () => {
    vi.stubGlobal("structuredClone", undefined);
    const original = [{ nested: [1, null, undefined, false, "value"] }];
    const cloned = deepClone(original);
    expect(Array.isArray(cloned)).toBe(true);
    expect(cloned).toEqual(original);
    expect(cloned[0].nested).not.toBe(original[0].nested);
    expect(deepClone(null)).toBeNull();
    expect(deepClone(undefined)).toBeUndefined();
    expect(deepClone(42)).toBe(42);
  });

  it("preserves collection types and shared references in the fallback", () => {
    const shared = { label: "original" };
    const original = {
      fn: () => "test",
      shared,
      map: new Map([[shared, shared]]),
      set: new Set([shared]),
      date: new Date("2023-01-01"),
      regex: /test/g,
    };
    const cloned = deepClone(original);
    expect(cloned.map).toBeInstanceOf(Map);
    expect(cloned.map.get(cloned.shared)).toBe(cloned.shared);
    expect(cloned.set).toBeInstanceOf(Set);
    expect(cloned.set.has(cloned.shared)).toBe(true);
    expect(cloned.date).toEqual(original.date);
    expect(cloned.date).not.toBe(original.date);
    expect(cloned.regex).toEqual(original.regex);
    expect(cloned.regex).not.toBe(original.regex);
  });

  it("copies an own __proto__ key without changing the fallback object's prototype", () => {
    const original = { fn: () => "test" };
    Object.defineProperty(original, "__proto__", {
      value: { nested: "original" },
      enumerable: true,
    });
    const cloned = deepClone(original);
    expect(Object.getPrototypeOf(cloned)).toBe(Object.prototype);
    expect(Object.hasOwn(cloned, "__proto__")).toBe(true);
    expect(Object.getOwnPropertyDescriptor(cloned, "__proto__")?.value).toEqual({
      nested: "original",
    });
    expect(Object.getOwnPropertyDescriptor(cloned, "__proto__")?.value).not.toBe(
      Object.getOwnPropertyDescriptor(original, "__proto__")?.value,
    );
  });

  it("should deep clone a simple object", () => {
    const original = { a: 1, b: "test", c: true };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it("should deep clone nested objects", () => {
    const original = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: "nested",
          f: [1, 2, 3],
        },
      },
    };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.b.d).not.toBe(original.b.d);
    expect(cloned.b.d.f).not.toBe(original.b.d.f);
  });

  it("should deep clone arrays", () => {
    const original = [1, 2, { a: 3 }, [4, 5]];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[2]).not.toBe(original[2]);
    expect(cloned[3]).not.toBe(original[3]);
  });

  it("should handle primitive values", () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone("string")).toBe("string");
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it("should handle Date objects", () => {
    const date = new Date("2023-01-01");
    const cloned = deepClone(date);

    expect(cloned).toEqual(date);
    expect(cloned).not.toBe(date);
    expect(cloned instanceof Date).toBe(true);
  });

  it("should handle objects with Date properties", () => {
    const original = {
      timestamp: new Date("2023-01-01"),
      name: "test",
    };
    const cloned = deepClone(original);

    expect(cloned.timestamp).toEqual(original.timestamp);
    expect(cloned.timestamp).not.toBe(original.timestamp);
    expect(cloned.timestamp instanceof Date).toBe(true);
    expect(cloned.name).toBe("test");
  });

  it("should handle circular references properly", () => {
    const circular: any = { a: 1 };
    circular.circular = circular;

    const cloned = deepClone(circular);

    expect(cloned.a).toBe(1);
    expect(cloned.circular).toBe(cloned); // Should reference the cloned object, not the original
    expect(cloned.circular).not.toBe(circular);
  });

  it("should handle nested circular references", () => {
    const original: any = {
      a: { b: 1 },
      c: { d: 2 },
    };
    original.a.ref = original.c;
    original.c.ref = original.a;

    const cloned = deepClone(original);

    expect(cloned.a.b).toBe(1);
    expect(cloned.c.d).toBe(2);
    expect(cloned.a.ref).toBe(cloned.c);
    expect(cloned.c.ref).toBe(cloned.a);
    expect(cloned.a.ref).not.toBe(original.c);
    expect(cloned.c.ref).not.toBe(original.a);
  });

  it("should handle objects with functions (preserve them)", () => {
    const original = {
      a: 1,
      fn: () => "test",
      b: "string",
    };
    const cloned = deepClone(original);

    expect(cloned.a).toBe(1);
    expect(cloned.b).toBe("string");
    expect(cloned.fn).toBe(original.fn); // Functions are preserved as-is
  });

  it("should handle empty objects and arrays", () => {
    expect(deepClone({})).toEqual({});
    expect(deepClone([])).toEqual([]);
  });

  it("should handle complex nested structures", () => {
    const original = {
      users: [
        { id: 1, name: "John", profile: { age: 30, active: true } },
        { id: 2, name: "Jane", profile: { age: 25, active: false } },
      ],
      metadata: {
        count: 2,
        filters: ["active", "inactive"],
        settings: {
          theme: "dark",
          notifications: true,
        },
      },
    };

    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned.users).not.toBe(original.users);
    expect(cloned.users[0]).not.toBe(original.users[0]);
    expect(cloned.users[0].profile).not.toBe(original.users[0].profile);
    expect(cloned.metadata).not.toBe(original.metadata);
    expect(cloned.metadata.settings).not.toBe(original.metadata.settings);
  });

  // TODO: structuredClone does not support Symbols we need to determine if we want to support this at all
  it.skip("should handle objects with Symbol properties", () => {
    const sym = Symbol("test");
    const original = {
      a: 1,
      [sym]: "symbol value",
    };

    const deepCloned = deepClone(original);
    expect(deepCloned.a).toBe(1);
    expect(deepCloned[sym]).toBe("symbol value"); // Symbols are preserved
  });

  it("should handle RegExp objects", () => {
    const regex = /test/g;
    const cloned = deepClone(regex);

    expect(cloned).toEqual(regex);
    expect(cloned).not.toBe(regex);
    expect(cloned instanceof RegExp).toBe(true);
    expect(cloned.source).toBe("test");
    expect(cloned.flags).toBe("g");
  });

  it("should handle Map objects", () => {
    const map = new Map<string, string | { nested: string }>([
      ["key1", "value1"],
      ["key2", { nested: "value2" }],
    ]);
    const cloned = deepClone(map);

    expect(cloned).toEqual(map);
    expect(cloned).not.toBe(map);
    expect(cloned instanceof Map).toBe(true);
    expect(cloned.get("key2")).not.toBe(map.get("key2"));
  });

  it("should handle Set objects", () => {
    const set = new Set([1, 2, { nested: "value" }]);
    const cloned = deepClone(set);

    expect(cloned).toEqual(set);
    expect(cloned).not.toBe(set);
    expect(cloned instanceof Set).toBe(true);

    const setArray = Array.from(set);
    const clonedArray = Array.from(cloned);
    expect(clonedArray[2]).not.toBe(setArray[2]);
  });

  it("should handle very large objects efficiently", () => {
    const large = {};
    for (let i = 0; i < 1000; i++) {
      (large as any)[`prop${i}`] = {
        value: i,
        nested: { deep: `value${i}` },
      };
    }

    const start = Date.now();
    const cloned = deepClone(large);
    const duration = Date.now() - start;

    expect(cloned).toEqual(large);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});

describe("hasKey", () => {
  it("should return true if the object has the key", () => {
    const obj = { a: 1 };
    expect(hasKey(obj, "a")).toBe(true);
  });

  it("should return false if the object does not have the key", () => {
    const obj = { a: 1 };
    expect(hasKey(obj, "b")).toBe(false);
  });

  it("should return false if the object is null", () => {
    const obj = null;
    expect(hasKey(obj as any, "a")).toBe(false);
  });

  it("should return false if the object is undefined", () => {
    const obj = undefined;
    expect(hasKey(obj as any, "a")).toBe(false);
  });
});
