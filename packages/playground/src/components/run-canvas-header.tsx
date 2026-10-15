import type { Span, Trace } from "../lib/api";
import type { workflowHistory } from "../lib/workflow-history";
import { RunContinuation } from "./run-continuation";
import { RunSummary } from "./run-summary";
import { TraceNavigator } from "./trace-navigator";
import { WorkflowHistoryNotice } from "./workflow-history";

export function RunCanvasHeader({
  trace,
  displayTrace,
  history,
  ancestorError,
  onSelectRun,
  onInspect,
  showSearch,
  onCloseSteps,
  showHistory,
  focusedSpanId,
}: {
  trace?: Trace;
  displayTrace?: Trace;
  history: ReturnType<typeof workflowHistory>;
  ancestorError?: Error | null;
  onSelectRun: (trace: Trace) => void;
  onInspect: (span: Span) => void;
  showSearch: boolean;
  onCloseSteps: () => void;
  showHistory: boolean;
  focusedSpanId?: string;
}) {
  return (
    <>
      {trace && history.historical && (
        <WorkflowHistoryNotice
          currentStatus={history.currentStatus}
          latest={history.latest}
          onSelect={onSelectRun}
        />
      )}
      {trace && <RunSummary trace={trace} onInspect={onInspect} />}
      {displayTrace && <RunContinuation trace={displayTrace} onSelect={onSelectRun} />}
      {ancestorError && (
        <p className="notice">A linked trace is unavailable: {ancestorError.message}</p>
      )}
      {showSearch && displayTrace && (
        <TraceNavigator
          key={displayTrace.traceId}
          trace={
            showHistory
              ? displayTrace
              : {
                  ...displayTrace,
                  spans: displayTrace.spans.filter((span) => span.traceId === displayTrace.traceId),
                }
          }
          selectedId={focusedSpanId}
          onSelect={onInspect}
          onClose={onCloseSteps}
        />
      )}
    </>
  );
}
