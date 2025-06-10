import { hasKey } from "./index";

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
