import { hasKey, isDate, isObject, isString } from "./index";

describe("hasKey", () => {
  it("should return true when object has the specified key", () => {
    const obj = { name: "test", age: 25 };
    expect(hasKey(obj, "name")).toBe(true);
    expect(hasKey(obj, "age")).toBe(true);
  });

  it("should return false when object does not have the specified key", () => {
    const obj = { name: "test", age: 25 };
    expect(hasKey(obj, "address")).toBe(false);
    expect(hasKey(obj, "email")).toBe(false);
  });

  it("should work with empty objects", () => {
    const obj = {};
    expect(hasKey(obj, "anyKey")).toBe(false);
  });

  it("should work with objects that have null or undefined values", () => {
    const obj = {
      nullValue: null,
      undefinedValue: undefined,
      emptyString: "",
    };
    expect(hasKey(obj, "nullValue")).toBe(true);
    expect(hasKey(obj, "undefinedValue")).toBe(true);
    expect(hasKey(obj, "emptyString")).toBe(true);
  });

  it("should work with nested objects", () => {
    const obj = {
      nested: {
        key: "value",
      },
    };
    expect(hasKey(obj, "nested")).toBe(true);
  });
});

describe("isDate", () => {
  it("should return true for Date objects", () => {
    expect(isDate(new Date())).toBe(true);
    expect(isDate(new Date("2024-01-01"))).toBe(true);
  });

  it("should return false for non-Date values", () => {
    expect(isDate("2024-01-01")).toBe(false);
    expect(isDate(123)).toBe(false);
    expect(isDate({})).toBe(false);
    expect(isDate([])).toBe(false);
    expect(isDate(null)).toBe(false);
    expect(isDate(undefined)).toBe(false);
  });
});

describe("isString", () => {
  it("should return true for string values", () => {
    expect(isString("hello")).toBe(true);
    expect(isString("")).toBe(true);
    expect(isString("123")).toBe(true);
  });

  it("should return false for non-string values", () => {
    expect(isString(123)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString([])).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString(new Date())).toBe(false);
  });
});

describe("isObject", () => {
  it("should return true for plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ key: "value" })).toBe(true);
    expect(isObject(new Object())).toBe(true);
  });

  it("should return false for non-object values", () => {
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject("string")).toBe(false);
    expect(isObject(123)).toBe(false);
    expect(isObject(new Date())).toBe(false);
  });
});
