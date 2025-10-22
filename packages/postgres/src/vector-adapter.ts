/**
 * PostgreSQL Vector Adapter
 * Provides vector storage and cosine-similarity search using PostgreSQL.
 */

import type { ConnectionOptions } from "node:tls";
import {
  type SearchResult,
  type VectorAdapter,
  type VectorItem,
  type VectorSearchOptions,
  cosineSimilarity,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { Pool, type PoolClient } from "pg";

/**
 * Configuration options for the PostgreSQL vector adapter.
 */
export interface PostgresVectorAdapterOptions {
  /**
   * PostgreSQL connection configuration (string URL or object form).
   */
  connection:
    | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl?: boolean | ConnectionOptions;
      }
    | string;

  /** Table prefix for vector storage tables. Defaults to `voltagent_vector`. */
  tablePrefix?: string;

  /** Maximum allowed vector dimensions. Defaults to 1536. */
  maxVectorDimensions?: number;

  /** LRU cache size for vectors already fetched. Defaults to 100. */
  cacheSize?: number;

  /** Batch size for bulk operations. Defaults to 100. */
  batchSize?: number;

  /** Maximum retry attempts for database operations. Defaults to 3. */
  maxRetries?: number;

  /** Initial retry delay (ms) for exponential backoff. Defaults to 100. */
  retryDelayMs?: number;

  /** Enable verbose logging. */
  debug?: boolean;

  /** Optional search path to set for each connection. */
  searchPath?: string;

  /** Maximum number of pooled connections. Defaults to 10. */
  maxConnections?: number;
}

interface CachedVectorItem extends VectorItem {
  /** Cached vectors keep immutable copies of values for safety. */
  vector: number[];
}

/**
 * PostgreSQL-backed persistent vector store with cosine similarity search.
 */
export class PostgreSQLVectorAdapter implements VectorAdapter {
  private readonly pool: Pool;
  private readonly tablePrefix: string;
  private readonly maxVectorDimensions: number;
  private readonly cacheSize: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly debug: boolean;
  private readonly searchPath?: string;
  private readonly maxConnections: number;

  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private dimensions: number | null = null;
  private readonly vectorCache = new Map<string, CachedVectorItem>();

  constructor(options: PostgresVectorAdapterOptions) {
    this.tablePrefix = options.tablePrefix ?? "voltagent_vector";
    this.maxVectorDimensions = options.maxVectorDimensions ?? 1536;
    this.cacheSize = options.cacheSize ?? 100;
    this.batchSize = options.batchSize ?? 100;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 100;
    this.debug = options.debug ?? false;
    this.searchPath = options.searchPath;
    this.maxConnections = options.maxConnections ?? 10;

    this.pool = new Pool({
      ...(typeof options.connection === "string"
        ? { connectionString: options.connection }
        : options.connection),
      max: this.maxConnections,
    });

    // Kick off initialization eagerly so that the first operation is fast.
    this.initPromise = this.initializeInternal();
    void this.initPromise.catch((error) => {
      this.log("Vector adapter initialization failed", error);
      this.initPromise = null;
    });
  }

  /**
   * Close the underlying pool.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Store or update a single vector.
   */
  async store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void> {
    await this.ensureInitialized();
    this.validateVector(vector);

    const serializedVector = this.serializeVector(vector);
    const metadataJson = metadata ? safeStringify(metadata) : null;
    const dimensions = vector.length;

    await this.executeWithRetry(async () => {
      await this.withClient(async (client) => {
        await client.query(
          `INSERT INTO ${this.vectorTable()} (id, vector, dimensions, metadata, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (id) DO UPDATE 
             SET vector = EXCLUDED.vector,
                 dimensions = EXCLUDED.dimensions,
                 metadata = EXCLUDED.metadata,
                 updated_at = NOW()`,
          [id, serializedVector, dimensions, metadataJson],
        );
      });
    }, `store vector ${id}`);

    this.setCacheItem({ id, vector: [...vector], metadata });
  }

