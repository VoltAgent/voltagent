import type { Trace } from "../lib/api";
import { decorateGraph } from "../lib/graph-decorations";
import { previousTraceId } from "../lib/run-context";
import { traceRoot } from "../lib/trace-presentation";
import { RecordedValue } from "./recorded-value";

/** Lifecycle metadata is available without competing with operation cards. */
export function RunContinuation({
  trace,
  onSelect,
}: { trace: Trace; onSelect: (trace: Trace) => void }) {
  const root = traceRoot(trace);
  const previousId = previousTraceId(trace);
  if (!root || !previousId) return null;
  const previousSpans = trace.spans.filter((span) => span.traceId === previousId);
  const transition = decorateGraph(trace, {
    nodes: [
      {
        id: root.spanId,
        position: { x: 0, y: 0 },
        data: { label: root.name, kind: "workflow", span: root, detail: root.attributes },
      },
    ],
    edges: [],
  }).nodes.find((node) => node.data.kind === "transition");
  return (
    <details className="run-continuation">
      <summary>
        {root.attributes["workflow.replay.source_trace_id"]
          ? "Replayed from a previous run"
          : "Continued from a previous run"}
      </summary>
      <div>
        <p className="muted">
          The duration above covers only this segment. Previous model calls and waiting time are
          excluded.
        </p>
        <button
          type="button"
          disabled={!previousSpans.length}
          onClick={() =>
            onSelect({ traceId: previousId, spans: previousSpans, spanCount: previousSpans.length })
          }
        >
          Open previous run
        </button>
        {!previousSpans.length && <p className="muted">Previous trace is unavailable.</p>}
        <details>
          <summary>Technical details</summary>
          <RecordedValue value={transition?.data.detail} />
        </details>
      </div>
    </details>
  );
}
