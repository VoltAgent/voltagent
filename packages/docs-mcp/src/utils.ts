// Helper function to convert Zod schema to JSON Schema
export function zodToJsonSchema(zodSchema: any): any {
  const shape = zodSchema._def.shape();
  const properties: any = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const field = value as any;
    const fieldDef = field._def;

    if (fieldDef.typeName === "ZodString") {
      properties[key] = {
        type: "string",
        description: fieldDef.description || undefined,
      };
    } else if (fieldDef.typeName === "ZodNumber") {
      properties[key] = {
        type: "number",
        description: fieldDef.description || undefined,
      };
    } else if (fieldDef.typeName === "ZodArray") {
      properties[key] = {
        type: "array",
        items: { type: "string" }, // Simplified for string arrays
        description: fieldDef.description || undefined,
      };
    } else if (fieldDef.typeName === "ZodOptional") {
      const innerSchema = fieldDef.innerType._def;
      if (innerSchema.typeName === "ZodString") {
        properties[key] = {
          type: "string",
          description: innerSchema.description || undefined,
        };
      } else if (innerSchema.typeName === "ZodNumber") {
        properties[key] = {
          type: "number",
          description: innerSchema.description || undefined,
        };
      } else if (innerSchema.typeName === "ZodArray") {
        properties[key] = {
          type: "array",
          items: { type: "string" },
          description: innerSchema.description || undefined,
        };
      }
      // Optional fields are not added to required array
      continue;
    }

    // Add to required if not optional
    if (fieldDef.typeName !== "ZodOptional") {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  };
}
