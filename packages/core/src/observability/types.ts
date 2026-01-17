/**
 * Unified Observability Types for VoltAgent
 *
 * These types are used consistently across:
 * - WebSocket transmission
 * - Local storage persistence
 * - Remote export
 * - UI components
 *
 * This ensures type safety and eliminates unnecessary conversions.
 */

import type { LogRecordProcessor } from "@opentelemetry/sdk-logs";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { Logger } from "@voltagent/internal";

/**
 * Observability configuration
 */
export interface ObservabilityConfig {
  serviceName?: string;
  serviceVersion?: string;
  instrumentationScopeName?: string;
  storage?: ObservabilityStorageAdapter;
  logger?: Logger;
  resourceAttributes?: Record<string, any>;
  spanFilters?: SpanFilterConfig;
  /**
   * Controls whether flushOnFinish() runs automatically.
   * - "auto": flush only in serverless (default)
   * - "always": always flush
   * - "never": never flush
   */
  flushOnFinishStrategy?: "auto" | "always" | "never";
  voltOpsSync?: {
    sampling?: ObservabilitySamplingConfig;
    // BatchSpanProcessor configuration
    maxQueueSize?: number; // Default: 2048
    maxExportBatchSize?: number; // Default: 512
    scheduledDelayMillis?: number; // Default: 5000ms
    exportTimeoutMillis?: number; // Default: 30000ms
  };
  serverlessRemote?: ServerlessRemoteExportConfig;
  spanProcessors?: SpanProcessor[];
  logProcessors?: LogRecordProcessor[];
}

export interface ObservabilitySamplingConfig {
  strategy?: "always" | "never" | "ratio" | "parent";
  ratio?: number;
}

export interface ServerlessRemoteEndpointConfig {
  url: string;
  headers?: Record<string, string>;
  method?: string;
}

export interface ServerlessRemoteExportConfig {
  traces?: ServerlessRemoteEndpointConfig;
  logs?: ServerlessRemoteEndpointConfig;
  sampling?: ObservabilitySamplingConfig;
  maxQueueSize?: number;
  maxExportBatchSize?: number;
  scheduledDelayMillis?: number;
  exportTimeoutMillis?: number;
}

/**
 * Span filter configuration
 */
export interface SpanFilterConfig {
  enabled?: boolean;
  /**
   * Restrict span processing to spans originating from these tracer
   * instrumentation scope names. Defaults to the internal VoltAgent tracer
   * when omitted.
   */
  instrumentationScopeNames?: string[];
  /**
   * Restrict span processing to the provided `service.name` values. If empty
   * or undefined, this constraint is ignored.
   */
  serviceNames?: string[];
}

/**
 * Unified span format for all observability features
 * Serializable and compatible with OpenTelemetry concepts
 */
export interface ObservabilitySpan {
  // Core identifiers
  traceId: string;
  spanId: string;
  parentSpanId?: string;

  // Span metadata
  name: string;
  kind: SpanKind;

  // Timing
  startTime: string; // ISO 8601 string
  endTime?: string; // ISO 8601 string
  duration?: number; // milliseconds (calculated)

  // Data
  attributes: SpanAttributes;
  status: SpanStatus;
  events: SpanEvent[];
  links?: SpanLink[];

  // OpenTelemetry metadata
  resource?: Record<string, any>;
  instrumentationScope?: {
    name: string;
    version?: string;
  };
}

/**
 * Span kinds following OpenTelemetry specification
 */
export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

/**
 * Span status codes
 */
export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

/**
 * Span status
 */
export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

/**
 * Span attributes with VoltAgent-specific fields
 */
export interface SpanAttributes {
  // Entity attributes (unified for all entities)
  "entity.id"?: string;
  "entity.type"?: "agent" | "workflow";
  "entity.name"?: string;

  // Operation attributes
  "operation.type"?: "generateText" | "streamText" | "tool-execution" | "workflow-execution";

  // Workflow-specific attributes
  "workflow.execution.id"?: string;
  "workflow.step.index"?: number;
  "workflow.step.type"?: string;
  "workflow.step.name"?: string;

  // Tool-specific attributes
  "tool.name"?: string;

  // Common attributes
  "user.id"?: string;
  "conversation.id"?: string;
  "model.name"?: string;

  // Usage tracking
  "usage.prompt_tokens"?: number;
  "usage.completion_tokens"?: number;
  "usage.total_tokens"?: number;

  // Input/Output
  input?: any;
  output?: any;

  // Allow any additional attributes
  [key: string]: any;
}

/**
 * Span event
 */
export interface SpanEvent {
  name: string;
  timestamp: string; // ISO 8601 string
  attributes?: Record<string, any>;
}

/**
 * Span link for trace correlation
 */
export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes?: Record<string, any>;
}

/**
 * WebSocket event wrapper for observability
 */
export interface ObservabilityWebSocketEvent {
  type: "span:start" | "span:end" | "span:error";
  span: ObservabilitySpan;
  timestamp: string; // ISO 8601 string
}

/**
 * Unified log record format for observability
 */
export interface ObservabilityLogRecord {
  // Core identifiers
  timestamp: string; // ISO 8601 string
  traceId?: string;
  spanId?: string;
  traceFlags?: number;

  // Log data
  severityNumber?: number;
  severityText?: string;
  body: any;
  attributes?: Record<string, any>;

  // OpenTelemetry metadata
  resource?: Record<string, any>;
  instrumentationScope?: {
    name: string;
    version?: string;
  };
}

