import type { Trace } from "../lib/api";
import { spanIO } from "../lib/span-details";
import { runSummary } from "../lib/trace-presentation";
import { RecordedValue } from "./recorded-value";
import { StatusBadge } from "./run-status";

export function WorkflowHistoryNotice({
  currentStatus,
  latest,
  onSelect,
}: {
  currentStatus?: string;
  latest?: Trace;
  onSelect: (trace: Trace) => void;
}) {
  const label = currentStatus === "error" ? "failed" : currentStatus;
  return (
    <div className="history-notice" role="status">
      <div>
        <strong>Historical checkpoint</strong>
        <p>
          This trace shows an earlier state.{" "}
          {label ? `The execution is now ${label}.` : "A newer run is available."} Actions are
          available on the current run.
        </p>
      </div>
      {latest && (
        <button type="button" onClick={() => onSelect(latest)}>
          Open current run
        </button>
      )}
    </div>
  );
}

export function HistoricalWorkflow({ trace }: { trace: Trace }) {
  const { root, status } = runSummary(trace);
  const { input, output } = root ? spanIO(root) : {};
  return (
    <section className="runner historical-workflow">
      <div className="panel-heading">
        <h2>Recorded checkpoint</h2>
        <StatusBadge status={status} />
      </div>
      <div className="utility-body">
        <p className="muted">Read-only values from this trace, before the execution continued.</p>
        <h3>Input</h3>
        <RecordedValue value={input} />
        <h3>Output at this checkpoint</h3>
        <RecordedValue value={output} />
      </div>
    </section>
  );
}
