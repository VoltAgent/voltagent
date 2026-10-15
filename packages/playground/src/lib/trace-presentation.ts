import { type Span, type Trace, pretty } from "./api";
import { spanIO, tokenUsage } from "./span-details";

export type RunStatus =
  | "running"
  | "success"
  | "error"
  | "suspended"
  | "cancelled"
  | "skipped"
  | "approval"
  | "client-result";
export const statusLabels: Record<RunStatus, string> = {
  approval: "Awaiting approval",
  "client-result": "Awaiting client result",
  running: "Running",
  success: "Completed",
  error: "Failed",
  suspended: "Waiting to resume",
  cancelled: "Cancelled",
  skipped: "Skipped",
};

export function spanStatus(span: Span): RunStatus {
  const pending = span.attributes["playground.pending_action"] as
    | { approval?: string[]; client?: string[] }
    | undefined;
  if (span.attributes["playground.execution_status"] === "cancelled") return "cancelled";
  if (pending?.approval?.length) return "approval";
  if (pending?.client?.length) return "client-result";
  const state =
    span.attributes["workflow.step.state"] ??
    span.attributes["workflow.state"] ??
    span.attributes["llm.state"] ??
    span.attributes["agent.state"];
  if (state === "suspended" || state === "cancelled" || state === "skipped") return state;
  return span.status.code === 2 ? "error" : span.endTime ? "success" : "running";
}

export function spanKind(span: Span): string {
  return String(
    span.attributes["voltagent.type"] ??
      span.attributes["span.type"] ??
      span.attributes["entity.type"] ??
      span.name.split(".")[0],
  );
}

export function traceRoot(trace: Trace): Span | undefined {
  const own = trace.spans.filter((span) => span.traceId === trace.traceId);
  return own.find((span) => !span.parentSpanId);
}

export function spanDuration(span: Span, now = Date.now()): number {
  if (span.duration !== undefined) return Math.max(0, span.duration);
  const end = span.endTime ? Date.parse(span.endTime) : now;
  return Math.max(0, end - Date.parse(span.startTime)) || 0;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function modelCallNumber(span: Span, spans: Span[] = []): number | undefined {
  if (span.attributes["llm.provider_attempt"] !== true) return undefined;
  const calls = spans
    .filter(
      (item) =>
        item.attributes["llm.provider_attempt"] === true &&
        item.traceId === span.traceId &&
        item.parentSpanId === span.parentSpanId,
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    Math.max(
      0,
      calls.findIndex((item) => item.spanId === span.spanId),
    ) + 1
  );
}

export function spanLabel(span: Span, spans: Span[] = []): string {
  if (
    spanKind(span) === "llm" ||
    span.attributes["llm.operation"] ||
    span.attributes["llm.provider_attempt"] === true
  ) {
    const model =
      span.attributes["llm.model"] ??
      span.attributes["gen_ai.request.model"] ??
      span.attributes["ai.model.name"] ??
      span.attributes["model.name"];
    if (typeof model === "string" && model.trim()) return model;
    const call = modelCallNumber(span, spans);
    if (call !== undefined) return `Model call ${call}`;
    return "Model loop";
  }
  const label = String(
    span.attributes["workflow.step.name"] ??
      span.attributes["tool.display_name"] ??
      span.attributes["tool.name"] ??
      span.attributes["middleware.name"] ??
      span.attributes["eval.scorer.name"] ??
      span.attributes["voltagent.label"] ??
      span.attributes["span.label"] ??
      span.attributes["agent.name"] ??
      span.attributes["workflow.name"] ??
      span.name.replace(/^(agent|workflow)\./, ""),
  );
  const iteration = span.attributes["workflow.step.loop_iteration"];
  const item = span.attributes["workflow.step.parallel_index"];
  if (typeof iteration === "number") return `${label} · iteration ${iteration + 1}`;
  if (span.attributes["workflow.step.foreach"] === true && typeof item === "number")
    return `${label} · item ${item + 1}`;
  return label;
}

/** Collapse only known runtime bookkeeping. Unknown/custom and troubled spans stay visible. */
export function overviewSpans(trace: Trace) {
  const byId = new Map(trace.spans.map((span) => [span.spanId, span]));
  const hidden = new Set<string>();
  for (const span of trace.spans) {
    if (!span.parentSpanId || !byId.has(span.parentSpanId)) continue;
    if (["error", "suspended", "cancelled"].includes(spanStatus(span))) continue;
    const memory = spanKind(span) === "memory" && span.attributes["memory.semantic"] !== true;
    const wrapper =
      span.attributes["llm.operation"] &&
      span.attributes["llm.provider_attempt"] !== true &&
      trace.spans.some(
        (item) =>
          item.traceId === span.traceId &&
          item.attributes["llm.provider_attempt"] === true &&
          (item.parentSpanId === span.parentSpanId || item.parentSpanId === span.spanId),
      );
    if (memory || wrapper) hidden.add(span.spanId);
  }
  const visibleParent = (span: Span) => {
    let parent = span.parentSpanId;
    const seen = new Set([span.spanId]);
    while (parent && hidden.has(parent) && !seen.has(parent)) {
      seen.add(parent);
      parent = byId.get(parent)?.parentSpanId;
    }
    return parent && !seen.has(parent) ? parent : undefined;
  };
  const groups = new Map<string, Span[]>();
  for (const span of trace.spans) {
    if (!hidden.has(span.spanId)) continue;
    const owner = visibleParent(span);
    // Keep malformed/orphaned telemetry inspectable instead of dropping it.
    if (!owner || !byId.has(owner)) {
      hidden.delete(span.spanId);
      continue;
    }
    groups.set(owner, [...(groups.get(owner) ?? []), span]);
  }
  return {
    spans: trace.spans
      .filter((span) => !hidden.has(span.spanId))
      .map((span) => ({ ...span, parentSpanId: visibleParent(span) })),
    groups,
    hiddenCount: hidden.size,
  };
}

function decode(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function messageText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      if (part.type === "text" && typeof part.text === "string") return part.text;
      if (part.type === "file" || part.type === "image") return part.filename ?? "Attachment";
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

export function runPreview(trace: Trace): string | undefined {
  const root = traceRoot(trace);
  if (!root) return undefined;
  const input = decode(spanIO(root).input);
  if (input === undefined) return undefined;
  let text: string;
  if (
    Array.isArray(input) &&
    input.some((item) => item && typeof item === "object" && "role" in item)
  ) {
    const user = [...input].reverse().find((item) => item?.role === "user");
    // Do not present system instructions or an assistant response as the user's request.
    if (!user) return undefined;
    text = messageText(user.parts ?? user.content);
  } else {
    text = typeof input === "string" ? input : pretty(input);
  }
  const compact = text.replace(/\s+/g, " ").trim();
  return compact ? (compact.length > 180 ? `${compact.slice(0, 179)}…` : compact) : undefined;
}

/** Prefer the request; empty workflow input is better identified by its recorded result. */
export function runTitle(trace: Trace): string {
  const root = traceRoot(trace);
  const input = root ? decode(spanIO(root).input) : undefined;
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const key of ["message", "prompt", "query", "question", "task", "title", "topic"]) {
      const value = (input as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim())
        return value.replace(/\s+/g, " ").trim().slice(0, 180);
    }
  }
  const preview = runPreview(trace);
  if (preview && preview !== "{}" && preview !== "[]") return preview;
  const output = root ? decode(spanIO(root).output) : undefined;
  if (output !== undefined) {
    const text = pretty(output).replace(/\s+/g, " ").trim();
    if (text && text !== "{}" && text !== "[]") return `Result: ${text.slice(0, 120)}`;
  }
  const name = root?.attributes["workflow.name"];
  return typeof name === "string" && name ? name : root?.name || "Execution";
}

