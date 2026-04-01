import { describe, expect, it } from "vitest";
import { buildToolErrorResult, sanitizeErrorValue } from "./error-utils";

describe("error-utils", () => {
  describe("sanitizeErrorValue", () => {
    it("returns primitives unchanged", () => {
      expect(sanitizeErrorValue("text")).toBe("text");
      expect(sanitizeErrorValue(42)).toBe(42);
      expect(sanitizeErrorValue(true)).toBe(true);
      expect(sanitizeErrorValue(null)).toBeNull();
      expect(sanitizeErrorValue(undefined)).toBeUndefined();
    });

    it("handles arrays recursively", () => {
      const value = ["a", 1, { nested: "ok" }];
      const sanitized = sanitizeErrorValue(value) as unknown[];
      expect(sanitized[0]).toBe("a");
      expect(sanitized[1]).toBe(1);
      expect(typeof sanitized[2]).toBe("string"); // object stringified
    });

    it("sanitizes nested errors", () => {
      const err = new Error("boom");
      const sanitized = sanitizeErrorValue(err) as Record<string, string>;
      expect(sanitized).toMatchObject({ name: "Error", message: "boom" });
      expect(sanitized.stack).toBeTypeOf("string");
    });

    it("stringifies circular structures", () => {
      const circular: any = {};
      circular.self = circular;

      const sanitized = sanitizeErrorValue(circular);
      expect(typeof sanitized).toBe("string");
      expect(String(sanitized)).toContain("[Circular]");
    });
  });

  describe("buildToolErrorResult", () => {
    it("builds a serializable error payload with cause and custom fields", () => {
      const original = new Error("tool failed", { cause: { reason: "demo" } });
      (original as any).code = "DEMO";
      (original as any).config = { a: 1 };

      const result = buildToolErrorResult(original, "call-1", "demo-tool");

      expect(result).toMatchObject({
        error: true,
        name: "Error",
        message: "tool failed",
        toolCallId: "call-1",
        toolName: "demo-tool",
        code: "DEMO",
      });
      expect(typeof result.cause).toBe("string");
      expect(String(result.cause)).toContain('"reason":"demo"');
      expect(typeof result.config).toBe("string");
    });
  });
});
