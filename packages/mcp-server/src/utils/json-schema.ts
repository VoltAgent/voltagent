export interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

const EMPTY_OBJECT_SCHEMA: JsonSchemaObject = { type: "object", properties: {} };
const SIMPLE_ITEMS_SCHEMA: JsonSchemaObject = { type: "string" };

export function toJsonSchema(zodSchema: unknown): JsonSchemaObject {
  if (!zodSchema) {
    console.warn("toJsonSchema received null/undefined schema, returning empty object schema");
    return { ...EMPTY_OBJECT_SCHEMA };
  }

  if (isJsonSchemaObject(zodSchema)) {
    return zodSchema;
  }

  const def = extractDefinition(zodSchema);
  if (!def?.typeName) {
    logInvalidSchema(zodSchema, def);
    return { ...EMPTY_OBJECT_SCHEMA, additionalProperties: true };
  }

  if (def.typeName === "ZodOptional") {
    const inner = getInnerSchema(def.innerType);
    return inner ? toJsonSchema(inner) : { ...EMPTY_OBJECT_SCHEMA };
  }

  switch (def.typeName) {
    case "ZodObject":
      return convertObjectSchema(zodSchema, def);
    case "ZodString":
      return primitiveSchema("string", def.description);
    case "ZodNumber":
      return primitiveSchema("number", def.description);
    case "ZodBoolean":
      return primitiveSchema("boolean", def.description);
    case "ZodArray":
      return convertArraySchema(def);
    case "ZodAny":
    case "ZodUnknown":
      return { ...EMPTY_OBJECT_SCHEMA, additionalProperties: true };
    default:
      console.warn(`toJsonSchema: Unknown Zod type ${def.typeName}, defaulting to object schema`);
      return { ...EMPTY_OBJECT_SCHEMA };
  }
}

function isJsonSchemaObject(value: unknown): value is JsonSchemaObject {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return "type" in candidate || "properties" in candidate;
}

function extractDefinition(schema: unknown): any | undefined {
  if (!schema || typeof schema !== "object") {
    return undefined;
  }

  const candidate = (schema as any)._def ?? (schema as any).def;
  return candidate;
}

function logInvalidSchema(schema: unknown, def: unknown): void {
  console.warn("toJsonSchema received invalid Zod schema structure", {
    hasDefinition: !!def,
    has_def: !!(schema as any)?._def,
    hasDef: !!(schema as any)?.def,
    keys: schema ? Object.keys(schema as object).slice(0, 10) : [],
    type: typeof schema,
    defKeys: def ? Object.keys(def as object) : [],
  });
}

function convertObjectSchema(zodSchema: unknown, def: any): JsonSchemaObject {
  const shape = resolveShape(zodSchema, def);
  const properties: Record<string, JsonSchemaObject> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const conversion = convertField(value);
    if (!conversion) {
      continue;
    }

    properties[key] = conversion.schema;
    if (!conversion.optional) {
      required.push(key);
    }
  }

  const schema: JsonSchemaObject = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

function resolveShape(zodSchema: unknown, def: any): Record<string, unknown> {
  const schemaAsAny = zodSchema as any;

  if (typeof def.shape === "function") {
    try {
      return def.shape();
    } catch (error) {
      console.warn("toJsonSchema: error calling def.shape()", { error });
      return {};
    }
  }

  if (def.shape && typeof def.shape === "object") {
    return def.shape as Record<string, unknown>;
  }

  if (typeof schemaAsAny?.shape === "function") {
    try {
      return schemaAsAny.shape();
    } catch (error) {
      console.warn("toJsonSchema: error calling schema.shape()", { error });
      return {};
    }
  }

  if (schemaAsAny?.shape && typeof schemaAsAny.shape === "object") {
    return schemaAsAny.shape as Record<string, unknown>;
  }

  return {};
}

function convertField(field: unknown): { schema: JsonSchemaObject; optional: boolean } | undefined {
  const def = extractDefinition(field);
  if (!def?.typeName) {
    return undefined;
  }

  if (def.typeName === "ZodOptional") {
    const inner = convertField(def.innerType);
    if (!inner) {
      return undefined;
    }

    return { schema: inner.schema, optional: true };
  }

  if (def.typeName === "ZodArray") {
    const itemsSchema = inferArrayItems(def);
    return {
      schema: {
        type: "array",
        items: itemsSchema,
        description: def.description ?? undefined,
      },
      optional: false,
    };
  }

  if (def.typeName === "ZodObject") {
    return {
      schema: convertObjectSchema(field, def),
      optional: false,
    };
  }

  const primitive = convertPrimitiveSchema(def);
  if (primitive) {
    return { schema: primitive, optional: false };
  }

  if (def.typeName === "ZodAny" || def.typeName === "ZodUnknown") {
    return {
      schema: { ...EMPTY_OBJECT_SCHEMA, additionalProperties: true },
      optional: false,
    };
  }

  console.warn(
    `toJsonSchema: Unhandled nested Zod type ${def.typeName}, defaulting to object schema`,
  );
  return {
    schema: { ...EMPTY_OBJECT_SCHEMA },
    optional: false,
  };
}

function convertPrimitiveSchema(def: any): JsonSchemaObject | undefined {
  switch (def.typeName) {
    case "ZodString":
      return primitiveSchema("string", def.description);
    case "ZodNumber":
      return primitiveSchema("number", def.description);
    case "ZodBoolean":
      return primitiveSchema("boolean", def.description);
    default:
      return undefined;
  }
}

function convertArraySchema(def: any): JsonSchemaObject {
  return {
    type: "array",
    items: inferArrayItems(def),
    description: def.description ?? undefined,
  };
}

function inferArrayItems(def: any): JsonSchemaObject {
  const inner = getInnerSchema(def.type ?? def.innerType);
  if (!inner) {
    return { ...SIMPLE_ITEMS_SCHEMA };
  }

  const innerDef = extractDefinition(inner);
  if (!innerDef?.typeName) {
    return { ...SIMPLE_ITEMS_SCHEMA };
  }

  if (innerDef.typeName === "ZodObject") {
    return convertObjectSchema(inner, innerDef);
  }

  return convertPrimitiveSchema(innerDef) ?? { ...SIMPLE_ITEMS_SCHEMA };
}

function getInnerSchema(value: unknown): unknown {
  if (!value) {
    return undefined;
  }

  if (typeof value === "function") {
    try {
      return value();
    } catch (error) {
      console.warn("toJsonSchema: error calling inner schema factory", { error });
      return undefined;
    }
  }

  return value;
}

function primitiveSchema(type: string, description?: string): JsonSchemaObject {
  const schema: JsonSchemaObject = { type };
  if (description) {
    schema.description = description;
  }
  return schema;
}
