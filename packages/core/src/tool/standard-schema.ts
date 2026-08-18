import type { StandardSchemaV1 } from "@standard-schema/spec";
import { safeStringify } from "@voltagent/internal/utils";
import { jsonSchema } from "ai";

/**
 * Tool schemas can come from any Standard Schema library, not just Zod. The AI SDK
 * turns Zod schemas and any Standard Schema that ships a JSON Schema extension into
 * JSON Schema on its own, so those pass straight through.
 *
 * Valibot is the exception: as of v1 its `~standard` entry only exposes `validate`,
 * with no JSON Schema, so the model would never see the parameter shape. For those we
 * convert to JSON Schema with `@valibot/to-json-schema` (an optional peer dependency)
 * and keep Valibot's own validator for argument checking.
 */

type ToJsonSchema = (schema: unknown, config?: Record<string, unknown>) => Record<string, unknown>;

let converterPromise: Promise<ToJsonSchema> | undefined;

function isStandardSchema(schema: unknown): schema is StandardSchemaV1 {
  return typeof schema === "object" && schema !== null && "~standard" in schema;
}

/**
 * True when a schema needs VoltAgent to convert it before the AI SDK sees it.
 * Zod and JSON-Schema-capable Standard Schemas are left untouched.
 */
function needsValibotConversion(schema: unknown): schema is StandardSchemaV1 {
  if (!isStandardSchema(schema)) return false;
  const standard = schema["~standard"] as StandardSchemaV1.Props & { jsonSchema?: unknown };
  if (standard.vendor === "zod") return false;
  if ("jsonSchema" in standard) return false;
  return standard.vendor === "valibot";
}

async function loadValibotConverter(): Promise<ToJsonSchema> {
  if (!converterPromise) {
    converterPromise = import("@valibot/to-json-schema")
      .then((mod) => mod.toJsonSchema as unknown as ToJsonSchema)
      .catch(() => {
        throw new Error(
          "A Valibot schema was passed to a tool, but '@valibot/to-json-schema' is not installed. " +
            "Install it to use Valibot schemas: `npm install @valibot/to-json-schema`.",
        );
      });
  }
  return converterPromise;
}

/**
 * Normalize a tool schema into a form the AI SDK can hand to the model. Zod and other
 * schemas pass through unchanged; Valibot schemas are converted to a JSON Schema that
 * keeps Valibot's runtime validation.
 */
export async function toModelToolSchema(schema: unknown): Promise<unknown> {
  if (!needsValibotConversion(schema)) {
    return schema;
  }

  const toJsonSchema = await loadValibotConverter();
  const standard = schema["~standard"];

  return jsonSchema(toJsonSchema(schema, { errorMode: "ignore" }), {
    validate: async (value) => {
      const result = await standard.validate(value);
      if (result.issues) {
        return {
          success: false,
          error: new Error(`Tool argument validation failed: ${safeStringify(result.issues)}`),
        };
      }
      return { success: true, value: result.value };
    },
  });
}

/**
 * Rewrite the `inputSchema` of every entry in a prepared tool map so Valibot-defined
 * tools produce a JSON Schema for the model. Mutates in place; provider tools and
 * tools without a schema are left alone.
 */
export async function normalizeToolSchemasForModel(
  tools: Record<string, { inputSchema?: unknown }>,
): Promise<void> {
  await Promise.all(
    Object.values(tools).map(async (tool) => {
      if (tool && "inputSchema" in tool && needsValibotConversion(tool.inputSchema)) {
        tool.inputSchema = await toModelToolSchema(tool.inputSchema);
      }
    }),
  );
}
