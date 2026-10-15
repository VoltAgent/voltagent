import type { Trace } from "./api";
import { previousTraceId, traceTarget } from "./run-context";
import { spanIO } from "./span-details";
import { runSummary, statusLabels, traceRoot } from "./trace-presentation";

export function historyGroups(
  traces: Trace[],
  grouped: boolean,
): Array<{ id: string; label: string; traces: Trace[] }> {
  if (!grouped) return [{ id: "all", label: "All runs", traces }];
  const groups = new Map<string, { id: string; label: string; traces: Trace[] }>();
  const byId = new Map(traces.map((trace) => [trace.traceId, trace]));
  for (const trace of traces) {
    const target = traceTarget(trace);
    let first = trace;
    const seen = new Set<string>([trace.traceId]);
    while (previousTraceId(first) && !seen.has(previousTraceId(first) as string)) {
      const id = previousTraceId(first) as string;
      seen.add(id);
      const parent = byId.get(id);
      if (!parent) break;
      first = parent;
    }
    const id = target.executionId
      ? `workflow/${first.traceId}`
      : target.conversationId
        ? `chat/${target.userId ?? ""}/${target.conversationId}`
        : trace.traceId;
    const label = target.executionId
      ? `Execution ${traceTarget(first).executionId?.slice(0, 8) ?? first.traceId.slice(0, 8)}`
      : target.conversationId
        ? `Conversation ${target.conversationId.slice(0, 8)}`
        : `Trace ${trace.traceId.slice(0, 8)}`;
    const group = groups.get(id) ?? { id, label, traces: [] };
    group.traces.push(trace);
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function recordedSettings(trace: Trace) {
  const root = traceRoot(trace);
  const keys = [
    "llm.model",
    "gen_ai.request.model",
    "ai.model.name",
    "llm.temperature",
    "ai.model.temperature",
    "llm.max_output_tokens",
    "voltagent.max_steps",
    "agent.instructions",
    "agent.context",
    "context",
    "llm.provider_options",
    "workflow.stateSnapshot",
  ];
  const pick = (attributes: Record<string, unknown>) =>
    Object.fromEntries(
      keys.filter((key) => attributes[key] !== undefined).map((key) => [key, attributes[key]]),
    );
  return {
    root: pick(root?.attributes ?? {}),
    modelCalls: trace.spans
      .filter(
        (span) =>
          span.traceId === trace.traceId && span.attributes["llm.provider_attempt"] === true,
      )
      .map((span) => ({ settings: pick(span.attributes) })),
  };
}

export function comparableRun(trace: Trace) {
  const summary = runSummary(trace);
  return {
    status: statusLabels[summary.status],
    duration: summary.duration,
    tokens: summary.tokens,
    tools: summary.tools,
    input: summary.root ? spanIO(summary.root).input : undefined,
    output: summary.root ? spanIO(summary.root).output : undefined,
    settings: recordedSettings(trace),
  };
}

/** Preserve telemetry exactly; browser-only waiting annotations are exported separately. */
export function debugTrace(trace: Trace) {
  return {
    ...trace,
    spans: trace.spans.map((span) => {
      const { "playground.pending_action": _pending, ...attributes } = span.attributes;
      return { ...span, attributes };
    }),
  };
}