  /**
   * Store multiple vectors within a single transaction.
   */
  async storeBatch(items: VectorItem[]): Promise<void> {
    await this.ensureInitialized();
    if (items.length === 0) {
      return;
    }

    await this.executeWithRetry(async () => {
      await this.withClient(async (client) => {
        await client.query("BEGIN");
        try {
          const effectiveBatchSize = Math.max(1, this.batchSize);
          for (let start = 0; start < items.length; start += effectiveBatchSize) {
            const batch = items.slice(start, start + effectiveBatchSize);

            for (const item of batch) {
              this.validateVector(item.vector);
              const serializedVector = this.serializeVector(item.vector);
              const metadataJson = item.metadata ? safeStringify(item.metadata) : null;
              await client.query(
                `INSERT INTO ${this.vectorTable()} (id, vector, dimensions, metadata, content, updated_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (id) DO UPDATE 
                 SET vector = EXCLUDED.vector,
                     dimensions = EXCLUDED.dimensions,
                     metadata = EXCLUDED.metadata,
                     content = EXCLUDED.content,
                     updated_at = NOW()`,
                [item.id, serializedVector, item.vector.length, metadataJson, item.content ?? null],
              );
              this.setCacheItem({
                id: item.id,
                vector: [...item.vector],
                metadata: item.metadata,
                content: item.content,
              });
            }
          }

          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      });
    }, `storeBatch ${items.length} vectors`);
  }

  /**
   * Search vectors using cosine similarity computed in memory.
   */
  async search(queryVector: number[], options?: VectorSearchOptions): Promise<SearchResult[]> {
    await this.ensureInitialized();
    const { limit = 10, threshold = 0, filter } = options ?? {};

    if (this.dimensions !== null && queryVector.length !== this.dimensions) {
      throw new Error(
        `Vector dimension mismatch. Expected ${this.dimensions}, got ${queryVector.length}`,
      );
    }

    const rows = await this.executeWithRetry(async () => {
      return await this.withClient(async (client) => {
        const result = await client.query(
          `SELECT id, vector, dimensions, metadata, content FROM ${this.vectorTable()}
           ${this.dimensions !== null ? "WHERE dimensions = $1" : ""}`,
          this.dimensions !== null ? [this.dimensions] : [],
        );
        return result.rows;
      });
    }, "search vectors");

    const results: SearchResult[] = [];

    for (const row of rows) {
      const id = row.id as string;
      const buffer = row.vector as Buffer | null;
      if (!buffer) continue;

      const vector = this.deserializeVector(buffer);

      const metadata = this.parseMetadata(row.metadata);
      if (filter && !this.matchesFilter(metadata, filter)) {
        continue;
      }

      const similarity = cosineSimilarity(queryVector, vector);
      const score = (similarity + 1) / 2;

      if (score >= threshold) {
        results.push({
          id,
          vector,
          metadata,
          content: row.content ?? undefined,
          score,
          distance: 1 - similarity,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();

    await this.executeWithRetry(async () => {
      await this.withClient(async (client) => {
        await client.query(`DELETE FROM ${this.vectorTable()} WHERE id = $1`, [id]);
      });
    }, `delete vector ${id}`);

    this.vectorCache.delete(id);
  }

  async deleteBatch(ids: string[]): Promise<void> {
    await this.ensureInitialized();
    if (ids.length === 0) return;

    await this.executeWithRetry(async () => {
      await this.withClient(async (client) => {
        await client.query(`DELETE FROM ${this.vectorTable()} WHERE id = ANY($1::text[])`, [ids]);
      });
    }, `deleteBatch ${ids.length} vectors`);

    for (const id of ids) {
      this.vectorCache.delete(id);
    }
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    await this.executeWithRetry(async () => {
      await this.withClient(async (client) => {
        await client.query(`DELETE FROM ${this.vectorTable()}`);
      });
    }, "clear all vectors");

    this.vectorCache.clear();
    this.dimensions = null;
  }

  async count(): Promise<number> {
    await this.ensureInitialized();

    const result = await this.executeWithRetry(async () => {
      return await this.withClient(async (client) => {
        const response = await client.query<{ count: string | number }>(
          `SELECT COUNT(*) AS count FROM ${this.vectorTable()}`,
        );
        return response.rows[0]?.count ?? 0;
      });
    }, "count vectors");

    if (typeof result === "string") {
      return Number.parseInt(result, 10) || 0;
    }
    return result as number;
  }

  async get(id: string): Promise<VectorItem | null> {
    await this.ensureInitialized();

    if (this.vectorCache.has(id)) {
      const cached = this.vectorCache.get(id);
      if (cached) {
        // Move entry to the end to maintain LRU ordering.
        this.vectorCache.delete(id);
        this.vectorCache.set(id, cached);
        return {
          id,
          vector: [...cached.vector],
          metadata: cached.metadata ? { ...cached.metadata } : undefined,
          content: cached.content,
        };
      }
    }

    const row = await this.executeWithRetry(async () => {
      return await this.withClient(async (client) => {
        const result = await client.query(
          `SELECT id, vector, metadata, content FROM ${this.vectorTable()} WHERE id = $1`,
          [id],
        );
        return result.rows[0];
      });
    }, `get vector ${id}`);

    if (!row) {
      return null;
    }

    const buffer = row.vector as Buffer | null;
    if (!buffer) {
      return null;
    }

    const metadata = this.parseMetadata(row.metadata);
    const vectorItem: VectorItem = {
      id,
      vector: this.deserializeVector(buffer),
      metadata,
      content: row.content ?? undefined,
    };

    this.setCacheItem({ ...vectorItem, vector: [...vectorItem.vector] });
    return vectorItem;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private vectorTable(): string {
    return `${this.tablePrefix}_vectors`;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeInternal();
      this.initPromise.catch((error) => {
        this.log("Vector adapter initialization failed", error);
        this.initPromise = null;
      });
    }

    await this.initPromise;
  }

  private async initializeInternal(): Promise<void> {
    await this.executeWithRetry(async () => {
      await this.withClient(async (client) => {
        await client.query("BEGIN");
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS ${this.vectorTable()} (
              id TEXT PRIMARY KEY,
              vector BYTEA NOT NULL,
              dimensions INTEGER NOT NULL,
              metadata JSONB,
              content TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
            )`);

          await client.query(
            `CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_vectors_created ON ${this.vectorTable()}(created_at)`,
          );
          await client.query(
            `CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_vectors_dimensions ON ${this.vectorTable()}(dimensions)`,
          );

          await client.query("COMMIT");
          this.initialized = true;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      });
    }, "initialize postgres vector adapter");
  }

  private async withClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      if (this.searchPath) {
        await client.query(`SET search_path TO "${this.searchPath}"`);
      }
      return await handler(client);
    } finally {
      client.release();
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let attempt = 0;
    let delay = this.retryDelayMs;
    let lastError: unknown;

    while (attempt < this.maxRetries) {
      try {
        attempt += 1;
        return await fn();
      } catch (error) {
        lastError = error;
        this.log(`Operation failed (attempt ${attempt}): ${context}`, error as Error);
        if (attempt >= this.maxRetries) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      }
    }

    this.log(`Operation failed after ${this.maxRetries} attempts: ${context}`, lastError);
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private validateVector(vector: number[]): void {
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
  }

  private serializeVector(vector: number[]): Buffer {
    const buffer = Buffer.allocUnsafe(vector.length * 4);
    for (let i = 0; i < vector.length; i++) {
      buffer.writeFloatLE(vector[i], i * 4);
    }
    return buffer;
  }

  private deserializeVector(buffer: Buffer): number[] {
    const vector: number[] = new Array(buffer.length / 4);
    for (let i = 0; i < vector.length; i++) {
      vector[i] = buffer.readFloatLE(i * 4);
    }
    return vector;
  }

  private parseMetadata(raw: unknown): Record<string, unknown> | undefined {
    if (!raw) {
      return undefined;
    }
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch (error) {
        this.log("Failed to parse metadata JSON", error);
        return undefined;
      }
    }
    if (typeof raw === "object") {
      return raw as Record<string, unknown>;
    }
    return undefined;
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

  private setCacheItem(item: CachedVectorItem): void {
    if (this.cacheSize === 0) {
      return;
    }

    if (this.vectorCache.has(item.id)) {
      this.vectorCache.delete(item.id);
    }

    this.vectorCache.set(item.id, item);

    if (this.vectorCache.size > this.cacheSize) {
      const [firstKey] = this.vectorCache.keys();
      if (firstKey) {
        this.vectorCache.delete(firstKey);
      }
    }
  }

  private log(message: string, error?: unknown): void {
    if (!this.debug) {
      return;
    }
    if (error) {
      console.warn(`[PostgreSQLVectorAdapter] ${message}`, error);
    } else {
      console.debug(`[PostgreSQLVectorAdapter] ${message}`);
    }
  }
}
