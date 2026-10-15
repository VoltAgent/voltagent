import type { Entity, EntityKind, Span, Trace } from "../lib/api";
import type { RunNotes } from "../lib/run-notes";
import { type TestCase, caseFromTrace } from "../lib/test-cases";
import type { useTestCases } from "../lib/use-test-cases";
import type { Panel } from "./panel-tabs";
import { RunDebug } from "./run-debug";
import { RunReview } from "./run-review";

export function RunResultPanels({
  panel,
  entity,
  kind,
  trace,
  displayTrace,
  testCases,
  running,
  onInspect,
  onSave,
  onPrepare,
  onPanel,
  onRunner,
  shareUrl,
  notes,
  onNotes,
  traces,
}: {
  panel?: Panel;
  entity: Entity;
  kind: EntityKind;
  trace?: Trace;
  displayTrace?: Trace;
  testCases: ReturnType<typeof useTestCases>;
  running: boolean;
  onInspect: (span: Span) => void;
  onSave: () => void;
  onPrepare: (test: TestCase) => void;
  onPanel: (panel: Panel) => void;
  onRunner: () => void;
  shareUrl: string;
  notes: RunNotes;
  onNotes: (notes: RunNotes) => void;
  traces: Trace[];
}) {
  if (panel === "review" && trace)
    return (
      <RunReview
        trace={trace}
        baseline={testCases.comparison}
        running={running}
        onInspect={onInspect}
        onSave={onSave}
        onRepeat={() =>
          onPrepare({
            ...caseFromTrace(trace, kind, entity.id, testCases.draft),
            expectations: testCases.comparison?.expectations,
          })
        }
        onRunner={onRunner}
        onCompare={() => onPanel("compare")}
      />
    );
  if (panel === "compare" && displayTrace)
    return (
      <RunDebug
        embedded
        key={displayTrace.traceId}
        trace={displayTrace}
        shareUrl={shareUrl}
        caseBaseline={testCases.comparison}
        onSaveCase={!running ? onSave : undefined}
        note={notes[displayTrace.traceId]}
        onNote={(note) => onNotes({ ...notes, [displayTrace.traceId]: note })}
        traces={traces}
      />
    );
  if (panel === "run" && testCases.prepared && !trace)
    return (
      <div className="case-run-notice">
        <strong>Run again</strong>
        <p>
          Input and recorded overrides are loaded. Edit below, then run. The previous result is kept
          as the comparison baseline.
        </p>
        <small>
          {testCases.prepared.draft.source === "request"
            ? "Request captured in this browser."
            : "Reconstructed from trace data; unreported settings use current defaults."}{" "}
          Starts with a fresh user and conversation; external state is not restored.
        </small>
      </div>
    );
  return null;
}
