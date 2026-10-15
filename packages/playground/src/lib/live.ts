import { safeStringify } from "@voltagent/internal";
import type { EntityKind, Span, Trace } from "./api";

export interface LogRecord {
  timestamp: string;
  traceId?: string;
  spanId?: string;
  severityText?: string;
  severityNumber?: number;
  body: unknown;
  attributes?: Record<string, unknown>;
}

export function mergeSpan(previous: Span | undefined, next: Span): Span {
  if (!previous) return next;
  // Delayed start events or stale snapshots must not reopen a finished span.
  const newer =
    previous.endTime && (!next.endTime || previous.endTime > next.endTime) ? previous : next;
  const older = newer === next ? previous : next;
  return {
    ...older,
    ...newer,
    attributes: { ...older.attributes, ...newer.attributes },
    events: newer.events ?? older.events,
  };
}

export function mergeTraces(
  snapshot: Trace[],
  live: Span[],
  entityId: string,
  kind: EntityKind,
): Trace[] {
  const traces = new Map(
    snapshot.map((trace) => [
      trace.traceId,
      new Map(trace.spans.map((span) => [span.spanId, span])),
    ]),
  );
  const accepted = new Set(snapshot.map((trace) => trace.traceId));
  for (const span of live)
    if (
      !span.parentSpanId &&
      span.attributes["entity.id"] === entityId &&
      span.attributes["entity.type"] === kind
    )
      accepted.add(span.traceId);
  for (const span of live) {
    if (!accepted.has(span.traceId)) continue;
    const spans = traces.get(span.traceId) ?? new Map<string, Span>();
    spans.set(span.spanId, mergeSpan(spans.get(span.spanId), span));
    traces.set(span.traceId, spans);
  }
  return [...traces].map(([traceId, spans]) => ({
    traceId,
    spans: [...spans.values()],
    spanCount: spans.size,
  }));
}

export function mergeLogs(logs: LogRecord[]): LogRecord[] {
  const unique = new Map<string, LogRecord>();
  for (const log of logs)
    unique.set(
      safeStringify([
        log.timestamp,
        log.traceId,
        log.spanId,
        log.severityText,
        log.body,
        log.attributes,
      ]),
      log,
    );
  return [...unique.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-2000);
}

export function filterLogs(logs: LogRecord[], level: string, search: string) {
  return logs.filter(
    (log) =>
      (level === "all" || (log.severityText ?? "info").toLowerCase().startsWith(level)) &&
      safeStringify([log.body, log.attributes, log.spanId])
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
}

export function waterfallRows(trace: Trace, now: number) {
  const byId = new Map(trace.spans.map((span) => [span.spanId, span]));
  const start = Math.min(...trace.spans.map((span) => Date.parse(span.startTime)));
  const end = (span: Span) =>
    span.endTime
      ? Date.parse(span.endTime)
      : span.duration !== undefined
        ? Date.parse(span.startTime) + span.duration
        : now;
  const duration = Math.max(1, ...trace.spans.map((span) => end(span) - start));
  return [...trace.spans]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((span) => {
      let parent = span.parentSpanId;
      const seen = new Set([span.spanId]);
      while (parent && byId.has(parent) && !seen.has(parent)) {
        seen.add(parent);
        parent = byId.get(parent)?.parentSpanId;
      }
      return {
        span,
        depth: seen.size - 1,
        left: Math.max(0, ((Date.parse(span.startTime) - start) / duration) * 100),
        width: Math.max(0.3, ((end(span) - Date.parse(span.startTime)) / duration) * 100),
        duration: Math.max(0, end(span) - Date.parse(span.startTime)),
      };
    });
}
