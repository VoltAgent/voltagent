import { beforeEach, describe, expect, it, vi } from "vitest";
import { devLogger } from "../dev";
import { deepClonePlainObject, hasKey } from "./objects";

// Mock devLogger
vi.mock("../dev", () => ({
  devLogger: {
    warn: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deepClonePlainObject", () => {
  it("should deep clone a simple object", () => {
    const original = { a: 1, b: "test", c: true };
    const cloned = deepClonePlainObject(original);

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
    const cloned = deepClonePlainObject(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.b.d).not.toBe(original.b.d);
    expect(cloned.b.d.f).not.toBe(original.b.d.f);
  });

  it("should deep clone arrays", () => {
    const original = [1, 2, { a: 3 }, [4, 5]];
    const cloned = deepClonePlainObject(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[2]).not.toBe(original[2]);
    expect(cloned[3]).not.toBe(original[3]);
  });

  it("should handle primitive values", () => {
    expect(deepClonePlainObject(42)).toBe(42);
    expect(deepClonePlainObject("string")).toBe("string");
    expect(deepClonePlainObject(true)).toBe(true);
    expect(deepClonePlainObject(null)).toBe(null);
    expect(deepClonePlainObject(undefined)).toBe(undefined);
  });

  it("should handle Date objects", () => {
    const date = new Date("2023-01-01");
    const cloned = deepClonePlainObject(date);

    expect(cloned).toEqual(date.toISOString());
  });

  it("should handle objects with Date properties", () => {
    const original = {
      timestamp: new Date("2023-01-01"),
      name: "test",
    };
    const cloned = deepClonePlainObject(original);

    expect(cloned.timestamp).toBe("2023-01-01T00:00:00.000Z");
    expect(cloned.name).toBe("test");
  });

  it("should fallback to shallow clone when JSON serialization fails", () => {
    const circular: any = { a: 1 };
    circular.circular = circular;

    const cloned = deepClonePlainObject(circular);

    expect(devLogger.warn).toHaveBeenCalledWith(
      "Failed to deep clone object, using shallow clone:",
      expect.any(TypeError),
    );
    expect(cloned.a).toBe(1);
    expect(cloned.circular).toBe(circular); // Shallow clone reference
  });

  it("should handle objects with functions (they get removed in JSON serialization)", () => {
    const original = {
      a: 1,
      fn: () => "test",
      b: "string",
    };
    const cloned = deepClonePlainObject(original);

    expect(cloned.a).toBe(1);
    expect(cloned.b).toBe("string");
    expect(cloned.fn).toBeUndefined();
  });

  it("should handle empty objects and arrays", () => {
    expect(deepClonePlainObject({})).toEqual({});
    expect(deepClonePlainObject([])).toEqual([]);
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

    const cloned = deepClonePlainObject(original);

    expect(cloned).toEqual(original);
    expect(cloned.users).not.toBe(original.users);
    expect(cloned.users[0]).not.toBe(original.users[0]);
    expect(cloned.users[0].profile).not.toBe(original.users[0].profile);
    expect(cloned.metadata).not.toBe(original.metadata);
    expect(cloned.metadata.settings).not.toBe(original.metadata.settings);
  });

  it("should handle objects with Symbol properties", () => {
    const sym = Symbol("test");
    const original = {
      a: 1,
      [sym]: "symbol value",
    };

    // deepClone will lose symbols due to JSON serialization
    const deepCloned = deepClonePlainObject(original);
    expect(deepCloned.a).toBe(1);
    expect(deepCloned[sym]).toBeUndefined();
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
    const cloned = deepClonePlainObject(large);
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
