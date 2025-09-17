/**
 * Storage Log Processor
 *
 * Stores OpenTelemetry log records in the configured storage adapter
 */

import type { Context } from "@opentelemetry/api";
import type { LogRecordProcessor, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import type { ObservabilityStorageAdapter } from "../types";

export class StorageLogProcessor implements LogRecordProcessor {
  constructor(private storage: ObservabilityStorageAdapter) {}

  /**
   * Called when a log record is emitted
   */
  onEmit(logRecord: ReadableLogRecord, _context?: Context): void {
    // Store log asynchronously to avoid blocking
    this.storage.saveLogRecord(logRecord).catch((err) => {
      // Silent fail to avoid breaking the application
      console.error("[StorageLogProcessor] Failed to store log:", err);
    });
  }

  /**
   * Force flush any pending logs
   */
  async forceFlush(): Promise<void> {
    // Storage adapters handle their own flushing
    return Promise.resolve();
  }

  /**
   * Shutdown the processor
   */
  async shutdown(): Promise<void> {
    // Nothing to cleanup
    return Promise.resolve();
  }
}
