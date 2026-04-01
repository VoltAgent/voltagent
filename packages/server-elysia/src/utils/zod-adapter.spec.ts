import { TypeCompiler } from "@sinclair/typebox/compiler";
import { TextRequestSchema } from "@voltagent/server-core";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { zodToTypeBox } from "./zod-adapter";

describe("Zod Adapter", () => {
  test("should compile TextRequestSchema", () => {
    const schema = zodToTypeBox(TextRequestSchema);
    const C = TypeCompiler.Compile(schema);
    expect(C).toBeDefined();

    // Basic validation check
    const valid = C.Check({
      input: "hello",
      options: {
        temperature: 0.5,
      },
    });
    expect(valid).toBe(true);
  });

  test("should compile schema with exclusiveMinimum", () => {
    const schema = z.number().gt(0);
    const tbSchema = zodToTypeBox(schema);
    const C = TypeCompiler.Compile(tbSchema);
    expect(C.Check(1)).toBe(true);
    expect(C.Check(0)).toBe(false);
  });
});
