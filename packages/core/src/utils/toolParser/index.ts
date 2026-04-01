/**
 * Tool call interface
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Converts a Zod-like schema to a JSON representation usable in the UI
 * @param schema Any Zod schema object
 * @returns A JSON Schema compatible representation of the Zod schema
 */
export function zodSchemaToJsonUI(schema: any): any {
  if (!schema) return null;

  const def = schema._def ?? schema.def;
  const typeName = def?.typeName ?? def?.type;

  // Handle ZodObject
  if (typeName === "ZodObject" || typeName === "object") {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Zod v3 uses a shape() method, v4 exposes the object directly
    const shape = typeof def?.shape === "function" ? def.shape() : def?.shape;

    // Process each property in the object
    Object.entries(shape ?? {}).forEach(([key, value]: [string, any]) => {
      properties[key] = zodSchemaToJsonUI(value);

      // If the field is not optional, add to required list
      const valueTypeName = value?._def?.typeName ?? value?._def?.type ?? value?.def?.type;
      if (valueTypeName !== "ZodOptional" && valueTypeName !== "optional") {
        required.push(key);
      }
    });

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // Handle ZodString
  if (typeName === "ZodString" || typeName === "string") {
    return { type: "string" };
  }

  // Handle ZodNumber
  if (typeName === "ZodNumber" || typeName === "number") {
    return { type: "number" };
  }

  // Handle ZodBoolean
  if (typeName === "ZodBoolean" || typeName === "boolean") {
    return { type: "boolean" };
  }

  // Handle ZodArray
  if (typeName === "ZodArray" || typeName === "array") {
    const elementSchema =
      typeof def?.type === "object" && def?.type !== null ? def.type : def?.element;
    return {
      type: "array",
      items: zodSchemaToJsonUI(elementSchema),
    };
  }

  // Handle ZodEnum
  if (typeName === "ZodEnum" || typeName === "enum") {
    const enumValues = def?.values ?? (def?.entries ? Object.values(def.entries) : undefined);
    return {
      type: "string",
      ...(enumValues ? { enum: enumValues } : {}),
    };
  }

  // Handle ZodUnion (as oneOf)
  if (typeName === "ZodUnion" || typeName === "union") {
    return {
      oneOf: (def?.options ?? []).map((option: any) => zodSchemaToJsonUI(option)),
    };
  }

  // Handle ZodOptional by unwrapping
  if (typeName === "ZodOptional" || typeName === "optional") {
    return zodSchemaToJsonUI(def?.innerType);
  }

  // Handle ZodDefault by unwrapping
  if (typeName === "ZodDefault" || typeName === "default") {
    const innerSchema = zodSchemaToJsonUI(def?.innerType);
    const defaultValue =
      typeof def?.defaultValue === "function" ? def.defaultValue() : def?.defaultValue;
    return {
      ...innerSchema,
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    };
  }

  // Handle ZodRecord (as object with additionalProperties)
  if (typeName === "ZodRecord" || typeName === "record") {
    const valueSchema = def?.valueType ?? def?.element;
    return {
      type: "object",
      additionalProperties: valueSchema ? zodSchemaToJsonUI(valueSchema) : { type: "unknown" },
    };
  }

  // Fallback for other types
  return { type: "unknown" };
}
