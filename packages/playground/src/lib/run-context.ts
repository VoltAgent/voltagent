import type { RunTarget, Trace, WorkflowState, WorkflowStep } from "./api";

export function traceTarget(trace?: Trace): RunTarget {
  const root = trace?.spans.find((span) => !span.parentSpanId) ?? trace?.spans[0];
  const text = (key: string) =>
    typeof root?.attributes[key] === "string" ? (root.attributes[key] as string) : undefined;
  return {
    conversationId: text("conversation.id"),
    userId: text("user.id"),
    executionId: text("workflow.execution.id"),
  };
}

export function selectActiveTrace(
  traces: Trace[],
  traceId?: string,
  startedAt?: number,
  identity?: RunTarget,
): Trace | undefined {
  if (traceId) return traces.find((trace) => trace.traceId === traceId);
  return traces.find((trace) => {
    const target = traceTarget(trace);
    return (
      (!startedAt || trace.spans.some((span) => Date.parse(span.startTime) >= startedAt)) &&
      (!identity?.conversationId || target.conversationId === identity.conversationId) &&
      (!identity?.userId || target.userId === identity.userId) &&
      (!identity?.executionId || target.executionId === identity.executionId)
    );
  });
}

export function previousTraceId(trace: Trace): string | undefined {
  for (const span of trace.spans) {
    const id =
      span.attributes["workflow.previous_trace_id"] ??
      span.attributes["workflow.replay.source_trace_id"];
    if (typeof id === "string" && id !== trace.traceId) return id;
  }
}

export async function loadTraceAncestors(
  trace: Trace | undefined,
  available: Trace[],
  fetchTrace: (id: string) => Promise<Trace>,
): Promise<Trace[]> {
  const found: Trace[] = [];
  let current = trace;
  const seen = new Set<string>(trace ? [trace.traceId] : []);
  while (current && found.length < 20) {
    const id = previousTraceId(current);
    if (!id || seen.has(id)) break;
    seen.add(id);
    current = available.find((item) => item.traceId === id) ?? (await fetchTrace(id));
    found.push(current);
  }
  return found;
}

/** Only follow explicit ancestors; unrelated executions must never be merged. */
export function linkedTrace(trace: Trace | undefined, available: Trace[]): Trace | undefined {
  if (!trace) return undefined;
  const chain: Trace[] = [];
  const seen = new Set<string>();
  let current: Trace | undefined = trace;
  while (current && !seen.has(current.traceId)) {
    seen.add(current.traceId);
    chain.unshift(current);
    const parent = previousTraceId(current);
    current = available.find((item) => item.traceId === parent);
  }
  const spans = chain.flatMap((item) => item.spans);
  return { ...trace, spans, spanCount: spans.length };
}

export function workflowSteps(steps: WorkflowStep[] = []): WorkflowStep[] {
  return steps.flatMap((step) => [
    step,
    ...workflowSteps(step.subSteps),
    ...workflowSteps(step.nestedStep ? [step.nestedStep] : []),
  ]);
}

export function replayInput(
  state: WorkflowState | undefined,
  stepId: string,
  steps: WorkflowStep[],
): unknown {
  const checkpoint = state?.suspension?.checkpoint;
  const recorded = checkpoint?.stepData?.[stepId];
  if (recorded && recorded.input !== undefined) return recorded.input;
  const events = state?.events ?? [];
  const event = events.find(
    (item) => (item.from === stepId || item.name === stepId) && item.input !== undefined,
  );
  if (event) return event.input;
  const index = steps.findIndex((step) => step.id === stepId);
  if (index === 0) return state?.input ?? {};
  // Do not guess the previous output for a branch: only a recorded input is reliable.
  if (state?.suspension?.stepIndex === index && checkpoint?.stepExecutionState !== undefined)
    return checkpoint.stepExecutionState;
  return undefined;
}

/** Ended checkpoint spans stay historical; only the latest trace reflects persisted cancellation. */
export function withCancelledExecutions(
  traces: Trace[],
  states: Array<WorkflowState & { id: string }>,
): Trace[] {
  const cancelled = new Set(
    states.filter((state) => state.status === "cancelled").map((state) => state.id),
  );
  const latest = new Map<string, Trace>();
  for (const trace of traces) {
    const id = traceTarget(trace).executionId;
    if (!id || !cancelled.has(id)) continue;
    const previous = latest.get(id);
    const start = (item: Trace) => item.spans.find((span) => !span.parentSpanId)?.startTime ?? "";
    if (!previous || start(trace) > start(previous)) latest.set(id, trace);
  }
  return traces.map((trace) => {
    const id = traceTarget(trace).executionId;
    if (!id || latest.get(id) !== trace) return trace;
    return {
      ...trace,
      spans: trace.spans.map((span) =>
        !span.parentSpanId
          ? {
              ...span,
              attributes: { ...span.attributes, "playground.execution_status": "cancelled" },
            }
          : span,
      ),
    };
  });
}
