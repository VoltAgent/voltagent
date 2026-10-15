export interface JsonSchema {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
}

export function schemaSample(schema?: JsonSchema): unknown {
  if (!schema) return {};
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.anyOf || schema.oneOf) return schemaSample((schema.anyOf ?? schema.oneOf)?.[0]);
  if (schema.type === "object" || schema.properties)
    return Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([key, field]) => schema.required?.includes(key) || field.default !== undefined)
        .map(([key, field]) => [key, schemaSample(field)]),
    );
  if (schema.type === "array") return [];
  if (schema.type === "boolean") return false;
  if (schema.type === "integer" || schema.type === "number") return 0;
  if (schema.type === "null") return null;
  return schema.type === "string" ? "" : {};
}
