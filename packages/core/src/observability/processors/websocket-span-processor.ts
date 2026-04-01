/**
 * WebSocketSpanProcessor
 *
 * OpenTelemetry SpanProcessor that broadcasts span events via WebSocket
 * for real-time observability in the Console UI.
 */

import type { Context, Span } from "@opentelemetry/api";
import { trace } from "@opentelemetry/api";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { SimpleEventEmitter } from "../../utils/simple-event-emitter";
import { readableSpanToObservabilitySpan } from "../types";
import type { ObservabilityWebSocketEvent } from "../types";

/**
 * Singleton EventEmitter for WebSocket broadcasting
 */
export class WebSocketEventEmitter extends SimpleEventEmitter {
  private static instance: WebSocketEventEmitter;

  private constructor() {
    super();
  }

  static getInstance(): WebSocketEventEmitter {
    if (!WebSocketEventEmitter.instance) {
      WebSocketEventEmitter.instance = new WebSocketEventEmitter();
    }
    return WebSocketEventEmitter.instance;
  }

  emitWebSocketEvent(event: ObservabilityWebSocketEvent): void {
    this.emit("websocket:event", event);
  }

  onWebSocketEvent(callback: (event: ObservabilityWebSocketEvent) => void): () => void {
    this.on("websocket:event", callback);
    return () => this.off("websocket:event", callback);
  }
}

/**
 * WebSocket SpanProcessor for real-time event broadcasting
 */
export class WebSocketSpanProcessor implements SpanProcessor {
  private emitter: WebSocketEventEmitter;
  private enabled: boolean;

  constructor(enabled = true) {
    this.emitter = WebSocketEventEmitter.getInstance();
    this.enabled = enabled;
  }

  /**
   * Called when a span is started
   */
  onStart(span: Span, parentContext: Context): void {
    if (!this.enabled) return;

    // Extract parent span ID from context if available
    const parentSpan = trace.getSpan(parentContext);
    const parentSpanId = parentSpan ? parentSpan.spanContext().spanId : undefined;

    // Extract links if available
    const spanLinks = (span as any).links;
    const links =
      spanLinks && spanLinks.length > 0
        ? spanLinks.map((link: any) => ({
            context: {
              traceId: link.context.traceId,
              spanId: link.context.spanId,
              traceFlags: link.context.traceFlags,
              traceState: link.context.traceState,
            },
            attributes: link.attributes,
          }))
        : undefined;

    // Create a minimal ObservabilitySpan for start event
    const observabilitySpan = {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: parentSpanId || (span as any).parentSpanId,
      name: (span as any).name || "",
      kind: (span as any).kind || 0,
      startTime: new Date().toISOString(),
      attributes: (span as any).attributes || {},
      status: { code: 0 },
      events: [],
      links,
    };

    const event: ObservabilityWebSocketEvent = {
      type: "span:start",
      span: observabilitySpan as any,
      timestamp: new Date().toISOString(),
    };

    this.emitter.emitWebSocketEvent(event);
  }

  /**
   * Called when a span is ended
   */
  onEnd(span: ReadableSpan): void {
    if (!this.enabled) return;

    // Convert ReadableSpan to ObservabilitySpan
    const observabilitySpan = readableSpanToObservabilitySpan(span);

    const event: ObservabilityWebSocketEvent = {
      type: "span:end",
      span: observabilitySpan,
      timestamp: new Date().toISOString(),
    };

    this.emitter.emitWebSocketEvent(event);
  }

  /**
   * Shutdown the processor
   */
  async shutdown(): Promise<void> {
    this.enabled = false;
    this.emitter.removeAllListeners();
  }

  /**
   * Force flush (no-op for WebSocket)
   */
  async forceFlush(): Promise<void> {
    // No buffering, so nothing to flush
  }

  /**
   * Get the event emitter for subscribing to events
   */
  static getEventEmitter(): WebSocketEventEmitter {
    return WebSocketEventEmitter.getInstance();
  }

  /**
   * Subscribe to WebSocket events
   */
  static subscribe(callback: (event: ObservabilityWebSocketEvent) => void): () => void {
    return WebSocketEventEmitter.getInstance().onWebSocketEvent(callback);
  }

  // Removed unused method readableSpanToSpanData
}
