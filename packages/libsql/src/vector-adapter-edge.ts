/**
 * LibSQL Vector Adapter - Edge/Cloudflare Workers
 * Provides vector storage and similarity search using remote Turso database
 * Uses @libsql/client/web for edge runtime compatibility
 */

import { createClient } from "@libsql/client/web";
import { createPinoLogger } from "@voltagent/logger";
import type { Logger } from "@voltagent/logger";
import { LibSQLVectorCore, type LibSQLVectorCoreOptions } from "./vector-core";

/**
 * LibSQL Vector Adapter configuration options (Edge)
 */
export interface LibSQLVectorEdgeOptions extends LibSQLVectorCoreOptions {
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
   * Logger instance
   */
  logger?: Logger;
}

/**
 * LibSQL Vector Adapter - Edge Compatible
 * Production-ready vector storage with similarity search
 * Only supports remote Turso databases (libsql://)
 */
export class LibSQLVectorAdapterEdge extends LibSQLVectorCore {
  constructor(options: LibSQLVectorEdgeOptions) {
    // Validate URL - edge only supports remote URLs
    if (!options.url) {
      throw new Error("LibSQLVectorAdapterEdge requires a url option");
    }

    if (
      options.url.startsWith("file:") ||
      options.url === ":memory:" ||
      !options.url.startsWith("libsql://")
    ) {
      throw new Error(
        "LibSQLVectorAdapterEdge only supports remote Turso URLs (libsql://). " +
          "File-based databases are not supported in edge environments. " +
          "Use LibSQLVectorAdapter from '@voltagent/libsql' for Node.js environments.",
      );
    }

    if (!options.authToken) {
      throw new Error("LibSQLVectorAdapterEdge requires an authToken for remote connections");
    }

    // Initialize logger
    const logger =
      options.logger ??
      createPinoLogger({
        name: "libsql-vector-adapter-edge",
        level: options.debug ? "debug" : "info",
      });

    // Initialize LibSQL client using web-compatible import
    const client = createClient({
      url: options.url,
      authToken: options.authToken,
    });

    super(client, options, logger);
  }
}
