/**
 * VoltAgent Observability - Built on OpenTelemetry
 *
 * This module provides OpenTelemetry-based observability with:
 * - WebSocket real-time events via custom SpanProcessor
 * - Local storage via custom SpanProcessor
 * - OTLP export support
 * - Zero-configuration defaults
 */

export { VoltAgentObservability } from "./voltagent-observability";
export {
  WebSocketSpanProcessor,
  WebSocketEventEmitter,
} from "./processors/websocket-span-processor";
export { LocalStorageSpanProcessor } from "./processors/local-storage-span-processor";
export { LazyRemoteExportProcessor } from "./processors/lazy-remote-export-processor";
export { SpanFilterProcessor } from "./processors/span-filter-processor";
export { InMemoryStorageAdapter } from "./adapters/in-memory-adapter";

// Export log processors
export { StorageLogProcessor, WebSocketLogProcessor, RemoteLogProcessor } from "./logs";
export type { RemoteLogExportConfig } from "./logs";

// Export new unified types
export type {
  ObservabilitySpan,
  ObservabilityLogRecord,
  ObservabilityWebSocketEvent,
  ObservabilityStorageAdapter,
  ObservabilityConfig,
  SpanFilterConfig,
  SpanAttributes,
  SpanEvent,
  SpanLink,
  SpanStatus,
  SpanTreeNode,
  LogFilter,
} from "./types";

export {
  SpanKind,
  SpanStatusCode,
  readableSpanToObservabilitySpan,
  readableLogRecordToObservabilityLog,
  buildSpanTree,
} from "./types";

// Re-export OpenTelemetry types for convenience
export {
  type Span,
  type SpanOptions,
  type Tracer,
  trace,
  context,
} from "@opentelemetry/api";
