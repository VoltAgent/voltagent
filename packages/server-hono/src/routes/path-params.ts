import { z } from "../zod-openapi-compat";

export const createPathParam = (name: string, description: string, example?: string) => {
  const metadata: Record<string, unknown> = {
    description,
    param: { name, in: "path", required: true },
  };

  if (example !== undefined) {
    metadata.example = example;
  }

  const baseSchema = z.string().min(1);
  const schemaWithMetadata = baseSchema.openapi(`PathParam.${name}`, metadata);
  const schemaWithOptionalMeta = schemaWithMetadata as typeof schemaWithMetadata & {
    meta?: (metadata: Record<string, unknown>) => typeof schemaWithMetadata;
  };
  if (typeof schemaWithOptionalMeta.meta === "function") {
    return schemaWithOptionalMeta.meta(metadata);
  }
  return schemaWithMetadata;
};

export const requirePathParam = (
  c: { req: { param(name: string): string | undefined } },
  name: string,
) => {
  const value = c.req.param(name);
  if (!value) {
    throw new Error(`Missing required path parameter: ${name}`);
  }
  return value;
};
