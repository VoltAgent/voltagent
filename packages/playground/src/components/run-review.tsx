import { ArrowRight, RotateCcw } from "lucide-react";
import type { Span, Trace } from "../lib/api";
import { runFindings } from "../lib/run-review";
import { spanIO } from "../lib/span-details";
import type { CaseBaseline } from "../lib/test-cases";
import { type CaseExpectations, checkRun } from "../lib/test-checks";
import { runSummary } from "../lib/trace-presentation";
import { DetailSection, RecordedValue } from "./recorded-value";

export function RunChecks({
  trace,
  expectations,
}: { trace: Trace; expectations?: CaseExpectations }) {
  const checks = checkRun(trace, expectations);
  if (!checks.length) return null;
  return (
    <details
      className="run-checks"
      aria-label="Test checks"
      open={checks.some((check) => check.status !== "passed")}
    >
      <summary>
        Test checks{" "}
        <span>
          {checks.filter((check) => check.status === "passed").length}/{checks.length} passed
        </span>
      </summary>
      {checks.map((check) => (
        <div className={`run-check ${check.status}`} key={check.label}>
          <strong>{check.label}</strong>
          <span>{check.status}</span>
          <small>{check.detail}</small>
        </div>
      ))}
    </details>
  );
}

export function RunReview({
  trace,
  baseline,
  running,
  onInspect,
  onRepeat,
  onSave,
  onRunner,
  onCompare,
}: {
  trace: Trace;
  baseline?: CaseBaseline;
  running: boolean;
  onInspect: (span: Span) => void;
  onRepeat: () => void;
  onSave: () => void;
  onRunner: () => void;
  onCompare: () => void;
}) {
  const summary = runSummary(trace);
  const findings = runFindings(trace);
  const { input, output } = summary.root
    ? spanIO(summary.root)
    : { input: undefined, output: undefined };
  const needsInput = ["suspended", "approval", "client-result"].includes(summary.status);
  const hasChecks = checkRun(trace, baseline?.expectations).length > 0;
  return (
    <section className="run-review" aria-label="Run result">
      <div className="review-heading">
        <h2>Result</h2>
        {needsInput ? (
          <button type="button" className="review-primary" onClick={onRunner}>
            {summary.status === "suspended" ? "Resume workflow" : "Review tool request"}
            <ArrowRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            className="review-primary"
            disabled={running || input === undefined}
            onClick={onRepeat}
            title="Prepare the recorded input in a fresh run; review before sending"
          >
            <RotateCcw size={13} /> Run again
          </button>
        )}
      </div>
      <div className="review-secondary-actions">
        <button
          type="button"
          onClick={onCompare}
          title={baseline ? `Baseline: ${baseline.name}` : undefined}
        >
          Compare runs
          {baseline && <span className="comparison-ready" aria-label="Baseline ready" />}
        </button>
        <button type="button" disabled={running || input === undefined} onClick={onSave}>
          Save test
        </button>
      </div>
      {hasChecks && (
        <div className="review-section">
          <RunChecks trace={trace} expectations={baseline?.expectations} />
        </div>
      )}
      <div className="review-section">
        <h3>Output</h3>
        {output === undefined ? (
          <p className="muted">
            {running
              ? "Waiting for output…"
              : "No output was recorded. Inspect the steps to see where execution ended."}
          </p>
        ) : (
          <RecordedValue value={output} />
        )}
      </div>
      {findings.length > 0 && (
        <div className="review-section">
          <h3>Needs attention</h3>
          <div className="run-findings">
            {findings.map((finding, index) => (
              <button
                type="button"
                className={`run-finding ${finding.tone}`}
                key={`${finding.span.spanId}-${index}`}
                onClick={() => onInspect(finding.span)}
              >
                <strong>
                  {finding.title}
                  <ArrowRight size={13} />
                </strong>
                <span>{finding.detail}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!summary.root && (
        <p className="notice">
          Root trace data is unavailable; the outcome cannot be determined yet.
        </p>
      )}
      <DetailSection title="Recorded input" value={input}>
        <RecordedValue value={input} />
      </DetailSection>
      {summary.root && (
        <button
          type="button"
          className="review-step-link"
          onClick={() => summary.root && onInspect(summary.root)}
        >
          Run details
          <ArrowRight size={13} />
        </button>
      )}
    </section>
  );
}
