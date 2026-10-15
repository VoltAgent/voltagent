import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type Trace, api, pretty } from "../lib/api";
import { type GraphData, spanStatus, traceGraph } from "../lib/graph";
import { type LogRecord, filterLogs, mergeLogs, waterfallRows } from "../lib/live";
import { statusLabels } from "../lib/trace-presentation";
import { StatusIcon } from "./run-status";

export function Waterfall({
  trace,
  onSelect,
  selectedSpanId,
}: { trace: Trace; onSelect: (data: GraphData) => void; selectedSpanId?: string }) {
  const [now, setNow] = useState(Date.now());
  const active = trace.spans.some((span) => !span.endTime);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [active]);
  const nodes = new Map(traceGraph(trace).nodes.map((node) => [node.id, node.data]));
  const rows = waterfallRows(trace, now);
  return (
    <div className="waterfall">
      <div className="waterfall-heading">
        <span>Span / operation</span>
        <span>Elapsed time →</span>
      </div>
      {rows.map(({ span, depth, left, width, duration }) => (
        <button
          type="button"
          className={`waterfall-row ${selectedSpanId === span.spanId ? "selected" : ""}`}
          key={span.spanId}
          onClick={() => {
            const data = nodes.get(span.spanId);
            if (data) onSelect(data);
          }}
        >
          <span
            className="waterfall-label"
            style={{ paddingLeft: 12 + Math.min(depth, 8) * 12 }}
            title={`${span.name} · ${statusLabels[spanStatus(span)]}`}
          >
            <span className={`waterfall-status ${spanStatus(span)}`}>
              <StatusIcon status={spanStatus(span)} />
              <span>{nodes.get(span.spanId)?.label}</span>
            </span>
            <small className={spanStatus(span)}>{statusLabels[spanStatus(span)]}</small>
          </span>
          <span className="waterfall-track">
            <span
              className={`waterfall-bar ${spanStatus(span)}`}
              style={{ left: `${left}%`, width: `${Math.min(100 - left, width)}%` }}
            />
            <span className="waterfall-duration">
              {Math.round(duration)} ms{!span.endTime ? " · live" : ""}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function TraceLogs({
  trace,
  live,
  onSelect,
  selectedSpanId,
}: {
  trace?: Trace;
  live: LogRecord[];
  onSelect: (data: GraphData) => void;
  selectedSpanId?: string;
}) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const traceIds = [...new Set(trace?.spans.map((span) => span.traceId) ?? [])].sort();
  const logs = useQuery({
    queryKey: ["trace-logs", ...traceIds],
    queryFn: async () =>
      (
        await Promise.all(
          traceIds.map((id) =>
            api<{ logs: LogRecord[] }>(`/observability/traces/${encodeURIComponent(id)}/logs`),
          ),
        )
      ).flatMap((result) => result.logs),
    enabled: traceIds.length > 0,
    refetchInterval: 3000,
  });
  const rows = filterLogs(
    mergeLogs([
      ...(logs.data ?? []),
      ...live.filter((log) => log.traceId && traceIds.includes(log.traceId)),
    ]),
    level,
    search,
  ).filter((log) => !selectedOnly || !selectedSpanId || log.spanId === selectedSpanId);
  const nodes = new Map(trace ? traceGraph(trace).nodes.map((node) => [node.id, node.data]) : []);
  return (
    <div className="trace-logs">
      <div className="log-toolbar">
        <strong>
          Trace logs <span>{rows.length}</span>
        </strong>
        {selectedSpanId && (
          <button
            type="button"
            className={selectedOnly ? "active" : ""}
            aria-pressed={selectedOnly}
            onClick={() => setSelectedOnly(!selectedOnly)}
          >
            Selected step only
          </button>
        )}
        <input
          aria-label="Search logs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search messages, attributes…"
        />
        <select
          aria-label="Log severity"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          {["all", "trace", "debug", "info", "warn", "error", "fatal"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {logs.error && <p className="error">{logs.error.message}</p>}
      <div className="log-rows">
        {rows.map((log, index) => (
          <details
            key={`${log.timestamp}-${index}`}
            className={selectedSpanId && log.spanId === selectedSpanId ? "selected" : ""}
          >
            <summary>
              <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
              <span className={`log-level ${(log.severityText ?? "info").toLowerCase()}`}>
                {log.severityText ?? "INFO"}
              </span>
              <span>{typeof log.body === "string" ? log.body : pretty(log.body)}</span>
            </summary>
            {log.spanId && nodes.has(log.spanId) && (
              <button
                type="button"
                onClick={() => onSelect(nodes.get(log.spanId as string) as GraphData)}
              >
                Inspect span
              </button>
            )}
            <pre>{pretty(log)}</pre>
          </details>
        ))}
        {rows.length === 0 && (
          <p className="muted">
            {trace
              ? selectedOnly && selectedSpanId
                ? "No matching logs for this step. Turn off Selected step only to see trace-wide logs."
                : "No matching logs for this trace."
              : "Select a run to view its logs."}
          </p>
        )}
      </div>
    </div>
  );
}
