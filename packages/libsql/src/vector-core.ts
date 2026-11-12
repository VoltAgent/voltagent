/**
 * LibSQL Vector Adapter Core
 * Contains shared logic for both Node.js and Edge environments
 * Environment-specific adapters extend this class
 */

import type { Client } from "@libsql/client";
import {
  type SearchResult,
  type VectorAdapter,
  type VectorItem,
  type VectorSearchOptions,
  cosineSimilarity,
  decodeCursor,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { Logger } from "@voltagent/logger";

/**
 * Core configuration options for LibSQL Vector adapter
 */
export interface LibSQLVectorCoreOptions {
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
 * LibSQL Vector Adapter Core
 * Implements all vector storage operations, receives client via dependency injection
 */
export class LibSQLVectorCore implements VectorAdapter {
  protected client: Client;
  protected tablePrefix: string;
  protected maxVectorDimensions: number;
  protected cacheSize: number;
  protected batchSize: number;
  protected debug: boolean;
  protected logger: Logger;
  protected maxRetries: number;
  protected retryDelayMs: number;
  protected initialized = false;
  protected vectorCache: Map<string, VectorItem>;
  protected dimensions: number | null = null;

  constructor(client: Client, options: LibSQLVectorCoreOptions, logger: Logger) {
    this.client = client;
    this.tablePrefix = options.tablePrefix ?? "voltagent";
    this.maxVectorDimensions = options.maxVectorDimensions ?? 1536;
    this.cacheSize = options.cacheSize ?? 100;
    this.batchSize = options.batchSize ?? 100;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 100;
    this.debug = options.debug ?? false;
    this.logger = logger;

    this.vectorCache = new Map();
  }

  /**
   * Serialize a vector to binary format
   * Uses ArrayBuffer/DataView for cross-platform compatibility
   */
  protected serializeVector(vector: number[]): Uint8Array {
    const buffer = new ArrayBuffer(vector.length * 4);
    const view = new DataView(buffer);
    for (let i = 0; i < vector.length; i++) {
      view.setFloat32(i * 4, vector[i], true); // little-endian
    }
    return new Uint8Array(buffer);
  }

  /**
   * Deserialize a vector from binary format
   */
  protected deserializeVector(data: Uint8Array | ArrayBuffer): number[] {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const vector: number[] = [];
    for (let i = 0; i < bytes.length; i += 4) {
      vector.push(view.getFloat32(i, true)); // little-endian
    }
    return vector;
  }

  /**
   * Initialize the database schema
   */
  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    const tableName = `${this.tablePrefix}_vectors`;

    try {
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id TEXT PRIMARY KEY,
          vector BLOB NOT NULL,
          dimensions INTEGER NOT NULL,
          metadata TEXT,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_created ON ${tableName}(created_at)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_dimensions ON ${tableName}(dimensions)
      `);

      this.initialized = true;
      this.logger.debug("Vector adapter initialized");
    } catch (error) {
      this.logger.error("Failed to initialize vector adapter", error as Error);
      throw error;
    }
  }

  /**
   * Execute a database operation with retries
   */
  protected async executeWithRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
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
          delay *= 2;
        }
      }
    }

    this.logger.error(`Operation failed after ${this.maxRetries} attempts: ${context}`, lastError);
    throw lastError;
  }

  async store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void> {
    await this.initialize();

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Vector must be a non-empty array");
    }

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

    if (this.vectorCache.size >= this.cacheSize) {
      const firstKey = this.vectorCache.keys().next().value;
      if (firstKey) this.vectorCache.delete(firstKey);
    }
    this.vectorCache.set(id, { id, vector, metadata });

    this.logger.debug(`Vector stored: ${id} (${vector.length} dimensions)`);
  }

  async storeBatch(items: VectorItem[]): Promise<void> {
    await this.initialize();

    if (items.length === 0) return;

    const tableName = `${this.tablePrefix}_vectors`;

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);

      await this.executeWithRetry(async () => {
        const stmts: { sql: string; args: any[] }[] = [];
        for (const item of batch) {
          if (!Array.isArray(item.vector) || item.vector.length === 0) {
            throw new Error("Vector must be a non-empty array");
          }
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

  async search(queryVector: number[], options?: VectorSearchOptions): Promise<SearchResult[]> {
    await this.initialize();

    const {
      limit = 10,
      threshold = 0,
      filter,
      logicalFilter,
      comparisonFilter,
      cursor,
    } = options || {};

    if (this.dimensions !== null && queryVector.length !== this.dimensions) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.dimensions}, got ${queryVector.length}`,
      );
    }

    const tableName = `${this.tablePrefix}_vectors`;

    // Phase 1: fetch candidate rows (id/metadata only, no vector blobs) so the
    // metadata predicates can be applied before any vectors are deserialized.
    const conditions: string[] = [];
    const candidateArgs: any[] = [];

    if (this.dimensions !== null) {
      conditions.push("dimensions = ?");
      candidateArgs.push(this.dimensions);
    }

    // Cursor-based pagination: keyset bound on the primary key
    const cursorId = cursor ? decodeCursor(cursor) : undefined;
    if (cursorId !== undefined) {
      conditions.push("id < ?");
      candidateArgs.push(cursorId);
    }

    const candidateQuery = `SELECT id, metadata, content FROM ${tableName}`;
    const candidateSql =
      conditions.length > 0
        ? `${candidateQuery} WHERE ${conditions.join(" AND ")}`
        : candidateQuery;

    const candidateResult = await this.executeWithRetry(
      async () => await this.client.execute({ sql: candidateSql, args: candidateArgs }),
      "search vectors (candidate fetch)",
    );

    const candidateIds: string[] = [];

    for (const row of candidateResult.rows) {
      const id = row.id as string;
      const metadataJson = row.metadata as string | null;
      const metadata = metadataJson ? JSON.parse(metadataJson) : undefined;

      if (filter && !this.matchesFilter(metadata, filter)) {
        continue;
      }

      // Apply logical filter in-memory if present
      if (logicalFilter && !this.passesLogicalFilter(metadata, logicalFilter)) {
        continue;
      }

      // Apply comparison filter in-memory if present
      if (comparisonFilter && !this.passesComparisonFilter(metadata, comparisonFilter)) {
        continue;
      }

      candidateIds.push(id);
    }

    if (candidateIds.length === 0) {
      return [];
    }

    // Phase 2: fetch vectors only for the surviving candidates
    const placeholders = candidateIds.map(() => "?").join(", ");
    const vectorResult = await this.executeWithRetry(
      async () =>
        await this.client.execute({
          sql: `SELECT id, vector, dimensions, metadata, content FROM ${tableName} WHERE id IN (${placeholders})`,
          args: candidateIds,
        }),
      "search vectors (vector fetch)",
    );

    const searchResults: SearchResult[] = [];

    for (const row of vectorResult.rows) {
      const id = row.id as string;
      const vectorBlob = row.vector as Uint8Array | ArrayBuffer;
      const metadataJson = row.metadata as string | null;
      const content = (row.content as string | null) ?? undefined;

      const metadata = metadataJson ? JSON.parse(metadataJson) : undefined;

      const vector = this.deserializeVector(vectorBlob);
      const similarity = cosineSimilarity(queryVector, vector);
      const score = (similarity + 1) / 2;

      if (score >= threshold) {
        searchResults.push({
          id,
          vector,
          metadata,
          content,
          score,
          distance: 1 - similarity,
        });
      }
    }

    searchResults.sort((a, b) => b.score - a.score);

    return searchResults.slice(0, limit);
  }

  /**
   * Check if metadata passes logical filter ($and/$or)
   */
  private passesLogicalFilter(
    metadata: Record<string, unknown> | undefined,
    logicalFilter: NonNullable<VectorSearchOptions["logicalFilter"]>,
  ): boolean {
    if (!metadata) {
      return false;
    }

    if ("$and" in logicalFilter && Array.isArray(logicalFilter.$and)) {
      // ALL conditions in the $and group must pass
      return logicalFilter.$and.every((subFilter) => this.matchesFilter(metadata, subFilter));
    }

    if ("$or" in logicalFilter && Array.isArray(logicalFilter.$or)) {
      // AT LEAST ONE condition in the $or group must pass
      return logicalFilter.$or.some((subFilter) => this.matchesFilter(metadata, subFilter));
    }

    // Single filter (treated as AND with the outer conditions)
    return this.matchesFilter(metadata, logicalFilter);
  }

  /**
   * Check if metadata passes comparison filter (e.g., { price: { $gt: 100 } })
   */
  private passesComparisonFilter(
    metadata: Record<string, unknown> | undefined,
    comparisonFilter: Record<string, unknown>,
  ): boolean {
    if (!metadata) {
      return false;
    }

    for (const [key, value] of Object.entries(comparisonFilter)) {
      const metadataValue = metadata[key];

      if (value === undefined) {
        continue;
      }

      if (this.isComparisonOperator(value)) {
        if (value.$gt !== undefined && metadataValue !== undefined) {
          if (!((metadataValue as number) > value.$gt)) {
            return false;
          }
        }
        if (value.$lt !== undefined && metadataValue !== undefined) {
          if (!((metadataValue as number) < value.$lt)) {
            return false;
          }
        }
        continue;
      }

      // Exact match
      if (metadataValue !== value) {
        return false;
      }
    }

    return true;
  }

  private isComparisonOperator(value: unknown): value is { $gt?: number; $lt?: number } {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return "$gt" in candidate || "$lt" in candidate;
  }

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

  async delete(id: string): Promise<void> {
    await this.initialize();

    const tableName = `${this.tablePrefix}_vectors`;

    await this.executeWithRetry(async () => {
      await this.client.execute({
        sql: `DELETE FROM ${tableName} WHERE id = ?`,
        args: [id],
      });
    }, `delete vector ${id}`);

    this.vectorCache.delete(id);

    this.logger.debug(`Vector deleted: ${id}`);
  }

  async deleteBatch(ids: string[]): Promise<void> {
    await this.initialize();

    if (ids.length === 0) return;

    const tableName = `${this.tablePrefix}_vectors`;

    for (let i = 0; i < ids.length; i += this.batchSize) {
      const batch = ids.slice(i, i + this.batchSize);
      const placeholders = batch.map(() => "?").join(",");

      await this.executeWithRetry(async () => {
        await this.client.execute({
          sql: `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
          args: batch,
        });
      }, `deleteBatch ${batch.length} vectors`);

      for (const id of batch) {
        this.vectorCache.delete(id);
      }

      this.logger.debug(`Batch of ${batch.length} vectors deleted`);
    }
  }

  async clear(): Promise<void> {
    await this.initialize();

    const tableName = `${this.tablePrefix}_vectors`;

    await this.executeWithRetry(async () => {
      await this.client.execute(`DELETE FROM ${tableName}`);
    }, "clear all vectors");

    this.vectorCache.clear();
    this.dimensions = null;

    this.logger.debug("All vectors cleared");
  }

  async count(): Promise<number> {
    await this.initialize();

    const tableName = `${this.tablePrefix}_vectors`;

    const result = await this.executeWithRetry(
      async () => await this.client.execute(`SELECT COUNT(*) as count FROM ${tableName}`),
      "count vectors",
    );

    const raw = result.rows[0]?.count as any;
    if (typeof raw === "bigint") return Number(raw);
    if (typeof raw === "string") return Number.parseInt(raw, 10) || 0;
    return (raw as number) ?? 0;
  }

  async get(id: string): Promise<VectorItem | null> {
    await this.initialize();

    if (this.vectorCache.has(id)) {
      const cached = this.vectorCache.get(id);
      if (cached) {
        return {
          ...cached,
          vector: [...cached.vector],
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
    const vectorBlob = row.vector as Uint8Array | ArrayBuffer;
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

    if (this.vectorCache.size >= this.cacheSize) {
      const firstKey = this.vectorCache.keys().next().value;
      if (firstKey) this.vectorCache.delete(firstKey);
    }
    this.vectorCache.set(id, item);

    return item;
  }

  async close(): Promise<void> {
    this.vectorCache.clear();
    this.logger.debug("Vector adapter closed");
  }

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
