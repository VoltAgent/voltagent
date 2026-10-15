import { expect, it } from "vitest";
import type { Trace } from "./api";
import { workflowHistory } from "./workflow-history";

const trace = (id: string, execution = "same", date = "2026-10-13T12:00:00Z"): Trace => ({
  traceId: id,
  spanCount: 1,
  spans: [
    {
      spanId: id,
      traceId: id,
      name: "workflow",
      startTime: date,
      endTime: date,
      status: { code: 1 },
      attributes: { "workflow.execution.id": execution, "workflow.state": "suspended" },
    },
  ],
});
it("separates an old checkpoint from the resumed execution without changing its trace", () => {
  const first = trace("first");
  const last = trace("last", "same", "2026-10-13T13:00:00Z");
  expect(workflowHistory(first, [last, first], { status: "completed" })).toMatchObject({
    historical: true,
    latest: last,
  });
  expect(first.spans[0].attributes["workflow.state"]).toBe("suspended");
});
it("does not treat a separate replay as a resumed original execution", () => {
  const first = trace("first");
  expect(
    workflowHistory(first, [trace("replay", "another"), first], { status: "suspended" }).historical,
  ).toBe(false);
});
it("disables an outdated checkpoint even if the newer trace is unavailable", () => {
  const first = trace("first");
  expect(workflowHistory(first, [first], { status: "completed" })).toMatchObject({
    historical: true,
    latest: undefined,
  });
});

it("keeps a just-suspended runner mounted while the state query still reports running", () => {
  const checkpoint = trace("checkpoint");
  expect(workflowHistory(checkpoint, [checkpoint], { status: "running" }).historical).toBe(false);
  expect(workflowHistory(checkpoint, [checkpoint], { status: "suspended" }).historical).toBe(false);
  const resumed = trace("resumed", "same", "2026-10-13T13:00:00Z");
  expect(workflowHistory(checkpoint, [resumed, checkpoint], { status: "running" }).historical).toBe(
    true,
  );
});
