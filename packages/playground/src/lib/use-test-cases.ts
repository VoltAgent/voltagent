import { useCallback, useEffect, useRef, useState } from "react";
import type { Trace } from "./api";
import { useStoredState } from "./storage";
import type { CaseBaseline, RunDraft, TestCase } from "./test-cases";
import { spanStatus, traceRoot } from "./trace-presentation";

export function useTestCases(trace?: Trace) {
  const [cases, setCases] = useStoredState<TestCase[]>("test-cases", []);
  const [editing, setEditing] = useState<TestCase>();
  const [prepared, setPrepared] = useState<{ test: TestCase; draft: RunDraft }>();
  const [comparisons, setComparisons] = useStoredState<Record<string, CaseBaseline>>(
    "run-comparisons",
    {},
  );
  const [drafts, setDrafts] = useState(new Map<string, RunDraft>());
  const selectedTraceId = useRef(trace?.traceId);
  selectedTraceId.current = trace?.traceId;
  const pending = useRef<
    { draft: RunDraft; since: number; previousId?: string; baseline?: CaseBaseline } | undefined
  >(undefined);
  const preparedRef = useRef(prepared);
  const consumed = useRef<typeof prepared>(undefined);
  preparedRef.current = prepared;
  const capture = useCallback((draft?: RunDraft) => {
    pending.current = draft
      ? {
          draft,
          since: Date.now() - 100,
          previousId: selectedTraceId.current,
          baseline:
            preparedRef.current !== consumed.current
              ? preparedRef.current && {
                  ...preparedRef.current.test.baseline,
                  expectations: preparedRef.current.test.expectations,
                }
              : undefined,
        }
      : undefined;
    // Keep the runner mounted with its prepared input while the request starts.
    consumed.current = preparedRef.current;
  }, []);
  useEffect(() => {
    const request = pending.current;
    const started = trace && Date.parse(traceRoot(trace)?.startTime ?? "");
    if (
      !request ||
      !trace ||
      trace.traceId === request.previousId ||
      !started ||
      started < request.since
    )
      return;
    setDrafts((previous) => new Map([...previous, [trace.traceId, request.draft]]));
    if (request.baseline)
      setComparisons(
        Object.fromEntries([
          ...Object.entries(comparisons)
            .filter(([id]) => id !== trace.traceId)
            .slice(-49),
          [trace.traceId, request.baseline as CaseBaseline],
        ]),
      );
    pending.current = undefined;
  }, [trace, comparisons, setComparisons]);
  const clear = () => {
    setPrepared(undefined);
    pending.current = undefined;
  };
  const root = trace && traceRoot(trace);
  return {
    cases,
    setCases,
    editing,
    setEditing,
    prepared,
    setPrepared,
    capture,
    clear,
    draft: trace ? drafts.get(trace.traceId) : undefined,
    comparison:
      trace && root && spanStatus(root) !== "running" ? comparisons[trace.traceId] : undefined,
  };
}
