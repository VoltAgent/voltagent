/**
 * Compatibility layer for @hono/zod-openapi to support both Zod v3 and v4
 *
 * This module provides a unified interface that works with both Zod versions.
 * It will automatically select the appropriate @hono/zod-openapi version
 * based on the installed Zod version in the project.
 *
 * - Zod v3: Uses @hono/zod-openapi (0.19.10)
 * - Zod v4: Uses @hono/zod-openapi-v4 (1.1.0+)
 */

import { createRequire } from "node:module";
import { join } from "node:path";
import { z as zodBase } from "zod";

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

const moduleUrl = (() => {
  try {
    // Use dynamic evaluation so bundlers targeting CJS don't warn about import.meta
    return new Function("return import.meta.url;")();
  } catch {
    return undefined;
  }
})();

const require =
  typeof moduleUrl === "string"
    ? createRequire(moduleUrl)
    : typeof __filename === "string"
      ? createRequire(__filename)
      : createRequire(join(process.cwd(), "index.js"));

// Import both versions synchronously using their CommonJS entrypoints to avoid
// duplicate module instances when mixing ESM/CJS loaders.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const v3Module = require("@hono/zod-openapi");

let v4Module: CompatibleModule | undefined;
if (isZodV4) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    v4Module = require("@hono/zod-openapi-v4");
  } catch (error) {
    const notFound =
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "MODULE_NOT_FOUND";
    if (!notFound) {
      throw error;
    }
    throw new Error(
      "@hono/zod-openapi-v4 is required when using Zod v4. Install it alongside @hono/zod-openapi or downgrade to Zod v3.",
    );
  }
}

type OpenAPIHonoCtor = typeof v3Module.OpenAPIHono;
type CreateRouteFn = typeof v3Module.createRoute;
type ZExport = typeof v3Module.z;

interface CompatibleModule {
  OpenAPIHono: OpenAPIHonoCtor;
  createRoute: CreateRouteFn;
  z: ZExport;
}

// Select the appropriate module based on Zod version but retain v3 typings for compatibility
const selectedModule = (isZodV4 ? v4Module : v3Module) as CompatibleModule;

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
