import { type TSchema, Type } from "@sinclair/typebox";
import type { ZodType, ZodTypeDef } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

function getOptions(schema: any) {
  const options = { ...schema };
  options.type = undefined;
  options.properties = undefined;
  options.required = undefined;
  options.items = undefined;
  options.anyOf = undefined;
  options.allOf = undefined;
  options.oneOf = undefined;
  options.enum = undefined;
  options.const = undefined;
  options.additionalProperties = undefined;
  options.nullable = undefined;
  return options;
}

function mapJsonSchemaToTypeBox(schema: any): TSchema {
  if (!schema || Object.keys(schema).length === 0) {
    return Type.Any();
  }

  const options = getOptions(schema);

  // Handle anyOf, allOf, oneOf
  if (schema.anyOf) {
    return Type.Union(schema.anyOf.map(mapJsonSchemaToTypeBox), options);
  }
  if (schema.allOf) {
    return Type.Intersect(schema.allOf.map(mapJsonSchemaToTypeBox), options);
  }
  if (schema.oneOf) {
    return Type.Union(schema.oneOf.map(mapJsonSchemaToTypeBox), options);
  }

  // Handle enums
  if (schema.enum) {
    return Type.Union(
      schema.enum.map((v: any) => Type.Literal(v)),
      options,
    );
  }

  // Handle const
  if (schema.const !== undefined) {
    return Type.Literal(schema.const, options);
  }

  let result: TSchema;

  // Handle types
  switch (schema.type) {
    case "object": {
      const properties: Record<string, TSchema> = {};
      const required = new Set(schema.required || []);

      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          const propSchema = mapJsonSchemaToTypeBox(value);
          properties[key] = required.has(key) ? propSchema : Type.Optional(propSchema);
        }
      }

      const opts = { ...options };
      if (typeof schema.additionalProperties === "object") {
        opts.additionalProperties = mapJsonSchemaToTypeBox(schema.additionalProperties);
      } else if (schema.additionalProperties !== undefined) {
        opts.additionalProperties = schema.additionalProperties;
      }

      result = Type.Object(properties, opts);
      break;
    }
    case "array":
      if (Array.isArray(schema.items)) {
        result = Type.Tuple(schema.items.map(mapJsonSchemaToTypeBox), options);
      } else {
        result = Type.Array(mapJsonSchemaToTypeBox(schema.items), options);
      }
      break;
    case "string":
      result = Type.String(options);
      break;
    case "number":
      result = Type.Number(options);
      break;
    case "integer":
      result = Type.Integer(options);
      break;
    case "boolean":
      result = Type.Boolean(options);
      break;
    case "null":
      result = Type.Null(options);
      break;
    default:
      // If no type is specified and no combinators, it's likely Any or Unknown
      // We default to Any to be safe, as Type.Unsafe(schema) crashes if schema is raw JSON
      result = Type.Any(options);
  }

  if (schema.nullable) {
    return Type.Union([result, Type.Null()]);
  }

  return result;
}

/**
 * Converts a Zod schema to a TypeBox schema (via JSON Schema)
 * This allows us to reuse Zod schemas from @voltagent/server-core
 * while maintaining Elysia's TypeBox-based validation pipeline.
 */
export function zodToTypeBox<T extends ZodType<any, ZodTypeDef, any>>(zodSchema: T): TSchema {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    target: "jsonSchema7",
    $refStrategy: "none",
  });

  return mapJsonSchemaToTypeBox(jsonSchema);
}
