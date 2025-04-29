import type { AnthropicTool } from "@/types";
import type { BaseTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Converts a Zod schema to JSON Schema format that Anthropic expects
 */
function zodToJsonSchema(schema: z.ZodType<any>): {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
} {
  // Check if it's a ZodObject by checking for the typeName property
  if (
    schema &&
    typeof schema === "object" &&
    "_def" in schema &&
    schema._def &&
    typeof schema._def === "object" &&
    "typeName" in schema._def &&
    schema._def.typeName === "ZodObject"
  ) {
    // Use a safer type assertion approach
    const def = schema._def as unknown as { shape: () => Record<string, z.ZodTypeAny> };
    const shape = def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = convertZodField(value as z.ZodTypeAny);
      properties[key] = fieldSchema;

      // Check if the field is required
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return {
      type: "object" as const,
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  throw new Error("Root schema must be a Zod object");
}

function getBaseSchema(field: z.ZodType, type: string) {
  return {
    type,
    ...(field.description ? { description: field.description } : {}),
  };
}

function handlePrimitiveType(field: z.ZodTypeAny, type: string) {
  return getBaseSchema(field, type);
}

function convertZodField(zodField: z.ZodTypeAny): any {
  if (zodField instanceof z.ZodString) {
    return handlePrimitiveType(zodField, "string");
  }
  if (zodField instanceof z.ZodNumber) {
    return handlePrimitiveType(zodField, "number");
  }
  if (zodField instanceof z.ZodBoolean) {
    return handlePrimitiveType(zodField, "boolean");
  }
  if (zodField instanceof z.ZodArray) {
    return {
      type: "array",
      items: convertZodField(zodField.element),
      ...(zodField.description ? { description: zodField.description } : {}),
    };
  }
  if (zodField instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: zodField._def.values,
      ...(zodField.description ? { description: zodField.description } : {}),
    };
  }
  if (zodField instanceof z.ZodOptional) {
    return convertZodField(zodField.unwrap());
  }
  return { type: "string" };
}

/**
 * Converts a core Tool instance to Anthropic's tool format
 */
export function coreToolToAnthropic(tools: BaseTool[]): AnthropicTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.parameters),
  }));
}

export { convertZodField };
