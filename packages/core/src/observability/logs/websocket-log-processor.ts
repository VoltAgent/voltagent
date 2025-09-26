/**
 * WebSocket Log Processor
 *
 * Streams OpenTelemetry log records via WebSocket for real-time monitoring
 */

import type { Context } from "@opentelemetry/api";
import { trace } from "@opentelemetry/api";
import type { LogRecordProcessor, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { SimpleEventEmitter } from "../../utils/simple-event-emitter";
import type { ObservabilityLogRecord } from "../types";

export class WebSocketLogProcessor implements LogRecordProcessor {
  private static emitter = new SimpleEventEmitter();

  /**
   * Called when a log record is emitted
   */
  onEmit(logRecord: ReadableLogRecord, context?: Context): void {
    // Convert to serializable format
    const serialized = this.serializeLogRecord(logRecord, context);

    // Emit to all subscribers
    WebSocketLogProcessor.emitter.emit("log", serialized);
  }

  /**
   * Subscribe to log events
   */
  static subscribe(callback: (log: ObservabilityLogRecord) => void): () => void {
    WebSocketLogProcessor.emitter.on("log", callback);

    // Return unsubscribe function
    return () => {
      WebSocketLogProcessor.emitter.off("log", callback);
    };
  }

  /**
   * Get subscriber count
   */
  static getSubscriberCount(): number {
    return WebSocketLogProcessor.emitter.listenerCount("log");
  }

  /**
   * Serialize log record for transmission
   */
  private serializeLogRecord(
    logRecord: ReadableLogRecord,
    context?: Context,
  ): ObservabilityLogRecord {
    // Try to get span context from the log record first
    let spanContext = logRecord.spanContext;

    // If no span context on the log record but we have a context, try to get the active span
    if (!spanContext && context) {
      const activeSpan = trace.getSpan(context);
      if (activeSpan) {
        spanContext = activeSpan.spanContext();
      }
    }

    return {
      timestamp: new Date(logRecord.hrTime[0] * 1000 + logRecord.hrTime[1] / 1000000).toISOString(),
      severityNumber: logRecord.severityNumber,
      severityText: logRecord.severityText,
      body: logRecord.body,
      attributes: logRecord.attributes,
      resource: logRecord.resource?.attributes,
      instrumentationScope: {
        name: logRecord.instrumentationScope.name,
        version: logRecord.instrumentationScope.version,
      },
      // Trace correlation
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      traceFlags: spanContext?.traceFlags,
    };
  }

  /**
   * Force flush any pending logs
   */
  async forceFlush(): Promise<void> {
    // Nothing to flush for WebSocket streaming
    return Promise.resolve();
  }

  /**
   * Shutdown the processor
   */
  async shutdown(): Promise<void> {
    // Clear all listeners
    WebSocketLogProcessor.emitter.removeAllListeners();
    return Promise.resolve();
  }
}
