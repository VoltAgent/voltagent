import { useEffect, useState } from "react";
import type { EntityKind, Span } from "./api";
import { type LogRecord, mergeLogs, mergeSpan } from "./live";

export function useLiveObservability(entityId: string | undefined, kind: EntityKind) {
  const [state, setState] = useState<{
    key: string;
    spans: Span[];
    logs: LogRecord[];
    connected: boolean;
  }>({ key: "", spans: [], logs: [], connected: false });
  const key = `${kind}:${entityId}`;
  useEffect(() => {
    if (!entityId) return;
    let disposed = false;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout>;
    let attempts = 0;
    let dirty = false;
    let connected = false;
    const spans = new Map<string, Span>();
    let logs: LogRecord[] = [];
    const flush = () => {
      if (!dirty || disposed) return;
      dirty = false;
      setState({ key, spans: [...spans.values()], logs, connected });
    };
    const connect = () => {
      const url = new URL("/api/ws/observability", window.location.href);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.searchParams.set("entityId", entityId);
      url.searchParams.set("entityType", kind);
      socket = new WebSocket(url);
      socket.onopen = () => {
        connected = true;
        attempts = 0;
        dirty = true;
        flush();
      };
      socket.onmessage = ({ data }) => {
        try {
          const event = JSON.parse(data);
          if (event.type === "OBSERVABILITY_EVENT" && event.data?.span?.spanId) {
            const span = event.data.span as Span;
            const id = `${span.traceId}:${span.spanId}`;
            spans.set(id, mergeSpan(spans.get(id), span));
            while (spans.size > 5000) spans.delete(spans.keys().next().value as string);
          } else if (event.type === "OBSERVABILITY_LOG" && event.data?.timestamp)
            logs = mergeLogs([...logs, event.data as LogRecord]);
          dirty = true;
        } catch {
          /* Ignore malformed or non-observability frames. */
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        connected = false;
        dirty = true;
        flush();
        if (!disposed) retry = setTimeout(connect, Math.min(15_000, 1000 * 2 ** attempts++));
      };
    };
    connect();
    const interval = setInterval(flush, 100);
    return () => {
      disposed = true;
      clearTimeout(retry);
      clearInterval(interval);
      socket?.close();
    };
  }, [entityId, kind, key]);
  return state.key === key ? state : { spans: [], logs: [], connected: false };
}