export function runSummary(trace: Trace, now = Date.now()) {
  const root = traceRoot(trace);
  const steps = root?.attributes["voltagent.step_count"];
  const limit = root?.attributes["voltagent.max_steps"];
  const stepLimit =
    root?.attributes["voltagent.stopped_by_max_steps"] === true &&
    typeof steps === "number" &&
    Number.isFinite(steps) &&
    typeof limit === "number" &&
    Number.isFinite(limit)
      ? { steps, limit }
      : undefined;
  const spans = trace.spans.filter((span) => span.traceId === trace.traceId);
  const overview = overviewSpans({ ...trace, spans }).spans;
  const parents = new Set(overview.map((span) => span.parentSpanId));
  const errors = spans.filter((span) => spanStatus(span) === "error");
  const byId = new Map(spans.map((span) => [span.spanId, span]));
  const errorParents = new Set<string>();
  for (const error of errors) {
    let parent = error.parentSpanId;
    const seen = new Set([error.spanId]);
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      errorParents.add(parent);
      parent = byId.get(parent)?.parentSpanId;
    }
  }
  const issue =
    errors.find(
      (span) => span.attributes["llm.provider_attempt"] === true && !errorParents.has(span.spanId),
    ) ??
    errors.find((span) => !errorParents.has(span.spanId)) ??
    errors[0];
  const longest = overview
    .filter((span) => span.spanId !== root?.spanId && !parents.has(span.spanId))
    .sort((a, b) => spanDuration(b, now) - spanDuration(a, now))[0];
  return {
    root,
    stepLimit,
    status: root ? spanStatus(root) : ("running" as const),
    duration: root ? spanDuration(root, now) : undefined,
    tokens: root ? tokenUsage(root).total : undefined,
    tools: spans.filter((span) => spanKind(span) === "tool").length,
    issue,
    rejectedTools: spans.filter((span) => span.attributes["tool.input.rejected"] === true).length,
    longest,
    preview: runPreview(trace),
  };
}

/** Match a specific call, never a same-named tool from a different step or conversation. */
export function toolCallSpan(trace: Trace | undefined, callId: string): Span | undefined {
  return trace?.spans.find((span) => span.attributes["tool.call.id"] === callId);
}
