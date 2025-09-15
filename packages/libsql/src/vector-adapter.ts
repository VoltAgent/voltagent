/**
 * LibSQL Vector Adapter
 * Provides vector storage and similarity search using LibSQL/Turso database
 * Stores vectors as binary BLOBs for efficiency
 */

import fs from "node:fs";
import path from "node:path";
import { type Client, createClient } from "@libsql/client";
import {
  type SearchResult,
  type VectorAdapter,
  type VectorItem,
  type VectorSearchOptions,
  cosineSimilarity,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { type Logger, createPinoLogger } from "@voltagent/logger";

/**
 * LibSQL Vector Adapter configuration options
 */
export interface LibSQLVectorOptions {
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
   * Prefix for table names
   * @default "voltagent"
   */
  tablePrefix?: string;

  /**
   * Maximum vector dimensions allowed
   * @default 1536
   */
  maxVectorDimensions?: number;

  /**
   * Size of the LRU cache for frequently accessed vectors
   * @default 100
   */
  cacheSize?: number;

  /**
   * Batch size for bulk operations
   * @default 100
   */
  batchSize?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Maximum number of retries for database operations
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial retry delay in milliseconds
   * @default 100
   */
  retryDelayMs?: number;
}

/**
 * LibSQL Vector Adapter
 * Production-ready vector storage with similarity search
 */
export class LibSQLVectorAdapter implements VectorAdapter {
  private client: Client;
  private tablePrefix: string;
  private maxVectorDimensions: number;
  private cacheSize: number;
  private batchSize: number;
  private debug: boolean;
  private logger: Logger;
  private maxRetries: number;
  private retryDelayMs: number;
  private url: string;
  private initialized = false;
  private vectorCache: Map<string, VectorItem>;
  private dimensions: number | null = null;

  constructor(options: LibSQLVectorOptions = {}) {
    this.tablePrefix = options.tablePrefix ?? "voltagent";
    this.maxVectorDimensions = options.maxVectorDimensions ?? 1536;
    this.cacheSize = options.cacheSize ?? 100;
    this.batchSize = options.batchSize ?? 100;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 100;
    this.debug = options.debug ?? false;

    // Initialize logger
    this.logger =
      options.logger ??
      createPinoLogger({
        name: "libsql-vector-adapter",
        level: this.debug ? "debug" : "info",
      });

    // Normalize database URL
    const requestedUrl = options.url ?? "file:./.voltagent/memory.db";
    // In-memory: use cache=shared which is supported by @libsql/core for :memory:
    // Accept both ":memory:" and "file::memory:" inputs and normalize to URI form.
    if (
      requestedUrl === ":memory:" ||
      requestedUrl === "file::memory:" ||
      requestedUrl.startsWith("file::memory:")
    ) {
      // Use private, per-connection in-memory database (no shared cache)
      // Accept either form and normalize to ":memory:" which @libsql/core expands to file::memory:
      this.url = ":memory:";
    } else {
      this.url = requestedUrl;
    }

    // Ensure directory exists for file-based databases (skip pure in-memory)
    if (this.url.startsWith("file:") && !this.url.startsWith("file::memory:")) {
      const dbPath = this.url.replace("file:", "");
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    // Initialize LibSQL client
    this.client = createClient({
      url: this.url,
      authToken: options.authToken,
    });

    // Initialize cache
    this.vectorCache = new Map();
  }

  /**
   * Initialize the database schema
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const tableName = `${this.tablePrefix}_vectors`;

    try {
      // Create vectors table and indexes atomically
      await this.client.executeMultiple(`
        BEGIN;
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id TEXT PRIMARY KEY,
          vector BLOB NOT NULL,
          dimensions INTEGER NOT NULL,
          metadata TEXT,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_${tableName}_created ON ${tableName}(created_at);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_dimensions ON ${tableName}(dimensions);
        COMMIT;
      `);

      this.initialized = true;
      this.logger.debug("Vector adapter initialized");
    } catch (error) {
      this.logger.error("Failed to initialize vector adapter", error as Error);
      throw error;
    }
  }

  /**
   * Serialize a vector to binary format
   */
  private serializeVector(vector: number[]): Buffer {
    const buffer = Buffer.allocUnsafe(vector.length * 4);
    for (let i = 0; i < vector.length; i++) {
      buffer.writeFloatLE(vector[i], i * 4);
    }
    return buffer;
  }

  /**
   * Deserialize a vector from binary format
   */
  private deserializeVector(buffer: Buffer | Uint8Array | ArrayBuffer): number[] {
    let bytes: Buffer;
    if (buffer instanceof Buffer) {
      bytes = buffer;
    } else if (buffer instanceof ArrayBuffer) {
      bytes = Buffer.from(buffer);
    } else {
      bytes = Buffer.from(buffer);
    }
    const vector: number[] = [];
    for (let i = 0; i < bytes.length; i += 4) {
      vector.push(bytes.readFloatLE(i));
    }
    return vector;
  }

  /**
   * Execute a database operation with retries
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryDelayMs;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Operation failed (attempt ${attempt}): ${context}`, error as Error);

        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }

    this.logger.error(`Operation failed after ${this.maxRetries} attempts: ${context}`, lastError);
    throw lastError;
  }

  /**
   * Store a vector with associated metadata
   */
  async store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void> {
    await this.initialize();

    // Validate vector contents
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Vector must be a non-empty array");
    }

    // Validate dimensions
    if (vector.length > this.maxVectorDimensions) {
      throw new Error(
        `Vector dimensions (${vector.length}) exceed maximum (${this.maxVectorDimensions})`,
      );
    }

    if (this.dimensions === null) {
      this.dimensions = vector.length;
    } else if (vector.length !== this.dimensions) {
      throw new Error(
        `Vector dimension mismatch. Expected ${this.dimensions}, got ${vector.length}`,
      );
    }

    const tableName = `${this.tablePrefix}_vectors`;
    const serializedVector = this.serializeVector(vector);
    const metadataJson = metadata ? safeStringify(metadata) : null;

    await this.executeWithRetry(async () => {
      await this.client.execute({
        sql: `
          INSERT OR REPLACE INTO ${tableName} 
          (id, vector, dimensions, metadata, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        args: [id, serializedVector, vector.length, metadataJson],
      });
    }, `store vector ${id}`);

    // Update cache
    if (this.vectorCache.size >= this.cacheSize) {
      const firstKey = this.vectorCache.keys().next().value;
      if (firstKey) this.vectorCache.delete(firstKey);
    }
    this.vectorCache.set(id, { id, vector, metadata });

    this.logger.debug(`Vector stored: ${id} (${vector.length} dimensions)`);
  }

  /**
   * Store multiple vectors in batch
   */
  async storeBatch(items: VectorItem[]): Promise<void> {
    await this.initialize();

    if (items.length === 0) return;

    const tableName = `${this.tablePrefix}_vectors`;

    // Process in batches to avoid memory issues
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);

      await this.executeWithRetry(async () => {
        const stmts: { sql: string; args: any[] }[] = [];
        for (const item of batch) {
          if (!Array.isArray(item.vector) || item.vector.length === 0) {
            throw new Error("Vector must be a non-empty array");
          }
          // Validate dimensions
          if (this.dimensions === null) {
            this.dimensions = item.vector.length;
          } else if (item.vector.length !== this.dimensions) {
            throw new Error(
              `Vector dimension mismatch. Expected ${this.dimensions}, got ${item.vector.length}`,
            );
          }

          const serializedVector = this.serializeVector(item.vector);
          const metadataJson = item.metadata ? safeStringify(item.metadata) : null;
          const content = item.content ?? null;
          stmts.push({
            sql: `INSERT OR REPLACE INTO ${tableName} (id, vector, dimensions, metadata, content, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [item.id, serializedVector, item.vector.length, metadataJson, content],
          });
        }
        await this.client.batch(stmts, "write");
      }, `storeBatch ${batch.length} vectors`);

      this.logger.debug(`Batch of ${batch.length} vectors stored`);
    }
  }

  /**
   * Search for similar vectors using cosine similarity
   */
  async search(queryVector: number[], options?: VectorSearchOptions): Promise<SearchResult[]> {
    await this.initialize();

    const { limit = 10, threshold = 0, filter } = options || {};

    // Validate query vector dimensions
    if (this.dimensions !== null && queryVector.length !== this.dimensions) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.dimensions}, got ${queryVector.length}`,
      );
    }

    const tableName = `${this.tablePrefix}_vectors`;

    // Build query with optional dimension filter
    let query = `SELECT id, vector, dimensions, metadata, content FROM ${tableName}`;
    const args: any[] = [];

    if (this.dimensions !== null) {
      query += " WHERE dimensions = ?";
      args.push(this.dimensions);
    }

    const result = await this.executeWithRetry(
      async () => await this.client.execute({ sql: query, args }),
      "search vectors",
    );

    const searchResults: SearchResult[] = [];

    // Calculate similarities for all vectors
    for (const row of result.rows) {
      const id = row.id as string;
      const vectorBlob = row.vector as Uint8Array | ArrayBuffer;
      const metadataJson = row.metadata as string | null;
      const content = (row.content as string | null) ?? undefined;

      // Parse metadata
      const metadata = metadataJson ? JSON.parse(metadataJson) : undefined;

      // Apply metadata filter if provided
      if (filter && !this.matchesFilter(metadata, filter)) {
        continue;
      }

      // Deserialize vector
      const vector = this.deserializeVector(vectorBlob);

      // Calculate cosine similarity
      const similarity = cosineSimilarity(queryVector, vector);

      // Convert similarity to score (0-1 range where 1 is most similar)
      const score = (similarity + 1) / 2;

      if (score >= threshold) {
        searchResults.push({
          id,
          vector,
          metadata,
          content,
          score,
          distance: 1 - similarity, // Convert to distance metric
        });
      }
    }

    // Sort by score (descending) and limit results
    searchResults.sort((a, b) => b.score - a.score);

    return searchResults.slice(0, limit);
  }

  /**
   * Check if metadata matches the filter criteria
   */
  private matchesFilter(
    metadata: Record<string, unknown> | undefined,
    filter: Record<string, unknown>,
  ): boolean {
    if (!metadata) {
      return false;
    }

    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<void> {
    await this.initialize();

    const tableName = `${this.tablePrefix}_vectors`;

    await this.executeWithRetry(async () => {
      await this.client.execute({
        sql: `DELETE FROM ${tableName} WHERE id = ?`,
        args: [id],
      });
    }, `delete vector ${id}`);

    // Remove from cache
    this.vectorCache.delete(id);

    this.logger.debug(`Vector deleted: ${id}`);
  }

  /**
   * Delete multiple vectors by IDs
   */
  async deleteBatch(ids: string[]): Promise<void> {
    await this.initialize();

    if (ids.length === 0) return;

    const tableName = `${this.tablePrefix}_vectors`;

    // Process in batches
    for (let i = 0; i < ids.length; i += this.batchSize) {
      const batch = ids.slice(i, i + this.batchSize);
      const placeholders = batch.map(() => "?").join(",");

      await this.executeWithRetry(async () => {
        await this.client.execute({
          sql: `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
          args: batch,
        });
      }, `deleteBatch ${batch.length} vectors`);

      // Remove from cache
      for (const id of batch) {
        this.vectorCache.delete(id);
      }

      this.logger.debug(`Batch of ${batch.length} vectors deleted`);
    }
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    await this.initialize();

    const tableName = `${this.tablePrefix}_vectors`;

    await this.executeWithRetry(async () => {
      await this.client.execute(`DELETE FROM ${tableName}`);
    }, "clear all vectors");

    // Clear cache and reset dimensions
    this.vectorCache.clear();
    this.dimensions = null;

    this.logger.debug("All vectors cleared");
  }

  /**
   * Get total count of stored vectors
   */
  async count(): Promise<number> {
    await this.initialize();

    const tableName = `${this.tablePrefix}_vectors`;

    const result = await this.executeWithRetry(
      async () => await this.client.execute(`SELECT COUNT(*) as count FROM ${tableName}`),
      "count vectors",
    );

    const raw = result.rows[0]?.count as any;
    // libsql/sqlite may return number, string, or bigint depending on driver
    if (typeof raw === "bigint") return Number(raw);
    if (typeof raw === "string") return Number.parseInt(raw, 10) || 0;
    return (raw as number) ?? 0;
  }

  /**
   * Get a specific vector by ID
   */
  async get(id: string): Promise<VectorItem | null> {
    await this.initialize();

    // Check cache first
    if (this.vectorCache.has(id)) {
      const cached = this.vectorCache.get(id);
      if (cached) {
        return {
          ...cached,
          vector: [...cached.vector], // Return a copy
          metadata: cached.metadata ? { ...cached.metadata } : undefined,
        };
      }
    }

    const tableName = `${this.tablePrefix}_vectors`;

    const result = await this.executeWithRetry(
      async () =>
        await this.client.execute({
          sql: `SELECT id, vector, metadata, content FROM ${tableName} WHERE id = ?`,
          args: [id],
        }),
      `get vector ${id}`,
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const vectorBlob = row.vector as unknown as Uint8Array | ArrayBuffer;
    const metadataJson = row.metadata as string | null;
    const content = row.content as string | null;

    const vector = this.deserializeVector(vectorBlob);
    const metadata = metadataJson ? JSON.parse(metadataJson) : undefined;

    const item: VectorItem = {
      id,
      vector,
      metadata,
      content: content ?? undefined,
    };

    // Update cache
    if (this.vectorCache.size >= this.cacheSize) {
      const firstKey = this.vectorCache.keys().next().value;
      if (firstKey) this.vectorCache.delete(firstKey);
    }
    this.vectorCache.set(id, item);

    return item;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    this.vectorCache.clear();
    this.logger.debug("Vector adapter closed");
    try {
      (this.client as any)?.close?.();
    } catch {
      // ignore
    }
  }

  /**
   * Get statistics about the vector table and cache
   */
  async getStats(): Promise<{
    count: number;
    dimensions: number | null;
    cacheSize: number;
    tableSizeBytes: number;
  }> {
    await this.initialize();

    const tableName = `${this.tablePrefix}_vectors`;

    const [countResult, sizeResult] = await Promise.all([
      this.executeWithRetry(
        async () =>
          await this.client.execute(
            `SELECT COUNT(*) as count, MAX(dimensions) as dims FROM ${tableName}`,
          ),
        "getStats count",
      ),
      // Approximate table size by summing blob/text lengths
      this.executeWithRetry(
        async () =>
          await this.client.execute({
            sql: `SELECT 
              COALESCE(SUM(LENGTH(id)),0) + 
              COALESCE(SUM(LENGTH(vector)),0) + 
              COALESCE(SUM(LENGTH(metadata)),0) +
              COALESCE(SUM(LENGTH(content)),0) AS size
            FROM ${tableName}`,
          }),
        "getStats size",
      ),
    ]);

    const row1 = countResult.rows[0] as any;
    const row2 = sizeResult.rows[0] as any;

    const countRaw = row1?.count as any;
    const dimsRaw = row1?.dims as any;
    const sizeRaw = row2?.size as any;

    const normalize = (v: any): number =>
      typeof v === "bigint"
        ? Number(v)
        : typeof v === "string"
          ? Number.parseInt(v, 10) || 0
          : (v ?? 0);

    return {
      count: normalize(countRaw),
      dimensions: dimsRaw != null ? normalize(dimsRaw) : this.dimensions,
      cacheSize: this.vectorCache.size,
      tableSizeBytes: normalize(sizeRaw),
    };
  }
}
