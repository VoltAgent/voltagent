/**
 * LibSQL Storage Adapter for Memory - Edge/Cloudflare Workers
 * Stores conversations and messages in remote Turso database
 * Uses @libsql/client/web for edge runtime compatibility
 */

import { createClient } from "@libsql/client/web";
import { AgentRegistry } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import type { Logger } from "@voltagent/logger";
import { LibSQLMemoryCore, type LibSQLMemoryCoreOptions } from "./memory-core";

/**
 * LibSQL configuration options for Memory (Edge)
 */
export interface LibSQLMemoryEdgeOptions extends LibSQLMemoryCoreOptions {
  /**
   * Database URL - must be a remote Turso URL (libsql://)
   * File-based URLs are not supported in edge environments
   */
  url: string;

  /**
   * Auth token for remote connections (required for Turso)
   */
  authToken: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Logger instance
   */
  logger?: Logger;
}

/**
 * LibSQL Storage Adapter for Memory - Edge Compatible
 * Production-ready storage for conversations and messages
 * Only supports remote Turso databases (libsql://)
 */
export class LibSQLMemoryAdapterEdge extends LibSQLMemoryCore {
  constructor(options: LibSQLMemoryEdgeOptions) {
    // Validate URL - edge only supports remote URLs
    if (!options.url) {
      throw new Error("LibSQLMemoryAdapterEdge requires a url option");
    }

    if (
      options.url.startsWith("file:") ||
      options.url === ":memory:" ||
      !options.url.startsWith("libsql://")
    ) {
      throw new Error(
        "LibSQLMemoryAdapterEdge only supports remote Turso URLs (libsql://). " +
          "File-based databases are not supported in edge environments. " +
          "Use LibSQLMemoryAdapter from '@voltagent/libsql' for Node.js environments.",
      );
    }

    if (!options.authToken) {
      throw new Error("LibSQLMemoryAdapterEdge requires an authToken for remote connections");
    }

    // Initialize logger
    const logger =
      options.logger ||
      AgentRegistry.getInstance().getGlobalLogger() ||
      createPinoLogger({ name: "libsql-memory-edge", level: options.debug ? "debug" : "info" });

    // Create LibSQL client using web-compatible import
    const client = createClient({
      url: options.url,
      authToken: options.authToken,
    });

    super(client, options.url, options, logger);
  }
}
