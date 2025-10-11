/**
 * LibSQL Observability Adapter
 * Provides persistent storage for OpenTelemetry spans using LibSQL/Turso database
 * Part of the OpenTelemetry observability migration (Phase 3)
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client";
import type {
  LogFilter,
  ObservabilityLogRecord,
  ObservabilitySpan,
  ObservabilityStorageAdapter,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { type Logger, createPinoLogger } from "@voltagent/logger";

/**
 * Options for configuring the LibSQLObservabilityAdapter
 */
export interface LibSQLObservabilityOptions {
  /**
   * LibSQL connection URL
   * Can be either a remote Turso URL or a local file path
   * @default "file:./.voltagent/observability.db"
   * @example "libsql://your-database.turso.io" for remote Turso
   * @example "file:observability.db" for local SQLite in current directory
   * @example "file:.voltagent/observability.db" for local SQLite in .voltagent folder
   */
  url?: string;

  /**
   * Auth token for LibSQL/Turso
   * Not needed for local SQLite
   */
  authToken?: string;

  /**
   * Prefix for table names
   * @default "observability"
   */
  tablePrefix?: string;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Optional logger instance
   */
  logger?: Logger;

  /**
   * Maximum number of spans to return in a single query
   * @default 1000
   */
  maxSpansPerQuery?: number;
}

/**
 * LibSQL Observability Adapter
 * Provides observability storage using LibSQL/Turso database
 * Implements the ObservabilityStorageAdapter interface for OpenTelemetry spans
 */
export class LibSQLObservabilityAdapter implements ObservabilityStorageAdapter {
  private client: Client;
  private tablePrefix: string;
  private debug: boolean;
  private logger: Logger;
  private initialized: Promise<void>;
  private maxSpansPerQuery: number;

  constructor(options: LibSQLObservabilityOptions = {}) {
    // Initialize the logger
    this.logger = options.logger || createPinoLogger({ name: "libsql-observability" });

    this.tablePrefix = options.tablePrefix || "observability";
    this.debug = options.debug || false;
    this.maxSpansPerQuery = options.maxSpansPerQuery || 1000;
    const url = options.url || "file:./.voltagent/observability.db";

    // Ensure parent directory exists for file-based databases
    if (url.startsWith("file:") && !url.includes(":memory:")) {
      const filePath = url.substring(5); // Remove 'file:' prefix
      const dir = dirname(filePath);
      if (dir && dir !== "." && !existsSync(dir)) {
        try {
          mkdirSync(dir, { recursive: true });
          this.debugLog("Created directory for database", { dir });
        } catch (error) {
          this.logger.warn("Failed to create directory for database", { dir, error });
        }
      }
    }

    // Initialize the LibSQL client
    this.client = createClient({
      url,
      authToken: options.authToken,
    });

    this.debugLog("LibSQL observability adapter initialized with options", {
      url,
      tablePrefix: this.tablePrefix,
      debug: this.debug,
      maxSpansPerQuery: this.maxSpansPerQuery,
    });

    // Initialize the database tables
    this.initialized = this.initializeDatabase();
  }

  /**
   * Log a debug message if debug is enabled
   */
  private debugLog(message: string, data?: unknown): void {
    if (this.debug) {
      this.logger.debug(`${message}`, data || "");
    }
  }

