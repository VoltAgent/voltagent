import { describe, expect, it } from "vitest";
import { z as z3 } from "zod/v3";
import { z as z4 } from "zod/v4";
import { coerceStringifiedJsonToolArgs } from "./tool-input-coercion";

describe("coerceStringifiedJsonToolArgs", () => {
  describe.each([
    {
      version: "Zod 3",
      schema: z3.object({
        args: z3.array(z3.string()),
        requests: z3.array(z3.object({ filters: z3.object({ owner: z3.string() }) })),
      }),
    },
    {
      version: "Zod 4",
      schema: z4.object({
        args: z4.array(z4.string()),
        requests: z4.array(z4.object({ filters: z4.object({ owner: z4.string() }) })),
      }),
    },
  ])("with $version validation issues", ({ schema }) => {
    it("coerces stringified arrays and nested objects without mutating the input", () => {
      const raw = {
        args: '["parse_excel.py"]',
        requests: [{ filters: '{"owner":"workspace"}' }],
      };
      const parsed = schema.safeParse(raw);
      expect(parsed.success).toBe(false);
      if (parsed.success) throw new Error("Expected invalid tool arguments");

      const coerced = coerceStringifiedJsonToolArgs(raw, parsed.error.issues);

      expect(coerced).toEqual({
        args: ["parse_excel.py"],
        requests: [{ filters: { owner: "workspace" } }],
      });
      expect(schema.safeParse(coerced).success).toBe(true);
      expect(raw).toEqual({
        args: '["parse_excel.py"]',
        requests: [{ filters: '{"owner":"workspace"}' }],
      });
    });

    it.each([null, 42, false, undefined])("does not coerce non-string values: %s", (value) => {
      const raw = { args: value, requests: [{ filters: value }] };
      const parsed = schema.safeParse(raw);
      expect(parsed.success).toBe(false);
      if (parsed.success) throw new Error("Expected invalid tool arguments");

      expect(coerceStringifiedJsonToolArgs(raw, parsed.error.issues)).toBeNull();
    });

    it.each([
      { args: "{}", filters: "[]" },
      { args: "[", filters: "{" },
      { args: "not-json", filters: "not-json" },
    ])("does not coerce invalid JSON or mismatched container types: %o", ({ args, filters }) => {
      const raw = { args, requests: [{ filters }] };
      const parsed = schema.safeParse(raw);
      expect(parsed.success).toBe(false);
      if (parsed.success) throw new Error("Expected invalid tool arguments");

      expect(coerceStringifiedJsonToolArgs(raw, parsed.error.issues)).toBeNull();
    });

    it("leaves container contents subject to schema revalidation", () => {
      const raw = { args: "[42]", requests: [{ filters: '{"owner":42}' }] };
      const parsed = schema.safeParse(raw);
      expect(parsed.success).toBe(false);
      if (parsed.success) throw new Error("Expected invalid tool arguments");

      const coerced = coerceStringifiedJsonToolArgs(raw, parsed.error.issues);

      expect(coerced).toEqual({ args: [42], requests: [{ filters: { owner: 42 } }] });
      expect(schema.safeParse(coerced).success).toBe(false);
    });
  });

  it("coerces stringified arrays for invalid_type issues", () => {
    const raw = {
      command: "python3",
      args: '["parse_excel.py"]',
    };

    const coerced = coerceStringifiedJsonToolArgs(raw, [
      {
        code: "invalid_type",
        expected: "array",
        received: "string",
        path: ["args"],
      },
    ]);

    expect(coerced).toEqual({
      command: "python3",
      args: ["parse_excel.py"],
    });
  });

  it("coerces stringified nested objects for invalid_type issues", () => {
    const raw = {
      tool: "search",
      payload: {
        query: "volt",
        filters: '{"owner":"workspace"}',
      },
    };

    const coerced = coerceStringifiedJsonToolArgs(raw, [
      {
        code: "invalid_type",
        expected: "object",
        received: "string",
        path: ["payload", "filters"],
      },
    ]);

    expect(coerced).toEqual({
      tool: "search",
      payload: {
        query: "volt",
        filters: {
          owner: "workspace",
        },
      },
    });
  });

  it("returns null when no coercion is needed", () => {
    const raw = {
      command: "python3",
      args: "not-json",
    };

    const coerced = coerceStringifiedJsonToolArgs(raw, [
      {
        code: "invalid_type",
        expected: "array",
        received: "string",
        path: ["args"],
      },
    ]);

    expect(coerced).toBeNull();
  });
});
