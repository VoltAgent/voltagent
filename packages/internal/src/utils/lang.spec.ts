import type { EmptyObject } from "type-fest";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { AnyFunction, Nil } from "../types";
import { isEmptyObject, isFunction, isNil, isObject, isPlainObject } from "./lang";

describe("isNil", () => {
  it("should return true for null", () => {
    expect(isNil(null)).toBe(true);
  });

  it("should return true for undefined", () => {
    expect(isNil(undefined)).toBe(true);
  });

  it("should return false for other falsy values", () => {
    expect(isNil(0)).toBe(false);
    expect(isNil("")).toBe(false);
    expect(isNil(false)).toBe(false);
    expect(isNil(Number.NaN)).toBe(false);
  });

  it("should return false for truthy values", () => {
    expect(isNil("hello")).toBe(false);
    expect(isNil(42)).toBe(false);
    expect(isNil(true)).toBe(false);
    expect(isNil({})).toBe(false);
    expect(isNil([])).toBe(false);
    expect(isNil(() => {})).toBe(false);
  });

  it("should have correct type guard behavior", () => {
    const testValue: unknown = null;

    if (isNil(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<Nil>();
    } else {
      expectTypeOf(testValue).not.toEqualTypeOf<Nil>();
    }
  });

  it("should narrow types correctly in conditional statements", () => {
    const testValue: unknown = "hello";

    if (isNil(testValue)) {
      // This branch should only execute for null/undefined
      expectTypeOf(testValue).toEqualTypeOf<Nil>();
    } else {
      // This branch should execute for all other values
      expectTypeOf(testValue).not.toEqualTypeOf<Nil>();
    }
  });
});

describe("isObject", () => {
  it("should return true for plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ key: "value" })).toBe(true);
    expect(isObject({ a: 1, b: 2 })).toBe(true);
    expect(isObject(Object.create(null))).toBe(true);
  });

  it("should return true for class instances", () => {
    class TestClass {}
    expect(isObject(new TestClass())).toBe(true);
  });

  it("should return true for built-in objects", () => {
    expect(isObject(new Date())).toBe(true);
    expect(isObject(/test/)).toBe(true);
    expect(isObject(new Map())).toBe(true);
    expect(isObject(new Set())).toBe(true);
    expect(isObject(/test/)).toBe(true);
    expect(isObject(new Error())).toBe(true);
    expect(isObject(new ArrayBuffer(8))).toBe(true);
  });

  it("should return false for null", () => {
    expect(isObject(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isObject(undefined)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isObject("string")).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(Symbol("test"))).toBe(false);
  });

  it("should return true for arrays", () => {
    expect(isObject([])).toBe(true);
    expect(isObject([1, 2, 3])).toBe(true);
  });

  it("should return true for functions", () => {
    expect(isObject(() => {})).toBe(true);
    expect(isObject(() => {})).toBe(true);
    expect(isObject(async () => {})).toBe(true);
  });

  it("should have correct type guard behavior", () => {
    const testValue: unknown = { key: "value" };

    if (isObject(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<object>();
    } else {
      expectTypeOf(testValue).not.toEqualTypeOf<object>();
    }
  });

  it("should narrow types correctly in conditional statements", () => {
    const testValue: unknown = { a: 1, b: 2 };

    if (isObject(testValue)) {
      // This branch should only execute for objects
      expectTypeOf(testValue).toEqualTypeOf<object>();
    } else {
      // This branch should execute for all other values
      expectTypeOf(testValue).not.toEqualTypeOf<object>();
    }
  });

  it("should work with generic type parameters", () => {
    const testValue: unknown = { key: "value" };

    if (isObject<{ key: string }>(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<{ key: string }>();
    }
  });
});

describe("isFunction", () => {
  it("should return true for regular functions", () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(() => {})).toBe(true);
  });

  it("should return true for async functions", () => {
    expect(isFunction(async () => {})).toBe(true);
    expect(isFunction(async () => {})).toBe(true);
  });

  it("should return true for generator functions", () => {
    expect(isFunction(function* () {})).toBe(true);
    expect(isFunction(async function* () {})).toBe(true);
  });

  it("should return true for class constructors", () => {
    class TestClass {}
    expect(isFunction(TestClass)).toBe(true);
  });

  it("should return false for non-functions", () => {
    expect(isFunction(null)).toBe(false);
    expect(isFunction(undefined)).toBe(false);
    expect(isFunction("string")).toBe(false);
    expect(isFunction(42)).toBe(false);
    expect(isFunction(true)).toBe(false);
    expect(isFunction({})).toBe(false);
    expect(isFunction([])).toBe(false);
  });

  it("should have correct type guard behavior", () => {
    const testValue: unknown = () => {};

    if (isFunction(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<AnyFunction>();
    } else {
      expectTypeOf(testValue).not.toEqualTypeOf<AnyFunction>();
    }
  });

  it("should work with generic type parameters", () => {
    const testValue: unknown = () => "hello";

    if (isFunction<() => string>(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<() => string>();
    }
  });
});

describe("isPlainObject", () => {
  it("should return true for plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ key: "value" })).toBe(true);
    expect(isPlainObject({ a: 1, b: 2 })).toBe(true);
  });

  it("should return true for Object.create(null)", () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it("should return false for class instances", () => {
    class TestClass {}
    expect(isPlainObject(new TestClass())).toBe(false);
  });

  it("should return false for built-in objects", () => {
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(/test/)).toBe(false);
    expect(isPlainObject(new Map())).toBe(false);
    expect(isPlainObject(new Set())).toBe(false);
  });

  it("should return false for null", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isPlainObject(undefined)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(Symbol("test"))).toBe(false);
  });

  it("should return false for arrays", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it("should return false for functions", () => {
    expect(isPlainObject(() => {})).toBe(false);
    expect(isPlainObject(() => {})).toBe(false);
    expect(isPlainObject(async () => {})).toBe(false);
  });

  it("should have correct type guard behavior", () => {
    const testValue: unknown = { key: "value" };

    if (isPlainObject(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<Record<string | number | symbol, unknown>>();
    } else {
      expectTypeOf(testValue).not.toEqualTypeOf<Record<string | number | symbol, unknown>>();
    }
  });

  it("should work with generic type parameters", () => {
    const testValue: unknown = { key: "value" };

    if (isPlainObject<{ key: string }>(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<{ key: string }>();
    }
  });
});

describe("isEmptyObject", () => {
  it("should return true for empty objects", () => {
    expect(isEmptyObject({})).toBe(true);
  });

  it("should return true for Object.create(null)", () => {
    expect(isEmptyObject(Object.create(null))).toBe(true);
  });

  it("should return false for objects with properties", () => {
    expect(isEmptyObject({ key: "value" })).toBe(false);
    expect(isEmptyObject({ a: 1, b: 2 })).toBe(false);
    expect(isEmptyObject({ "": "empty key" })).toBe(false);
    expect(isEmptyObject({ [Symbol("test")]: "symbol key" })).toBe(false);
  });

  it("should return false for null", () => {
    expect(isEmptyObject(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isEmptyObject(undefined)).toBe(false);
  });

  it("should return false for non-objects", () => {
    expect(isEmptyObject("string")).toBe(false);
    expect(isEmptyObject(42)).toBe(false);
    expect(isEmptyObject(true)).toBe(false);
    expect(isEmptyObject([])).toBe(false);
    expect(isEmptyObject(() => {})).toBe(false);
  });

  it("should return true for objects with inherited properties", () => {
    const obj = Object.create({ inherited: "property" });
    expect(isEmptyObject(obj)).toBe(true);
  });

  it("should return false for objects with non-enumerable properties", () => {
    const obj = {};
    Object.defineProperty(obj, "nonEnumerable", {
      value: "test",
      enumerable: false,
    });
    expect(isEmptyObject(obj)).toBe(false);
  });

  it("should have correct type guard behavior", () => {
    const testValue: unknown = {};

    if (isEmptyObject(testValue)) {
      expectTypeOf(testValue).toEqualTypeOf<EmptyObject>();
    } else {
      expectTypeOf(testValue).not.toEqualTypeOf<EmptyObject>();
    }
  });

  it("should narrow types correctly in conditional statements", () => {
    const testValue: unknown = {};

    if (isEmptyObject(testValue)) {
      // This branch should only execute for empty objects
      expectTypeOf(testValue).toEqualTypeOf<EmptyObject>();
      // Should not allow adding properties to EmptyObject type
      // @ts-expect-error - EmptyObject should not allow property assignment
      testValue.newProp = "value";
    } else {
      // This branch should execute for all other values
      expectTypeOf(testValue).not.toEqualTypeOf<EmptyObject>();
    }
  });

  it("should work correctly with Object.keys", () => {
    const emptyObj = {};
    const nonEmptyObj = { key: "value" };

    expect(Object.keys(emptyObj).length).toBe(0);
    expect(Object.keys(nonEmptyObj).length).toBeGreaterThan(0);

    expect(isEmptyObject(emptyObj)).toBe(true);
    expect(isEmptyObject(nonEmptyObj)).toBe(false);
  });
});
