/**
 * LibSQL Vector Adapter - Node.js
 * Provides vector storage and similarity search using LibSQL/Turso database
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { createPinoLogger } from "@voltagent/logger";
import type { Logger } from "@voltagent/logger";
import { LibSQLVectorCore, type LibSQLVectorCoreOptions } from "./vector-core";

/**
 * LibSQL Vector Adapter configuration options
 */
export interface LibSQLVectorOptions extends LibSQLVectorCoreOptions {
  /**
   * Database URL (e.g., 'file:./memory.db' or 'libsql://...')
   * @default "file:./.voltagent/memory.db"
   */
  url?: string;

  /**
   * Auth token for remote connections (optional)
   */
  authToken?: string;

  /**
   * Logger instance
   */
  logger?: Logger;
}

/**
 * LibSQL Vector Adapter - Node.js
 * Production-ready vector storage with similarity search
 * Supports both local SQLite files and remote Turso databases
 */
export class LibSQLVectorAdapter extends LibSQLVectorCore {
  constructor(options: LibSQLVectorOptions = {}) {
    // Initialize logger
    const logger =
      options.logger ??
      createPinoLogger({
        name: "libsql-vector-adapter",
        level: options.debug ? "debug" : "info",
      });

    // Normalize database URL
    const requestedUrl = options.url ?? "file:./.voltagent/memory.db";
    let url: string;

    if (
      requestedUrl === ":memory:" ||
      requestedUrl === "file::memory:" ||
      requestedUrl.startsWith("file::memory:")
    ) {
      url = ":memory:";
    } else {
      url = requestedUrl;
    }

    // Ensure directory exists for file-based databases (skip pure in-memory)
    if (url.startsWith("file:") && !url.startsWith("file::memory:")) {
      const dbPath = url.replace("file:", "");
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    // Initialize LibSQL client
    const client = createClient({
      url: url,
      authToken: options.authToken,
    });

    super(client, options, logger);
  }

  /**
   * Override to use Buffer for more efficient serialization in Node.js
   */
  protected serializeVector(vector: number[]): Uint8Array {
    const buffer = Buffer.allocUnsafe(vector.length * 4);
    for (let i = 0; i < vector.length; i++) {
      buffer.writeFloatLE(vector[i], i * 4);
    }
    return buffer;
  }

  /**
   * Override to use Buffer for more efficient deserialization in Node.js
   */
  protected deserializeVector(data: Uint8Array | ArrayBuffer): number[] {
    let buffer: Buffer;
    if (data instanceof Buffer) {
      buffer = data;
    } else if (data instanceof ArrayBuffer) {
      buffer = Buffer.from(data);
    } else {
      buffer = Buffer.from(data);
    }
    const vector: number[] = [];
    for (let i = 0; i < buffer.length; i += 4) {
      vector.push(buffer.readFloatLE(i));
    }
    return vector;
  }
}