  /**
   * Initialize database tables for observability
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Create main spans table with entity columns
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${this.tablePrefix}_spans (
          span_id TEXT PRIMARY KEY,
          trace_id TEXT NOT NULL,
          parent_span_id TEXT,
          entity_id TEXT,
          entity_type TEXT,
          name TEXT NOT NULL,
          kind INTEGER DEFAULT 0,
          start_time TEXT NOT NULL,
          end_time TEXT,
          duration REAL,
          status_code INTEGER DEFAULT 0,
          status_message TEXT,
          attributes TEXT,
          events TEXT,
          links TEXT,
          resource TEXT,
          instrumentation_scope TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for efficient queries
      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_spans_trace_id 
        ON ${this.tablePrefix}_spans(trace_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_spans_parent_span_id 
        ON ${this.tablePrefix}_spans(parent_span_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_spans_start_time 
        ON ${this.tablePrefix}_spans(start_time)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_spans_name 
        ON ${this.tablePrefix}_spans(name)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_spans_entity_id 
        ON ${this.tablePrefix}_spans(entity_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_spans_entity_type 
        ON ${this.tablePrefix}_spans(entity_type)
      `);

      // Create trace metadata table for fast trace listing with entity columns
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${this.tablePrefix}_traces (
          trace_id TEXT PRIMARY KEY,
          root_span_id TEXT,
          entity_id TEXT,
          entity_type TEXT,
          start_time TEXT NOT NULL,
          end_time TEXT,
          span_count INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_traces_start_time 
        ON ${this.tablePrefix}_traces(start_time DESC)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_traces_entity_id 
        ON ${this.tablePrefix}_traces(entity_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_traces_entity_type 
        ON ${this.tablePrefix}_traces(entity_type)
      `);

      // Create logs table
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${this.tablePrefix}_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          trace_id TEXT,
          span_id TEXT,
          trace_flags INTEGER,
          severity_number INTEGER,
          severity_text TEXT,
          body TEXT NOT NULL,
          attributes TEXT,
          resource TEXT,
          instrumentation_scope TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for logs
      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_logs_trace_id 
        ON ${this.tablePrefix}_logs(trace_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_logs_span_id 
        ON ${this.tablePrefix}_logs(span_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_logs_timestamp 
        ON ${this.tablePrefix}_logs(timestamp DESC)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}_logs_severity 
        ON ${this.tablePrefix}_logs(severity_number)
      `);

      this.debugLog("Database tables initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize database tables", { error });
      throw error;
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  /**
   * Add a span to the database
   */
  async addSpan(span: ObservabilitySpan): Promise<void> {
    await this.ensureInitialized();

    try {
      // Extract entity information from attributes
      const entityId = (span.attributes?.["entity.id"] as string) || null;
      const entityType = (span.attributes?.["entity.type"] as string) || null;

      // Start a transaction for consistency
      await this.client.batch([
        // Insert the span with entity columns
        {
          sql: `
            INSERT INTO ${this.tablePrefix}_spans (
              span_id, trace_id, parent_span_id, entity_id, entity_type, name, kind,
              start_time, end_time, duration,
              status_code, status_message,
              attributes, events, links,
              resource, instrumentation_scope
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            span.spanId,
            span.traceId,
            span.parentSpanId || null,
            entityId,
            entityType,
            span.name,
            span.kind,
            span.startTime,
            span.endTime || null,
            span.duration || null,
            span.status.code,
            span.status.message || null,
            safeStringify(span.attributes),
            safeStringify(span.events),
            span.links ? safeStringify(span.links) : null,
            span.resource ? safeStringify(span.resource) : null,
            span.instrumentationScope ? safeStringify(span.instrumentationScope) : null,
          ],
        },
        // Update or insert trace metadata with entity columns
        {
          sql: `
            INSERT INTO ${this.tablePrefix}_traces (
              trace_id, root_span_id, entity_id, entity_type, start_time, end_time, span_count
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(trace_id) DO UPDATE SET
              span_count = span_count + 1,
              entity_id = COALESCE(excluded.entity_id, entity_id),
              entity_type = COALESCE(excluded.entity_type, entity_type),
              start_time = MIN(start_time, excluded.start_time),
              end_time = MAX(COALESCE(end_time, excluded.end_time), excluded.end_time),
              updated_at = CURRENT_TIMESTAMP
          `,
          args: [
            span.traceId,
            span.parentSpanId ? null : span.spanId, // Root span if no parent
            entityId,
            entityType,
            span.startTime,
            span.endTime || null,
          ],
        },
      ]);

      this.debugLog("Span added successfully", {
        spanId: span.spanId,
        traceId: span.traceId,
      });
    } catch (error) {
      this.logger.error("Failed to add span", { error, span });
      throw error;
    }
  }

  /**
   * Update an existing span
   */
  async updateSpan(spanId: string, updates: Partial<ObservabilitySpan>): Promise<void> {
    await this.ensureInitialized();

    try {
      const setClauses: string[] = [];
      const args: any[] = [];

      // Build dynamic SET clause based on provided updates
      if (updates.endTime !== undefined) {
        setClauses.push("end_time = ?");
        args.push(updates.endTime);
      }
      if (updates.duration !== undefined) {
        setClauses.push("duration = ?");
        args.push(updates.duration);
      }
      if (updates.status !== undefined) {
        setClauses.push("status_code = ?, status_message = ?");
        args.push(updates.status.code, updates.status.message || null);
      }
      if (updates.attributes !== undefined) {
        setClauses.push("attributes = ?");
        args.push(safeStringify(updates.attributes));
      }
      if (updates.events !== undefined) {
        setClauses.push("events = ?");
        args.push(safeStringify(updates.events));
      }
      if (updates.links !== undefined) {
        setClauses.push("links = ?");
        args.push(safeStringify(updates.links));
      }

      if (setClauses.length === 0) {
        return; // Nothing to update
      }

      setClauses.push("updated_at = CURRENT_TIMESTAMP");
      args.push(spanId);

      await this.client.execute({
        sql: `
          UPDATE ${this.tablePrefix}_spans 
          SET ${setClauses.join(", ")}
          WHERE span_id = ?
        `,
        args,
      });

      // If endTime was updated, also update trace metadata
      if (updates.endTime) {
        const span = await this.getSpan(spanId);
        if (span) {
          await this.client.execute({
            sql: `
              UPDATE ${this.tablePrefix}_traces
              SET end_time = MAX(COALESCE(end_time, ?), ?),
                  updated_at = CURRENT_TIMESTAMP
              WHERE trace_id = ?
            `,
            args: [updates.endTime, updates.endTime, span.traceId],
          });
        }
      }

      this.debugLog("Span updated successfully", { spanId, updates });
    } catch (error) {
      this.logger.error("Failed to update span", { error, spanId, updates });
      throw error;
    }
  }

  /**
   * Get a span by ID
   */
  async getSpan(spanId: string): Promise<ObservabilitySpan | null> {
    await this.ensureInitialized();

    try {
      const result = await this.client.execute({
        sql: `
          SELECT * FROM ${this.tablePrefix}_spans
          WHERE span_id = ?
        `,
        args: [spanId],
      });

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return this.rowToSpan(row);
    } catch (error) {
      this.logger.error("Failed to get span", { error, spanId });
      throw error;
    }
  }

  /**
   * Get all spans in a trace
   */
  async getTrace(traceId: string): Promise<ObservabilitySpan[]> {
    await this.ensureInitialized();

    try {
      const result = await this.client.execute({
        sql: `
          SELECT * FROM ${this.tablePrefix}_spans
          WHERE trace_id = ?
          ORDER BY start_time ASC
          LIMIT ?
        `,
        args: [traceId, this.maxSpansPerQuery],
      });

      return result.rows.map((row) => this.rowToSpan(row));
    } catch (error) {
      this.logger.error("Failed to get trace", { error, traceId });
      throw error;
    }
  }

  /**
   * List all traces with optional entity filter
   */
  async listTraces(
    limit = 100,
    offset = 0,
    filter?: {
      entityId?: string;
      entityType?: "agent" | "workflow";
    },
  ): Promise<string[]> {
    await this.ensureInitialized();

    try {
      let sql: string;
      let args: any[] = [];
      const conditions: string[] = [];

      if (filter?.entityId) {
        conditions.push("entity_id = ?");
        args.push(filter.entityId);
      }

      if (filter?.entityType) {
        conditions.push("entity_type = ?");
        args.push(filter.entityType);
      }

      if (conditions.length > 0) {
        // Filter by entity
        sql = `
          SELECT trace_id FROM ${this.tablePrefix}_traces
          WHERE ${conditions.join(" AND ")}
          ORDER BY start_time DESC
          LIMIT ? OFFSET ?
        `;
        args.push(limit, offset);
      } else {
        // Get all traces
        sql = `
          SELECT trace_id FROM ${this.tablePrefix}_traces
          ORDER BY start_time DESC
          LIMIT ? OFFSET ?
        `;
        args = [limit, offset];
      }

      const result = await this.client.execute({ sql, args });
      return result.rows.map((row) => row.trace_id as string);
    } catch (error) {
      this.logger.error("Failed to list traces", { error, limit, offset, filter });
      throw error;
    }
  }

  /**
   * Delete old spans
   */
  async deleteOldSpans(beforeTimestamp: number): Promise<number> {
    await this.ensureInitialized();

    try {
      const beforeDate = new Date(beforeTimestamp).toISOString();

      // Get affected trace IDs before deletion
      const tracesResult = await this.client.execute({
        sql: `
          SELECT DISTINCT trace_id FROM ${this.tablePrefix}_spans
          WHERE start_time < ?
        `,
        args: [beforeDate],
      });

      const affectedTraceIds = tracesResult.rows.map((row) => row.trace_id as string);

      // Delete old spans
      const deleteResult = await this.client.execute({
        sql: `
          DELETE FROM ${this.tablePrefix}_spans
          WHERE start_time < ?
        `,
        args: [beforeDate],
      });

      // Clean up trace metadata
      if (affectedTraceIds.length > 0) {
        // Update span counts for affected traces
        for (const traceId of affectedTraceIds) {
          const countResult = await this.client.execute({
            sql: `
              SELECT COUNT(*) as count FROM ${this.tablePrefix}_spans
              WHERE trace_id = ?
            `,
            args: [traceId],
          });

          const count = countResult.rows[0].count as number;
          if (count === 0) {
            // Delete trace metadata if no spans remain
            await this.client.execute({
              sql: `
                DELETE FROM ${this.tablePrefix}_traces
                WHERE trace_id = ?
              `,
              args: [traceId],
            });
          } else {
            // Update span count
            await this.client.execute({
              sql: `
                UPDATE ${this.tablePrefix}_traces
                SET span_count = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE trace_id = ?
              `,
              args: [count, traceId],
            });
          }
        }
      }

      const deletedCount = deleteResult.rowsAffected || 0;
      this.debugLog("Old spans deleted", { deletedCount, beforeDate });
      return deletedCount;
    } catch (error) {
      this.logger.error("Failed to delete old spans", { error, beforeTimestamp });
      throw error;
    }
  }

  /**
   * Clear all spans, traces, and logs
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.client.batch([
        { sql: `DELETE FROM ${this.tablePrefix}_spans`, args: [] },
        { sql: `DELETE FROM ${this.tablePrefix}_traces`, args: [] },
        { sql: `DELETE FROM ${this.tablePrefix}_logs`, args: [] },
      ]);

      this.debugLog("All spans, traces, and logs cleared");
    } catch (error) {
      this.logger.error("Failed to clear data", { error });
      throw error;
    }
  }

  /**
   * Convert a database row to an ObservabilitySpan
   */
  private rowToSpan(row: any): ObservabilitySpan {
    const span: ObservabilitySpan = {
      traceId: row.trace_id as string,
      spanId: row.span_id as string,
      name: row.name as string,
      kind: row.kind as number,
      startTime: row.start_time as string,
      status: {
        code: row.status_code as number,
      },
      attributes: row.attributes ? JSON.parse(row.attributes as string) : {},
      events: row.events ? JSON.parse(row.events as string) : [],
    };

    // Add optional fields only if they have values (not null)
    if (row.parent_span_id !== null) {
      span.parentSpanId = row.parent_span_id as string;
    }
    if (row.end_time !== null) {
      span.endTime = row.end_time as string;
    }
    if (row.duration !== null) {
      span.duration = row.duration as number;
    }
    if (row.status_message !== null) {
      span.status.message = row.status_message as string;
    }
    if (row.links && row.links !== "null") {
      const links = JSON.parse(row.links as string);
      if (links && links.length > 0) {
        span.links = links;
      }
    }
    if (row.resource && row.resource !== "null") {
      const resource = JSON.parse(row.resource as string);
      if (resource && Object.keys(resource).length > 0) {
        span.resource = resource;
      }
    }
    if (row.instrumentation_scope && row.instrumentation_scope !== "null") {
      const scope = JSON.parse(row.instrumentation_scope as string);
      if (scope) {
        span.instrumentationScope = scope;
      }
    }

    return span;
  }

  /**
   * Get statistics about stored spans
   */
  async getStats(): Promise<{
    spanCount: number;
    traceCount: number;
    oldestSpan?: Date;
    newestSpan?: Date;
  }> {
    await this.ensureInitialized();

    try {
      const [spanCountResult, traceCountResult, timeRangeResult] = await Promise.all([
        this.client.execute(`SELECT COUNT(*) as count FROM ${this.tablePrefix}_spans`),
        this.client.execute(`SELECT COUNT(*) as count FROM ${this.tablePrefix}_traces`),
        this.client.execute(`
          SELECT 
            MIN(start_time) as oldest,
            MAX(start_time) as newest
          FROM ${this.tablePrefix}_spans
        `),
      ]);

      const stats: any = {
        spanCount: spanCountResult.rows[0].count as number,
        traceCount: traceCountResult.rows[0].count as number,
      };

      if (timeRangeResult.rows[0].oldest) {
        stats.oldestSpan = new Date(timeRangeResult.rows[0].oldest as string);
      }
      if (timeRangeResult.rows[0].newest) {
        stats.newestSpan = new Date(timeRangeResult.rows[0].newest as string);
      }

      return stats;
    } catch (error) {
      this.logger.error("Failed to get stats", { error });
      throw error;
    }
  }

  /**
   * Save a log record to the database
   */
  async saveLogRecord(logRecord: any): Promise<void> {
    await this.ensureInitialized();

    try {
      // Convert timestamp if it's an array (OpenTelemetry HrTime format)
      let timestamp: string;
      if (Array.isArray(logRecord.hrTime)) {
        const timeMs = logRecord.hrTime[0] * 1000 + logRecord.hrTime[1] / 1000000;
        timestamp = new Date(timeMs).toISOString();
      } else if (logRecord.timestamp) {
        timestamp =
          typeof logRecord.timestamp === "string"
            ? logRecord.timestamp
            : new Date(logRecord.timestamp).toISOString();
      } else {
        timestamp = new Date().toISOString();
      }

      // Extract trace context
      const spanContext = logRecord.spanContext || {};
      const traceId = spanContext.traceId || null;
      const spanId = spanContext.spanId || null;
      const traceFlags = spanContext.traceFlags ?? null;

      // Extract log data
      const severityNumber = logRecord.severityNumber ?? null;
      const severityText = logRecord.severityText || null;
      const body =
        typeof logRecord.body === "string" ? logRecord.body : safeStringify(logRecord.body);
      const attributes = logRecord.attributes ? safeStringify(logRecord.attributes) : null;
      const resource = logRecord.resource?.attributes
        ? safeStringify(logRecord.resource.attributes)
        : null;
      const instrumentationScope =
        logRecord.instrumentationLibrary || logRecord.instrumentationScope
          ? safeStringify(logRecord.instrumentationLibrary || logRecord.instrumentationScope)
          : null;

      await this.client.execute({
        sql: `
          INSERT INTO ${this.tablePrefix}_logs (
            timestamp, trace_id, span_id, trace_flags,
            severity_number, severity_text, body,
            attributes, resource, instrumentation_scope
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          timestamp,
          traceId,
          spanId,
          traceFlags,
          severityNumber,
          severityText,
          body,
          attributes,
          resource,
          instrumentationScope,
        ],
      });

      this.debugLog("Log record saved successfully", {
        timestamp,
        traceId,
        spanId,
        severityNumber,
      });
    } catch (error) {
      this.logger.error("Failed to save log record", { error, logRecord });
      throw error;
    }
  }

  /**
   * Get logs by trace ID
   */
  async getLogsByTraceId(traceId: string): Promise<ObservabilityLogRecord[]> {
    await this.ensureInitialized();

    try {
      const result = await this.client.execute({
        sql: `
          SELECT * FROM ${this.tablePrefix}_logs
          WHERE trace_id = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args: [traceId, this.maxSpansPerQuery],
      });

      return result.rows.map((row) => this.rowToLogRecord(row));
    } catch (error) {
      this.logger.error("Failed to get logs by trace ID", { error, traceId });
      throw error;
    }
  }

  /**
   * Get logs by span ID
   */
  async getLogsBySpanId(spanId: string): Promise<ObservabilityLogRecord[]> {
    await this.ensureInitialized();

    try {
      const result = await this.client.execute({
        sql: `
          SELECT * FROM ${this.tablePrefix}_logs
          WHERE span_id = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args: [spanId, this.maxSpansPerQuery],
      });

      return result.rows.map((row) => this.rowToLogRecord(row));
    } catch (error) {
      this.logger.error("Failed to get logs by span ID", { error, spanId });
      throw error;
    }
  }

  /**
   * Query logs with flexible filtering
   */
  async queryLogs(filter: LogFilter): Promise<ObservabilityLogRecord[]> {
    await this.ensureInitialized();

    try {
      const whereClauses: string[] = [];
      const args: any[] = [];

      if (filter.traceId) {
        whereClauses.push("trace_id = ?");
        args.push(filter.traceId);
      }
      if (filter.spanId) {
        whereClauses.push("span_id = ?");
        args.push(filter.spanId);
      }
      if (filter.severityNumber !== undefined) {
        whereClauses.push("severity_number >= ?");
        args.push(filter.severityNumber);
      }
      if (filter.severityText) {
        whereClauses.push("severity_text = ?");
        args.push(filter.severityText);
      }
      if (filter.instrumentationScope) {
        whereClauses.push("instrumentation_scope LIKE ?");
        args.push(`%${filter.instrumentationScope}%`);
      }
      if (filter.startTimeMin !== undefined) {
        const minTime = new Date(filter.startTimeMin).toISOString();
        whereClauses.push("timestamp >= ?");
        args.push(minTime);
      }
      if (filter.startTimeMax !== undefined) {
        const maxTime = new Date(filter.startTimeMax).toISOString();
        whereClauses.push("timestamp <= ?");
        args.push(maxTime);
      }
      if (filter.bodyContains) {
        whereClauses.push("body LIKE ?");
        args.push(`%${filter.bodyContains}%`);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

      const limit = filter.limit || this.maxSpansPerQuery;
      args.push(limit);

      const result = await this.client.execute({
        sql: `
          SELECT * FROM ${this.tablePrefix}_logs
          ${whereClause}
          ORDER BY timestamp DESC
          LIMIT ?
        `,
        args,
      });

      const logs = result.rows.map((row) => this.rowToLogRecord(row));

      // Filter by attributes if specified
      if (filter.attributeKey) {
        const key = filter.attributeKey;
        return logs.filter((log) => {
          if (!log.attributes) return false;
          if (filter.attributeValue !== undefined) {
            return log.attributes[key] === filter.attributeValue;
          }
          return key in log.attributes;
        });
      }

      return logs;
    } catch (error) {
      this.logger.error("Failed to query logs", { error, filter });
      throw error;
    }
  }

  /**
   * Delete old logs
   */
  async deleteOldLogs(beforeTimestamp: number): Promise<number> {
    await this.ensureInitialized();

    try {
      const beforeDate = new Date(beforeTimestamp).toISOString();

      const result = await this.client.execute({
        sql: `
          DELETE FROM ${this.tablePrefix}_logs
          WHERE timestamp < ?
        `,
        args: [beforeDate],
      });

      const deletedCount = result.rowsAffected || 0;
      this.debugLog("Old logs deleted", { deletedCount, beforeDate });
      return deletedCount;
    } catch (error) {
      this.logger.error("Failed to delete old logs", { error, beforeTimestamp });
      throw error;
    }
  }

  /**
   * Convert a database row to an ObservabilityLogRecord
   */
  private rowToLogRecord(row: any): ObservabilityLogRecord {
    const log: ObservabilityLogRecord = {
      timestamp: row.timestamp as string,
      body: (() => {
        try {
          // Only parse if it looks like JSON and can actually be parsed
          const bodyStr = row.body as string;
          if (bodyStr.startsWith("{") || bodyStr.startsWith("[")) {
            return JSON.parse(bodyStr);
          }
        } catch {
          // If parsing fails, treat as string
        }
        return row.body as string;
      })(),
    };

    // Add optional fields only if they have values (not null)
    if (row.trace_id !== null) {
      log.traceId = row.trace_id as string;
    }
    if (row.span_id !== null) {
      log.spanId = row.span_id as string;
    }
    if (row.trace_flags !== null) {
      log.traceFlags = row.trace_flags as number;
    }
    if (row.severity_number !== null) {
      log.severityNumber = row.severity_number as number;
    }
    if (row.severity_text !== null) {
      log.severityText = row.severity_text as string;
    }
    if (row.attributes && row.attributes !== "null") {
      try {
        const attributes = JSON.parse(row.attributes as string);
        if (attributes && Object.keys(attributes).length > 0) {
          log.attributes = attributes;
        }
      } catch {
        // Skip if parsing fails
      }
    }
    if (row.resource && row.resource !== "null") {
      try {
        const resource = JSON.parse(row.resource as string);
        if (resource && Object.keys(resource).length > 0) {
          log.resource = resource;
        }
      } catch {
        // Skip if parsing fails
      }
    }
    if (row.instrumentation_scope && row.instrumentation_scope !== "null") {
      try {
        const scope = JSON.parse(row.instrumentation_scope as string);
        if (scope) {
          log.instrumentationScope = scope;
        }
      } catch {
        // Skip if parsing fails
      }
    }

    return log;
  }

  getInfo() {
    return {
      adapter: this.constructor.name,
      displayName: "LibSQL Observability Storage",
      persistent: true,
      description: "Persists spans and logs to a LibSQL/Turso database for long-term retention.",
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    // LibSQL client doesn't have an explicit close method
    this.debugLog("LibSQL observability adapter closed");
  }
}
