// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import type { Trace } from "./api";
import { readStoredState } from "./storage";
import { caseFromTrace, freshCaseDraft } from "./test-cases";
import type { CaseBaseline } from "./test-cases";
import { useTestCases } from "./use-test-cases";

it("binds the baseline only to the next new completed trace, not the currently selected or following run", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  const make = (id: string, running = false): Trace => ({
    traceId: id,
    spanCount: 1,
    spans: [
      {
        traceId: id,
        spanId: id,
        name: "workflow",
        startTime: new Date().toISOString(),
        endTime: running ? undefined : new Date().toISOString(),
        status: { code: running ? 0 : 1 },
        attributes: { input: false, output: 0 },
      },
    ],
  });
  const previous = make("previous");
  const test = caseFromTrace(previous, "workflow", "entity");
  test.expectations = { status: "success", outputIncludes: "0" };
  let state!: ReturnType<typeof useTestCases>;
  function Harness({ trace }: { trace: Trace }) {
    state = useTestCases(trace);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  const render = (trace: Trace) => act(async () => root.render(createElement(Harness, { trace })));
  try {
    await render(previous);
    const draft = freshCaseDraft(test);
    await act(async () => state.setPrepared({ test, draft }));
    await act(async () => state.capture(draft));
    await render({ ...previous });
    expect(state.comparison).toBeUndefined();
    await render(make("new", true));
    expect(state.comparison).toBeUndefined();
    expect(state.draft).toEqual(draft);
    await render(make("new"));
    expect(state.comparison?.traceId).toBe("previous");
    expect(state.comparison?.expectations).toEqual(test.expectations);
    expect(
      readStoredState<Record<string, CaseBaseline>>("run-comparisons", {}).new?.expectations,
    ).toEqual(test.expectations);
    await act(async () => state.capture(draft));
    await render(make("follow-up"));
    expect(state.comparison).toBeUndefined();
    expect(state.cases).toEqual([]);
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
