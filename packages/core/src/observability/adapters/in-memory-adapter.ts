/**
 * InMemoryStorageAdapter
 *
 * In-memory storage implementation for development and testing.
 * Provides fast access with automatic cleanup of old spans.
 */

import { safeStringify } from "@voltagent/internal";
import type {
  LogFilter,
  ObservabilityLogRecord,
  ObservabilitySpan,
  ObservabilityStorageAdapter,
} from "../types";

/**
 * In-memory storage adapter for spans
 */
export class InMemoryStorageAdapter implements ObservabilityStorageAdapter {
  private spans: Map<string, ObservabilitySpan> = new Map();
  private traceIndex: Map<string, Set<string>> = new Map();
  private entityTraceIndex: Map<string, Set<string>> = new Map(); // Map of entityId to traceIds
  private logs: ObservabilityLogRecord[] = [];
  private logTraceIndex: Map<string, ObservabilityLogRecord[]> = new Map();
  private logSpanIndex: Map<string, ObservabilityLogRecord[]> = new Map();
  private maxSpans: number;
  private maxLogs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    options: {
      maxSpans?: number;
      maxLogs?: number;
      cleanupIntervalMs?: number;
    } = {},
  ) {
    this.maxSpans = options.maxSpans || 10000;
    this.maxLogs = options.maxLogs || 50000;

    // Start cleanup interval if specified
    if (options.cleanupIntervalMs) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, options.cleanupIntervalMs);
    }
  }

  /**
   * Add a span
   */
  async addSpan(span: ObservabilitySpan): Promise<void> {
    // Store span
    this.spans.set(span.spanId, span);

    // Update trace index
    if (!this.traceIndex.has(span.traceId)) {
      this.traceIndex.set(span.traceId, new Set());
    }
    this.traceIndex.get(span.traceId)?.add(span.spanId);

    // Update entity trace index if entity.id exists
    const entityId = span.attributes?.["entity.id"] as string;
    if (entityId) {
      if (!this.entityTraceIndex.has(entityId)) {
        this.entityTraceIndex.set(entityId, new Set());
      }
      this.entityTraceIndex.get(entityId)?.add(span.traceId);
    }

    // Cleanup if we exceed max spans
    if (this.spans.size > this.maxSpans) {
      this.cleanup();
    }
  }

  /**
   * Update a span
   */
  async updateSpan(
    spanId: string,
    updates: ObservabilitySpan | Partial<ObservabilitySpan>,
  ): Promise<void> {
    const span = this.spans.get(spanId);
    if (span) {
      Object.assign(span, updates);
    }
  }

  /**
   * Get a span by ID
   */
  async getSpan(spanId: string): Promise<ObservabilitySpan | null> {
    return this.spans.get(spanId) || null;
  }

  /**
   * Get all spans in a trace
   */
  async getTrace(traceId: string): Promise<ObservabilitySpan[]> {
    const spanIds = this.traceIndex.get(traceId);
    if (!spanIds) {
      return [];
    }

    const spans: ObservabilitySpan[] = [];
    for (const spanId of spanIds) {
      const span = this.spans.get(spanId);
      if (span) {
        spans.push(span);
      }
    }

    // Sort by start time
    return spans.sort((a, b) => {
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return aTime - bTime;
    });
  }

  /**
   * Delete old spans (cleanup)
   */
  async deleteOldSpans(beforeTimestamp: number): Promise<number> {
    let deletedCount = 0;

    for (const [spanId, span] of this.spans) {
      const spanTime = new Date(span.startTime).getTime();
      if (spanTime < beforeTimestamp) {
        // Remove from spans map
        this.spans.delete(spanId);

        // Remove from trace index
        const spanIds = this.traceIndex.get(span.traceId);
        if (spanIds) {
          spanIds.delete(spanId);
          if (spanIds.size === 0) {
            this.traceIndex.delete(span.traceId);

            // Also remove from entity trace index
            const entityId = span.attributes?.["entity.id"] as string;
            if (entityId) {
              const entityTraces = this.entityTraceIndex.get(entityId);
              if (entityTraces) {
                entityTraces.delete(span.traceId);
                if (entityTraces.size === 0) {
                  this.entityTraceIndex.delete(entityId);
                }
              }
            }
          }
        }

        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Internal cleanup method
   */
  private cleanup(): void {
    if (this.spans.size <= this.maxSpans * 0.9) {
      return; // No cleanup needed
    }

    // Delete oldest 20% of spans
    const spansToDelete = Math.floor(this.maxSpans * 0.2);
    const sortedSpans = Array.from(this.spans.values()).sort((a, b) => {
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return aTime - bTime;
    });

    for (let i = 0; i < spansToDelete && i < sortedSpans.length; i++) {
      const span = sortedSpans[i];
      this.spans.delete(span.spanId);

      const spanIds = this.traceIndex.get(span.traceId);
      if (spanIds) {
        spanIds.delete(span.spanId);
        if (spanIds.size === 0) {
          this.traceIndex.delete(span.traceId);
        }
      }
    }
  }

  /**
   * Clear all spans and logs
   */
  async clear(): Promise<void> {
    this.spans.clear();
    this.traceIndex.clear();
    this.entityTraceIndex.clear();
    this.logs = [];
    this.logTraceIndex.clear();
    this.logSpanIndex.clear();
  }

  /**
   * Destroy the adapter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * List all traces with optional entity filter
   */
  async listTraces(
    limit?: number,
    offset?: number,
    filter?: {
      entityId?: string;
      entityType?: "agent" | "workflow";
    },
  ): Promise<string[]> {
    let traceIds: string[];

    if (filter?.entityId) {
      // Return only traces for the specified entity
      const entityTraces = this.entityTraceIndex.get(filter.entityId);
      traceIds = entityTraces ? Array.from(entityTraces) : [];
    } else if (filter?.entityType) {
      // Filter by entity type
      const matchingTraces = new Set<string>();
      for (const [, span] of this.spans) {
        if (span.attributes?.["entity.type"] === filter.entityType) {
          matchingTraces.add(span.traceId);
        }
      }
      traceIds = Array.from(matchingTraces);
    } else {
      // Return all traces
      traceIds = Array.from(this.traceIndex.keys());
    }

    // Apply limit and offset if provided
    const start = offset || 0;
    const end = limit ? start + limit : undefined;

    return traceIds.slice(start, end);
  }

  // === Log Methods ===

  /**
   * Save a log record
   */
  async saveLogRecord(logRecord: any): Promise<void> {
    // Convert ReadableLogRecord to ObservabilityLogRecord
    const { readableLogRecordToObservabilityLog } = await import("../types");
    const log = readableLogRecordToObservabilityLog(logRecord);

    // Store log
    this.logs.push(log);

    // Index by trace ID
    if (log.traceId) {
      if (!this.logTraceIndex.has(log.traceId)) {
        this.logTraceIndex.set(log.traceId, []);
      }
      this.logTraceIndex.get(log.traceId)?.push(log);
    }

    // Index by span ID
    if (log.spanId) {
      if (!this.logSpanIndex.has(log.spanId)) {
        this.logSpanIndex.set(log.spanId, []);
      }
      this.logSpanIndex.get(log.spanId)?.push(log);
    }

    // Cleanup if we exceed max logs
    if (this.logs.length > this.maxLogs) {
      this.cleanupLogs();
    }
  }

  /**
   * Get logs by trace ID
   */
  async getLogsByTraceId(traceId: string): Promise<ObservabilityLogRecord[]> {
    return this.logTraceIndex.get(traceId) || [];
  }

  /**
   * Get logs by span ID
   */
  async getLogsBySpanId(spanId: string): Promise<ObservabilityLogRecord[]> {
    return this.logSpanIndex.get(spanId) || [];
  }

  /**
   * Query logs with filters
   */
  async queryLogs(filter: LogFilter): Promise<ObservabilityLogRecord[]> {
    let results = [...this.logs];

    if (filter.traceId) {
      results = results.filter((log) => log.traceId === filter.traceId);
    }

    if (filter.spanId) {
      results = results.filter((log) => log.spanId === filter.spanId);
    }

    if (filter.severityNumber !== undefined) {
      results = results.filter((log) => log.severityNumber === filter.severityNumber);
    }

    if (filter.severityText) {
      results = results.filter((log) => log.severityText === filter.severityText);
    }

    if (filter.startTimeMin !== undefined) {
      const minTime = filter.startTimeMin;
      results = results.filter((log) => new Date(log.timestamp).getTime() >= minTime);
    }

    if (filter.startTimeMax !== undefined) {
      const maxTime = filter.startTimeMax;
      results = results.filter((log) => new Date(log.timestamp).getTime() <= maxTime);
    }

    if (filter.bodyContains) {
      const searchStr = filter.bodyContains;
      results = results.filter((log) => {
        const bodyStr = typeof log.body === "string" ? log.body : safeStringify(log.body);
        return bodyStr.includes(searchStr);
      });
    }

    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Delete old logs
   */
  async deleteOldLogs(beforeTimestamp: number): Promise<number> {
    const initialCount = this.logs.length;

    this.logs = this.logs.filter((log) => new Date(log.timestamp).getTime() >= beforeTimestamp);

    // Rebuild indexes
    this.rebuildLogIndexes();

    return initialCount - this.logs.length;
  }

  /**
   * Internal cleanup for logs
   */
  private cleanupLogs(): void {
    if (this.logs.length <= this.maxLogs * 0.9) {
      return; // No cleanup needed
    }

    // Keep newest 80% of logs
    const logsToKeep = Math.floor(this.maxLogs * 0.8);
    this.logs = this.logs.slice(-logsToKeep);

    // Rebuild indexes
    this.rebuildLogIndexes();
  }

  /**
   * Rebuild log indexes after cleanup
   */
  private rebuildLogIndexes(): void {
    this.logTraceIndex.clear();
    this.logSpanIndex.clear();

    for (const log of this.logs) {
      if (log.traceId) {
        if (!this.logTraceIndex.has(log.traceId)) {
          this.logTraceIndex.set(log.traceId, []);
        }
        this.logTraceIndex.get(log.traceId)?.push(log);
      }

      if (log.spanId) {
        if (!this.logSpanIndex.has(log.spanId)) {
          this.logSpanIndex.set(log.spanId, []);
        }
        this.logSpanIndex.get(log.spanId)?.push(log);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    spanCount: number;
    traceCount: number;
    logCount: number;
    oldestSpan?: Date;
    newestSpan?: Date;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const stats: any = {
      spanCount: this.spans.size,
      traceCount: this.traceIndex.size,
      logCount: this.logs.length,
    };

    if (this.spans.size > 0) {
      const spans = Array.from(this.spans.values());
      const times = spans.map((s) => new Date(s.startTime).getTime());
      stats.oldestSpan = new Date(Math.min(...times));
      stats.newestSpan = new Date(Math.max(...times));
    }

    if (this.logs.length > 0) {
      const times = this.logs.map((l) => new Date(l.timestamp).getTime());
      stats.oldestLog = new Date(Math.min(...times));
      stats.newestLog = new Date(Math.max(...times));
    }

    return stats;
  }

  getInfo() {
    return {
      adapter: this.constructor.name,
      displayName: "In-memory Storage",
      persistent: false,
      description: "Volatile storage intended for development and debugging sessions.",
    };
  }
}
