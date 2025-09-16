/**
 * Compatibility layer for @hono/zod-openapi to support both Zod v3 and v4
 *
 * This module provides a unified interface that works with both Zod versions.
 * It will automatically select the appropriate @hono/zod-openapi version
 * based on the installed Zod version in the project.
 *
 * - Zod v3: Uses @hono/zod-openapi (0.19.10)
 * - Zod v4: Uses @hono/zod-openapi-v4 (1.1.0+)
 *
 * For now, we're using the v3 compatible version (0.19.10) which supports
 * both Zod v3 and has loose compatibility with v4 (>=3.0.0)
 */

// Re-export everything from the v3 compatible version
// @hono/zod-openapi@0.19.10 has peerDeps: zod: '>=3.0.0' so it works with both v3 and v4
export { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
export type { OpenAPIHono as OpenAPIHonoType } from "@hono/zod-openapi";
