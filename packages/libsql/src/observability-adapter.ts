/**
 * LibSQL Observability Adapter - Node.js
 * Provides persistent storage for OpenTelemetry spans using LibSQL/Turso database
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { createPinoLogger } from "@voltagent/logger";
import type { Logger } from "@voltagent/logger";
import { LibSQLObservabilityCore, type LibSQLObservabilityCoreOptions } from "./observability-core";

/**
 * Options for configuring the LibSQLObservabilityAdapter
 */
export interface LibSQLObservabilityOptions extends LibSQLObservabilityCoreOptions {
  /**
   * LibSQL connection URL
   * Can be either a remote Turso URL or a local file path
   * @default "file:./.voltagent/observability.db"
   */
  url?: string;

  /**
   * Auth token for LibSQL/Turso
   * Not needed for local SQLite
   */
  authToken?: string;

  /**
   * Optional logger instance
   */
  logger?: Logger;
}

/**
 * LibSQL Observability Adapter - Node.js
 * Provides observability storage using LibSQL/Turso database
 * Supports both local SQLite files and remote Turso databases
 */
export class LibSQLObservabilityAdapter extends LibSQLObservabilityCore {
  constructor(options: LibSQLObservabilityOptions = {}) {
    const url = options.url || "file:./.voltagent/observability.db";

    // Initialize the logger
    const logger = options.logger || createPinoLogger({ name: "libsql-observability" });

    // Ensure parent directory exists for file-based databases
    if (url.startsWith("file:") && !url.includes(":memory:")) {
      const filePath = url.substring(5);
      const dir = dirname(filePath);
      if (dir && dir !== "." && !existsSync(dir)) {
        try {
          mkdirSync(dir, { recursive: true });
          if (options.debug) {
            logger.debug("Created directory for database", { dir });
          }
        } catch (error) {
          logger.warn("Failed to create directory for database", { dir, error });
        }
      }
    }

    // Initialize the LibSQL client
    const client = createClient({
      url,
      authToken: options.authToken,
    });

    super(client, options, logger);
  }
}
