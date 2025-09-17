/**
 * LocalStorageSpanProcessor
 *
 * OpenTelemetry SpanProcessor that persists spans to local storage
 * for crash resilience and historical analysis.
 */

import type { Context, Span } from "@opentelemetry/api";
import { trace } from "@opentelemetry/api";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { ObservabilitySpan, ObservabilityStorageAdapter } from "../types";
import { readableSpanToObservabilitySpan } from "../types";

/**
 * Local Storage SpanProcessor for span persistence
 */
export class LocalStorageSpanProcessor implements SpanProcessor {
  private activeSpans: Map<string, ObservabilitySpan> = new Map();

  constructor(private storage: ObservabilityStorageAdapter) {}

  /**
   * Called when a span is started
   */
  onStart(span: Span, parentContext: Context): void {
    const spanContext = span.spanContext();

    // Extract parent span ID from context
    const parentSpan = trace.getSpan(parentContext);
    const parentSpanId = parentSpan?.spanContext().spanId;

    // Create initial span data
    const spanData: ObservabilitySpan = {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      parentSpanId,
      name: (span as any).name || "",
      kind: (span as any).kind || 0,
      startTime: new Date().toISOString(),
      attributes: (span as any).attributes || {},
      status: { code: 0 },
      events: [],
    };

    // Track in memory
    this.activeSpans.set(spanContext.spanId, spanData);

    // Persist to storage
    this.storage.addSpan(spanData).catch((err: Error) => {
      console.error("Failed to persist span start:", err);
    });
  }

  /**
   * Called when a span is ended
   */
  onEnd(span: ReadableSpan): void {
    const spanId = span.spanContext().spanId;

    // Convert ReadableSpan to ObservabilitySpan
    const observabilitySpan = readableSpanToObservabilitySpan(span);

    // Update in memory
    this.activeSpans.set(spanId, observabilitySpan);

    // Persist to storage
    this.storage.updateSpan(spanId, observabilitySpan).catch((err: Error) => {
      console.error("Failed to persist span end:", err);
    });

    // Clean up active span after persisting
    this.activeSpans.delete(spanId);
  }

  /**
   * Shutdown the processor
   */
  async shutdown(): Promise<void> {
    // End any remaining active spans
    for (const [spanId, spanData] of this.activeSpans) {
      if (!spanData.endTime) {
        const updatedSpan: ObservabilitySpan = {
          ...spanData,
          endTime: new Date().toISOString(),
          status: { code: 2, message: "Processor shutdown" },
        };
        await this.storage.updateSpan(spanId, updatedSpan);
      }
    }
    this.activeSpans.clear();
  }

  /**
   * Force flush - ensure all spans are persisted
   */
  async forceFlush(): Promise<void> {
    // Storage operations are synchronous on each call,
    // so there's nothing to flush
  }

  /**
   * Get storage adapter
   */
  getStorage(): ObservabilityStorageAdapter {
    return this.storage;
  }
}
