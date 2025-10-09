/**
 * Compatibility layer for the vendored @hono/zod-openapi implementations to support both Zod v3 and v4
 *
 * This module provides a unified interface that works with both Zod versions.
 * It will automatically select the appropriate upstream implementation
 * based on the installed Zod version in the project.
 *
 * - Zod v3: Uses vendored @hono/zod-openapi 0.19.10
 * - Zod v4: Uses vendored @hono/zod-openapi 1.1.0+
 */

import { z as zodBase } from "zod";
import * as zodOpenApiV3 from "./vendor/zod-openapi/v3";
import * as zodOpenApiV4 from "./vendor/zod-openapi/v4";

const isZodV4 = (() => {
  const testSchema = zodBase.string();
  const candidate = testSchema as unknown as {
    toJSON?: (() => unknown) | undefined;
    toJSONSchema?: (() => unknown) | undefined;
  };
  if (typeof candidate.toJSON === "function" || typeof candidate.toJSONSchema === "function") {
    return true;
  }
  return "toJSONSchema" in zodBase;
})();

export const __isZodV4 = isZodV4;

// Expose detection result for debugging/testing scenarios
if (typeof globalThis !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__VOLT_ZOD_IS_V4 = isZodV4;
  } catch {
    // ignore errors when globalThis is not writable (e.g., strict sandbox)
  }
}

type ModuleExportsV3 = typeof import("./vendor/zod-openapi/v3");
type CompatibleModule = Pick<ModuleExportsV3, "OpenAPIHono" | "createRoute" | "z">;

const selectedModule = (
  isZodV4 ? (zodOpenApiV4 as unknown as ModuleExportsV3) : zodOpenApiV3
) as CompatibleModule;

type OpenAPIHonoCtor = CompatibleModule["OpenAPIHono"];

// Ensure metadata added via .openapi is also mirrored into Zod's meta storage so that
// environments loading multiple module formats (ESM/CJS) can still retrieve parameter
// information without relying solely on the internal registry instance.
const originalOpenApi = selectedModule.z.ZodType.prototype.openapi;
selectedModule.z.ZodType.prototype.openapi = function proxyOpenApi(
  refOrMetadata: unknown,
  metadataOrOptions?: unknown,
  maybeOptions?: unknown,
) {
  const result = originalOpenApi.call(
    this,
    refOrMetadata as never,
    metadataOrOptions as never,
    maybeOptions as never,
  );

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

export const OpenAPIHono = selectedModule.OpenAPIHono;
export const createRoute = selectedModule.createRoute;
export const z = selectedModule.z;
export type OpenAPIHonoType = InstanceType<OpenAPIHonoCtor>;
