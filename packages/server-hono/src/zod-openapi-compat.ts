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

import { z as zodBase } from "zod";

// Detect Zod version by checking for toJSONSchema method (exists in v4, not in v3)
const isZodV4 = "toJSONSchema" in zodBase;

// Import both versions synchronously
import * as v3Module from "@hono/zod-openapi";
import * as v4Module from "@hono/zod-openapi-v4";

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

export const OpenAPIHono = selectedModule.OpenAPIHono;
export const createRoute = selectedModule.createRoute;
export const z = selectedModule.z;
export type OpenAPIHonoType = InstanceType<OpenAPIHonoCtor>;
