/**
 * LibSQL Storage Adapter for Memory - Node.js
 * Stores conversations and messages in SQLite/Turso database
 * Supports both local file databases and remote Turso connections
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { AgentRegistry } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import type { Logger } from "@voltagent/logger";
import { LibSQLMemoryCore, type LibSQLMemoryCoreOptions } from "./memory-core";

/**
 * LibSQL configuration options for Memory
 */
export interface LibSQLMemoryOptions extends LibSQLMemoryCoreOptions {
  /**
   * Database URL (e.g., 'file:./conversations.db' or 'libsql://...')
   * @default "file:./.voltagent/memory.db"
   */
  url?: string;

  /**
   * Auth token for remote connections (optional)
   */
  authToken?: string;

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
 * LibSQL Storage Adapter for Memory - Node.js
 * Production-ready storage for conversations and messages
 * Supports both local SQLite files and remote Turso databases
 */
export class LibSQLMemoryAdapter extends LibSQLMemoryCore {
  constructor(options: LibSQLMemoryOptions = {}) {
    const url = options.url ?? "file:./.voltagent/memory.db";

    // Initialize logger - use provided logger, global logger, or create new one
    const logger =
      options.logger ||
      AgentRegistry.getInstance().getGlobalLogger() ||
      createPinoLogger({ name: "libsql-memory" });

    // Create directory for file-based databases
    if (url.startsWith("file:")) {
      const dbPath = url.replace("file:", "");
      const dbDir = path.dirname(dbPath);
      if (dbDir && dbDir !== "." && !fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.debug(`Created database directory: ${dbDir}`);
      }
    }

    // Create LibSQL client
    const client = createClient({
      url: url,
      authToken: options.authToken,
    });

    super(client, url, options, logger);
  }
}
