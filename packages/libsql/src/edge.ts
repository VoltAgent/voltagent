/**
 * Edge/Cloudflare Workers entrypoint for @voltagent/libsql
 *
 * This module provides edge-compatible adapters that work with Cloudflare Workers,
 * Vercel Edge Functions, and other edge runtimes.
 *
 * Key differences from the main entrypoint:
 * - Uses @libsql/client/web instead of @libsql/client
 * - Only supports remote Turso URLs (libsql://)
 * - No file system operations (no local SQLite support)
 *
 * Usage:
 * ```typescript
 * import { LibSQLMemoryAdapter } from "@voltagent/libsql/edge";
 *
 * const adapter = new LibSQLMemoryAdapter({
 *   url: "libsql://your-db.turso.io",
 *   authToken: "your-token",
 * });
 * ```
 */

// Export Edge Memory adapter (with alias for drop-in compatibility)
export { LibSQLMemoryAdapterEdge as LibSQLMemoryAdapter } from "./memory-v2-adapter-edge";
export { LibSQLMemoryAdapterEdge } from "./memory-v2-adapter-edge";
export type {
  LibSQLMemoryEdgeOptions as LibSQLMemoryOptions,
  LibSQLMemoryEdgeOptions,
} from "./memory-v2-adapter-edge";

// Export Edge Observability adapter (with alias for drop-in compatibility)
export { LibSQLObservabilityAdapterEdge as LibSQLObservabilityAdapter } from "./observability-adapter-edge";
export { LibSQLObservabilityAdapterEdge } from "./observability-adapter-edge";
export type {
  LibSQLObservabilityEdgeOptions as LibSQLObservabilityOptions,
  LibSQLObservabilityEdgeOptions,
} from "./observability-adapter-edge";

// Export Edge Vector adapter (with alias for drop-in compatibility)
export { LibSQLVectorAdapterEdge as LibSQLVectorAdapter } from "./vector-adapter-edge";
export { LibSQLVectorAdapterEdge } from "./vector-adapter-edge";
export type {
  LibSQLVectorEdgeOptions as LibSQLVectorOptions,
  LibSQLVectorEdgeOptions,
} from "./vector-adapter-edge";
