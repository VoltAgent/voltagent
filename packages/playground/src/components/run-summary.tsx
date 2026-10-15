import { ArrowUpRight, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Span, Trace } from "../lib/api";
import { isRaceWinner, recoveries, recoveryText } from "../lib/execution-insights";
import { type PendingAction, actionText } from "../lib/pending-action";
import { previousTraceId } from "../lib/run-context";
import {
  formatDuration,
  runSummary,
  spanDuration,
  spanLabel,
  spanStatus,
  statusLabels,
} from "../lib/trace-presentation";
import { StatusIcon } from "./run-status";

export function RunSummary({
  trace,
  onInspect,
  onAction,
}: { trace: Trace; onInspect: (span: Span) => void; onAction?: () => void }) {
  const [now, setNow] = useState(Date.now());
  const summary = runSummary(trace, now);
  const pending = summary.root?.attributes["playground.pending_action"] as
    | PendingAction
    | undefined;
  const recovered = recoveries(trace);
  const recoveredIssue = recovered.find((item) =>
    item.failed.some((span) => span.spanId === summary.issue?.spanId),
  );
  const winners = trace.spans.filter((span) => isRaceWinner(span, trace));
  const skipped = trace.spans.filter((span) => spanStatus(span) === "skipped");
  const active = summary.status === "running";
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  return (
    <section className="run-summary" aria-label="Run summary">
      <div className="run-summary-main">
        <strong className={`run-outcome ${summary.status}`}>
          <StatusIcon status={summary.status} size={15} />
          {statusLabels[summary.status]}
        </strong>
        {summary.stepLimit && summary.root && (
          <button
            type="button"
            className="run-limit"
            title="The runtime stopped at the configured model-step limit. Inspect the recorded limit."
            onClick={() => summary.root && onInspect(summary.root)}
          >
            Step limit reached · {summary.stepLimit.steps}/{summary.stepLimit.limit}
            <ArrowUpRight size={12} />
          </button>
        )}
        <span
          title={
            previousTraceId(trace)
              ? "Time for this resumed or replayed segment; excludes previous runs and time waiting."
              : "Execution duration"
          }
        >
          <Clock3 size={13} />{" "}
          {summary.duration === undefined ? "—" : formatDuration(summary.duration)}
          {previousTraceId(trace) ? " this segment" : ""}
        </span>

        {summary.tools > 0 && (
          <span>
            {summary.tools} tool {summary.tools === 1 ? "call" : "calls"}
          </span>
        )}
        {summary.rejectedTools > 0 && (
          <span>{summary.rejectedTools} tool input rejected · not executed</span>
        )}
        {summary.tokens !== undefined && (
          <span title="Recorded token usage on the root operation; not per-call context estimates.">
            Run total · {summary.tokens.toLocaleString()} tokens
          </span>
        )}
        {summary.root && (
          <time title={new Date(summary.root.startTime).toLocaleString()}>
            {new Date(summary.root.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </time>
        )}
        {summary.longest && (
          <details className="run-timing">
            <summary>Metrics</summary>
            <div className="run-metrics-body">
              <p>{trace.spanCount} recorded spans</p>
              <button type="button" onClick={() => summary.longest && onInspect(summary.longest)}>
                Longest step: {spanLabel(summary.longest, trace.spans)} ·{" "}
                {formatDuration(spanDuration(summary.longest, now))}
                <ArrowUpRight size={12} />
              </button>
            </div>
          </details>
        )}
        {summary.issue && (
          <button
            type="button"
            className="run-issue"
            onClick={() => summary.issue && onInspect(summary.issue)}
          >
            {summary.status === "error"
              ? "Go to error"
              : recoveredIssue
                ? `${recoveredIssue.kind} recovered · inspect attempt`
                : "Inspect recorded error"}{" "}
            <ArrowUpRight size={13} />
          </button>
        )}
      </div>
      {(winners.length > 0 || skipped.length > 0) && (
        <div className="run-decisions">
          {winners.map((winner) => (
            <button
              type="button"
              className="quiet-button"
              key={winner.spanId}
              onClick={() => onInspect(winner)}
            >
              Race winner: {spanLabel(winner, trace.spans)} <ArrowUpRight size={12} />
            </button>
          ))}
          {skipped.length > 0 && (
            <button type="button" className="quiet-button" onClick={() => onInspect(skipped[0])}>
              {skipped.length} skipped {skipped.length === 1 ? "step" : "steps"}{" "}
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      )}
      {recovered.map((item) => (
        <button
          type="button"
          className="run-recovery"
          key={item.succeeded.spanId}
          onClick={() => onInspect(item.succeeded)}
        >
          {recoveryText(item)} <ArrowUpRight size={13} />
        </button>
      ))}
      {summary.status === "suspended" && onAction && (
        <button type="button" className="pending-action" onClick={onAction}>
          Resume workflow <ArrowUpRight size={13} />
        </button>
      )}
      {pending && onAction && (
        <button type="button" className="pending-action" onClick={onAction}>
          {actionText(pending)} · Open chat <ArrowUpRight size={13} />
        </button>
      )}
    </section>
  );
}
