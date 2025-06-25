import { describe, expect, it } from "vitest";
import { generateMessageId, generateToolCallId, hasKey } from "./identifiers";

describe("generateMessageId", () => {
  it("should generate a message ID with correct format", () => {
    const id = generateMessageId();
    expect(id).toMatch(/^msg-[a-zA-Z0-9]{24}$/);
  });

  it("should generate unique IDs", () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();
    expect(id1).not.toBe(id2);
  });
});

describe("generateToolCallId", () => {
  it("should generate a tool call ID with correct format", () => {
    const id = generateToolCallId();
    expect(id).toMatch(/^call_[a-zA-Z0-9]{24}$/);
  });

  it("should generate unique IDs", () => {
    const id1 = generateToolCallId();
    const id2 = generateToolCallId();
    expect(id1).not.toBe(id2);
  });
});

describe("hasKey", () => {
  it("should return true for objects with the specified key", () => {
    const obj = { foo: "bar" };
    expect(hasKey(obj, "foo")).toBe(true);
  });

  it("should return false for objects without the specified key", () => {
    const obj = { foo: "bar" };
    expect(hasKey(obj, "baz")).toBe(false);
  });

  it("should return false for null", () => {
    expect(hasKey(null, "foo")).toBe(false);
  });

  it("should return false for arrays", () => {
    expect(hasKey([1, 2, 3], "length")).toBe(false);
  });

  it("should return false for primitive values", () => {
    expect(hasKey("string", "length")).toBe(false);
    expect(hasKey(42, "toString")).toBe(false);
    expect(hasKey(true, "valueOf")).toBe(false);
  });

  it("should narrow the type when returning true", () => {
    const obj: unknown = { foo: "bar" };
    if (hasKey(obj, "foo")) {
      // TypeScript should know that obj.foo exists here
      expect(obj.foo).toBe("bar");
    }
  });
});
