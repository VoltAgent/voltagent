/**
 * LibSQL Observability Adapter - Edge/Cloudflare Workers
 * Provides persistent storage for OpenTelemetry spans using remote Turso database
 * Uses @libsql/client/web for edge runtime compatibility
 */

import { createClient } from "@libsql/client/web";
import { createPinoLogger } from "@voltagent/logger";
import type { Logger } from "@voltagent/logger";
import { LibSQLObservabilityCore, type LibSQLObservabilityCoreOptions } from "./observability-core";

/**
 * Options for configuring the LibSQLObservabilityAdapterEdge
 */
export interface LibSQLObservabilityEdgeOptions extends LibSQLObservabilityCoreOptions {
  /**
   * LibSQL connection URL - must be a remote Turso URL (libsql://)
   * File-based URLs are not supported in edge environments
   */
  url: string;

  /**
   * Auth token for LibSQL/Turso (required for remote connections)
   */
  authToken: string;

  /**
   * Optional logger instance
   */
  logger?: Logger;
}

/**
 * LibSQL Observability Adapter - Edge Compatible
 * Provides observability storage using remote Turso database
 * Only supports remote Turso databases (libsql://)
 */
export class LibSQLObservabilityAdapterEdge extends LibSQLObservabilityCore {
  constructor(options: LibSQLObservabilityEdgeOptions) {
    // Validate URL - edge only supports remote URLs
    if (!options.url) {
      throw new Error("LibSQLObservabilityAdapterEdge requires a url option");
    }

    if (
      options.url.startsWith("file:") ||
      options.url === ":memory:" ||
      !options.url.startsWith("libsql://")
    ) {
      throw new Error(
        "LibSQLObservabilityAdapterEdge only supports remote Turso URLs (libsql://). " +
          "File-based databases are not supported in edge environments. " +
          "Use LibSQLObservabilityAdapter from '@voltagent/libsql' for Node.js environments.",
      );
    }

    if (!options.authToken) {
      throw new Error(
        "LibSQLObservabilityAdapterEdge requires an authToken for remote connections",
      );
    }

    // Initialize the logger
    const logger = options.logger || createPinoLogger({ name: "libsql-observability-edge" });

    // Initialize the LibSQL client using web-compatible import
    const client = createClient({
      url: options.url,
      authToken: options.authToken,
    });

    super(client, options, logger);
  }
}
