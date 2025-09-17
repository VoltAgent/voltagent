/**
 * Helper functions for creating OpenTelemetry spans
 * Used by components that don't have access to TraceContext
 */

import {
  type Span,
  SpanKind,
  SpanStatusCode,
  context as apiContext,
  trace,
} from "@opentelemetry/api";

const tracer = trace.getTracer("voltagent-core", "0.1.0");

/**
 * Start an embedding generation span
 */
export function startEmbeddingSpan(options: {
  query?: string;
  modelName?: string;
  parentSpan?: Span;
  label?: string;
}): Span {
  const parentContext = options.parentSpan
    ? trace.setSpan(apiContext.active(), options.parentSpan)
    : apiContext.active();

  return tracer.startSpan(
    options.label || "embedding.generate",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "embedding.query": options.query,
        "model.name": options.modelName,
      },
    },
    parentContext,
  );
}

/**
 * End an embedding span
 */
export function endEmbeddingSpan(options: {
  span: Span;
  dimension?: number;
}): void {
  if (options.dimension) {
    options.span.setAttribute("embedding.dimensions", options.dimension);
  }
  options.span.setStatus({ code: SpanStatusCode.OK });
  options.span.end();
}

/**
 * Start a vector search span
 */
export function startVectorSpan(options: {
  operation: string;
  query?: string;
  parentSpan?: Span;
  label?: string;
  adapterName?: string;
}): Span {
  const parentContext = options.parentSpan
    ? trace.setSpan(apiContext.active(), options.parentSpan)
    : apiContext.active();

  return tracer.startSpan(
    options.label || "vector.search",
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        "vector.operation": options.operation,
        "vector.query": options.query,
        "vector.adapter": options.adapterName,
      },
    },
    parentContext,
  );
}

/**
 * End a vector search span
 */
export function endVectorSpan(options: {
  span: Span;
  results?: any;
}): void {
  if (options.results) {
    options.span.setAttribute(
      "vector.results_count",
      Array.isArray(options.results) ? options.results.length : 0,
    );
  }
  options.span.setStatus({ code: SpanStatusCode.OK });
  options.span.end();
}
