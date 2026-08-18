import { asSchema } from "ai";
import * as v from "valibot";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createTool } from "./index";
import { normalizeToolSchemasForModel, toModelToolSchema } from "./standard-schema";

describe("Valibot tool schemas", () => {
  it("accepts a Valibot schema and infers execute args from it", async () => {
    const executed: Array<{ city: string; days?: number }> = [];

    const tool = createTool({
      name: "getWeather",
      description: "Get the weather for a city",
      parameters: v.object({
        city: v.string(),
        days: v.optional(v.number()),
      }),
      execute: async (args) => {
        // Types come from the Valibot schema, not `any`.
        expectTypeOf(args.city).toEqualTypeOf<string>();
        expectTypeOf(args.days).toEqualTypeOf<number | undefined>();
        executed.push(args);
        return { forecast: "sunny" };
      },
    });

    expect(tool.name).toBe("getWeather");
    expect(tool.parameters).toBeDefined();

    await tool.execute?.({ city: "Paris", days: 3 });
    expect(executed).toEqual([{ city: "Paris", days: 3 }]);
  });

  it("converts a Valibot schema to the same JSON Schema as the Zod equivalent", async () => {
    const valibotSchema = v.object({
      city: v.string(),
      days: v.optional(v.number()),
    });
    const zodSchema = z.object({
      city: z.string(),
      days: z.number().optional(),
    });

    const converted = await toModelToolSchema(valibotSchema);
    const valibotJson = asSchema(converted).jsonSchema;
    const zodJson = asSchema(zodSchema).jsonSchema;

    expect(valibotJson.type).toBe("object");
    expect(valibotJson.properties).toEqual({
      city: { type: "string" },
      days: { type: "number" },
    });
    expect(valibotJson.required).toEqual(["city"]);
    // Same shape the model would see for the Zod version.
    expect(valibotJson.properties).toEqual(zodJson.properties);
    expect(valibotJson.required).toEqual(zodJson.required);
  });

  it("keeps Valibot validation on the converted schema", async () => {
    const converted = await toModelToolSchema(
      v.object({ city: v.string(), days: v.optional(v.number()) }),
    );
    const schema = asSchema(converted);

    const ok = await schema.validate?.({ city: "Paris", days: 3 });
    expect(ok).toEqual({ success: true, value: { city: "Paris", days: 3 } });

    const bad = await schema.validate?.({ city: 123 });
    expect(bad?.success).toBe(false);
  });

  it("leaves Zod schemas untouched", async () => {
    const zodSchema = z.object({ query: z.string() });
    const result = await toModelToolSchema(zodSchema);
    expect(result).toBe(zodSchema);
  });

  it("normalizes only Valibot entries in a prepared tool map", async () => {
    const zodSchema = z.object({ query: z.string() });
    const valibotSchema = v.object({ query: v.string() });

    const tools: Record<string, { inputSchema?: unknown }> = {
      zodTool: { inputSchema: zodSchema },
      valibotTool: { inputSchema: valibotSchema },
      providerTool: {},
    };

    await normalizeToolSchemasForModel(tools);

    expect(tools.zodTool.inputSchema).toBe(zodSchema);
    expect(tools.valibotTool.inputSchema).not.toBe(valibotSchema);
    expect(asSchema(tools.valibotTool.inputSchema).jsonSchema.properties).toEqual({
      query: { type: "string" },
    });
    expect(tools.providerTool.inputSchema).toBeUndefined();
  });
});
