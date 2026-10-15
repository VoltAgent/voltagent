import type { Trace, WorkflowState } from "./api";
import { traceTarget } from "./run-context";
import { spanStatus, traceRoot } from "./trace-presentation";

export function workflowHistory(trace?: Trace, traces: Trace[] = [], state?: WorkflowState) {
  const executionId = traceTarget(trace).executionId;
  const latest = executionId
    ? [...traces, ...(trace ? [trace] : [])]
        .filter((item) => traceTarget(item).executionId === executionId)
        .sort((a, b) =>
          (traceRoot(b)?.startTime ?? "").localeCompare(traceRoot(a)?.startTime ?? ""),
        )[0]
    : undefined;
  const root = trace && traceRoot(trace);
  // Polling may still report running after a live span has reached its checkpoint.
  // Only a terminal state or a newer trace proves the checkpoint is historical.
  const movedOn =
    root &&
    spanStatus(root) === "suspended" &&
    state &&
    ["completed", "error", "cancelled"].includes(state.status);
  return {
    historical: Boolean(trace && ((latest && latest.traceId !== trace.traceId) || movedOn)),
    latest: latest?.traceId !== trace?.traceId ? latest : undefined,
    currentStatus: state?.status,
  };
}
