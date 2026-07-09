/**
 * Compatibility layer for the vendored @hono/zod-openapi implementation.
 *
 * VoltAgent 3 is Zod 4-only, so this module always exposes the vendored
 * @hono/zod-openapi implementation that targets Zod 4.
 */

import * as zodOpenApi from "./vendor/zod-openapi/v4";

export const __isZodV4 = true;

// Expose detection result for debugging/testing scenarios
if (typeof globalThis !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__VOLT_ZOD_IS_V4 = true;
  } catch {
    // ignore errors when globalThis is not writable (e.g., strict sandbox)
  }
}

type OpenAPIHonoCtor = typeof zodOpenApi.OpenAPIHono;

const openApiZ = zodOpenApi.z;

// Ensure metadata added via .openapi is also mirrored into Zod's meta storage so that
// environments loading multiple module formats (ESM/CJS) can still retrieve parameter
// information without relying solely on the internal registry instance.
const originalOpenApi = openApiZ.ZodType.prototype.openapi as (...args: unknown[]) => unknown;
openApiZ.ZodType.prototype.openapi = function proxyOpenApi(
  refOrMetadata: unknown,
  metadataOrOptions?: unknown,
  maybeOptions?: unknown,
) {
  const result = originalOpenApi.apply(this, [refOrMetadata, metadataOrOptions, maybeOptions]);

  const metadata =
    typeof refOrMetadata === "string"
      ? (metadataOrOptions as Record<string, unknown> | undefined)
      : (refOrMetadata as Record<string, unknown> | undefined);

  if (metadata && typeof result === "object" && result && "meta" in result) {
    try {
      const reader = (result as { meta(): Record<string, unknown> | undefined }).meta;
      const writer = (result as { meta(data: Record<string, unknown>): unknown }).meta;
      if (typeof writer === "function") {
        const existing = typeof reader === "function" ? (reader.call(result) ?? {}) : {};
        return writer.call(result, {
          ...existing,
          ...metadata,
        }) as typeof result;
      }
    } catch {
      // If meta cannot be assigned we silently continue – registry data is still available.
    }
  }

  return result;
};

export const OpenAPIHono = zodOpenApi.OpenAPIHono;
export const createRoute = zodOpenApi.createRoute;
export const z = openApiZ;
type OpenAPIHonoInstance = InstanceType<OpenAPIHonoCtor>;
export type OpenAPIHonoType = Omit<OpenAPIHonoInstance, "openapi"> & {
  openapi: (route: any, handler: (c: any) => any) => any;
};