/**
 * Storage adapter interface - uses ObservabilitySpan and ObservabilityLogRecord directly
 */
export interface ObservabilityStorageAdapter {
  // === Span operations ===
  addSpan(span: ObservabilitySpan): Promise<void>;
  updateSpan(spanId: string, updates: Partial<ObservabilitySpan>): Promise<void>;
  getSpan(spanId: string): Promise<ObservabilitySpan | null>;

  // Trace operations
  getTrace(traceId: string): Promise<ObservabilitySpan[]>;
  listTraces(
    limit?: number,
    offset?: number,
    filter?: {
      entityId?: string;
      entityType?: "agent" | "workflow";
    },
  ): Promise<string[]>;

  // === Log operations ===
  saveLogRecord(logRecord: any): Promise<void>; // ReadableLogRecord from SDK
  getLogsByTraceId(traceId: string): Promise<ObservabilityLogRecord[]>;
  getLogsBySpanId(spanId: string): Promise<ObservabilityLogRecord[]>;
  queryLogs(filter: LogFilter): Promise<ObservabilityLogRecord[]>;

  // === Maintenance ===
  deleteOldSpans(beforeTimestamp: number): Promise<number>;
  deleteOldLogs(beforeTimestamp: number): Promise<number>;
  clear(): Promise<void>;

  // === Metadata ===
  getInfo?(): {
    adapter: string;
    displayName?: string;
    persistent?: boolean;
    description?: string;
  };
}

/**
 * Log filter for querying
 */
export interface LogFilter {
  traceId?: string;
  spanId?: string;
  severityNumber?: number;
  severityText?: string;
  instrumentationScope?: string;
  startTimeMin?: number;
  startTimeMax?: number;
  limit?: number;
  bodyContains?: string;
  attributeKey?: string;
  attributeValue?: any;
}

/**
 * Convert OpenTelemetry ReadableSpan to ObservabilitySpan
 * This is the ONLY conversion needed in the entire system
 */
export function readableSpanToObservabilitySpan(readableSpan: any): ObservabilitySpan {
  const startTimeMs = readableSpan.startTime[0] * 1000 + readableSpan.startTime[1] / 1000000;
  const endTimeMs = readableSpan.endTime?.[0]
    ? readableSpan.endTime[0] * 1000 + readableSpan.endTime[1] / 1000000
    : undefined;

  return {
    traceId: readableSpan.spanContext().traceId,
    spanId: readableSpan.spanContext().spanId,
    parentSpanId: readableSpan.parentSpanContext?.spanId,
    name: readableSpan.name,
    kind: readableSpan.kind as SpanKind,
    startTime: new Date(startTimeMs).toISOString(),
    endTime: endTimeMs ? new Date(endTimeMs).toISOString() : undefined,
    duration: endTimeMs ? endTimeMs - startTimeMs : undefined,
    attributes: readableSpan.attributes || {},
    status: {
      code: (readableSpan.status?.code ?? SpanStatusCode.UNSET) as SpanStatusCode,
      message: readableSpan.status?.message,
    },
    events: (readableSpan.events || []).map((event: any) => ({
      name: event.name,
      timestamp: new Date(event.time[0] * 1000 + event.time[1] / 1000000).toISOString(),
      attributes: event.attributes,
    })),
    links:
      readableSpan.links?.length > 0
        ? readableSpan.links.map((link: any) => ({
            traceId: link.context.traceId,
            spanId: link.context.spanId,
            attributes: link.attributes,
          }))
        : undefined,
    resource: readableSpan.resource?.attributes,
    instrumentationScope: readableSpan.instrumentationLibrary && {
      name: readableSpan.instrumentationLibrary.name,
      version: readableSpan.instrumentationLibrary.version,
    },
  };
}

/**
 * Build a tree structure from flat span list
 */
export interface SpanTreeNode extends ObservabilitySpan {
  children: SpanTreeNode[];
  depth: number;
}

export function buildSpanTree(spans: ObservabilitySpan[]): SpanTreeNode[] {
  const spanMap = new Map<string, SpanTreeNode>();
  const rootSpans: SpanTreeNode[] = [];

  // First pass: create nodes
  spans.forEach((span) => {
    const node: SpanTreeNode = {
      ...span,
      children: [],
      depth: 0,
    };
    spanMap.set(span.spanId, node);
  });

  // Second pass: build tree
  spans.forEach((span) => {
    const node = spanMap.get(span.spanId);
    if (!node) {
      return;
    }
    if (span.parentSpanId) {
      const parent = spanMap.get(span.parentSpanId);
      if (parent) {
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        rootSpans.push(node);
      }
    } else {
      rootSpans.push(node);
    }
  });

  return rootSpans;
}

/**
 * Convert OpenTelemetry ReadableLogRecord to ObservabilityLogRecord
 */
export function readableLogRecordToObservabilityLog(readableLog: any): ObservabilityLogRecord {
  const spanContext = readableLog.spanContext;
  const timestamp = new Date(
    readableLog.hrTime[0] * 1000 + readableLog.hrTime[1] / 1000000,
  ).toISOString();

  return {
    timestamp,
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId,
    traceFlags: spanContext?.traceFlags,
    severityNumber: readableLog.severityNumber,
    severityText: readableLog.severityText,
    body: readableLog.body,
    attributes: readableLog.attributes,
    resource: readableLog.resource?.attributes,
    instrumentationScope: readableLog.instrumentationScope && {
      name: readableLog.instrumentationScope.name,
      version: readableLog.instrumentationScope.version,
    },
  };
}
