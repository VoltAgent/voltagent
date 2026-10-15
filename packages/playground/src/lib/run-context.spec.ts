import { describe, expect, it } from "vitest";
import type { Trace } from "./api";
import { traceGraph } from "./graph";
import {
  linkedTrace,
  loadTraceAncestors,
  replayInput,
  selectActiveTrace,
  traceTarget,
  withCancelledExecutions,
} from "./run-context";

function trace(id: string, attributes: Record<string, unknown> = {}): Trace {
  return {
    traceId: id,
    spanCount: 1,
    spans: [
      {
        traceId: id,
        spanId: `${id}-root`,
        name: id,
        startTime: "2026-01-01T00:00:00Z",
        endTime: "2026-01-01T00:00:01Z",
        attributes,
        status: { code: 1 },
      },
    ],
  };
}
describe("historical run context", () => {
  it("loads a missing ancestor and stops a cyclic link before fetching the current trace", async () => {
    const current = trace("current", { "workflow.previous_trace_id": "previous" });
    const previous = trace("previous", { "workflow.previous_trace_id": "current" });
    const fetched: string[] = [];
    expect(
      await loadTraceAncestors(current, [], async (id) => {
        fetched.push(id);
        return previous;
      }),
    ).toEqual([previous]);
    expect(fetched).toEqual(["previous"]);
  });
  it("keeps live selection on the initiating conversation even if another run arrives", () => {
    const unrelated = trace("newer", { "conversation.id": "other", "user.id": "user" });
    const own = trace("own", { "conversation.id": "selected", "user.id": "user" });
    expect(
      selectActiveTrace([unrelated, own], undefined, undefined, {
        conversationId: "selected",
        userId: "user",
      }),
    ).toBe(own);
    expect(selectActiveTrace([unrelated], "missing")).toBeUndefined();
  });
  it("takes identity from the selected trace, never from a different execution", () => {
    expect(
      traceTarget(
        trace("old", {
          "conversation.id": "old-conversation",
          "user.id": "old-user",
          "workflow.execution.id": "old-execution",
        }),
      ),
    ).toEqual({
      conversationId: "old-conversation",
      userId: "old-user",
      executionId: "old-execution",
    });
    expect(traceTarget(trace("missing"))).toEqual({
      conversationId: undefined,
      userId: undefined,
      executionId: undefined,
    });
  });
  it("links only explicit ancestors, preserves original span identity and terminates cycles", () => {
    const first = trace("first");
    const resumed = trace("resumed", { "workflow.previous_trace_id": "first" });
    const replayed = trace("replayed", { "workflow.replay.source_trace_id": "resumed" });
    const combined = linkedTrace(replayed, [trace("unrelated"), first, resumed, replayed]) as Trace;
    expect(combined.spans.map((span) => span.traceId)).toEqual(["first", "resumed", "replayed"]);
    const graph = traceGraph(combined);
    expect(graph.edges.map((edge) => edge.label).sort()).toEqual(["Replay", "Resume"]);
    expect(graph.nodes[1].data.span?.parentSpanId).toBeUndefined();
    first.spans[0].attributes["workflow.previous_trace_id"] = "replayed";
    expect(linkedTrace(replayed, [first, resumed, replayed])?.spanCount).toBe(3);
  });
  it("uses recorded step inputs including falsy values and does not guess branch inputs", () => {
    const steps = [
      { id: "first", type: "then" },
      { id: "branch", type: "branch" },
    ];
    expect(
      replayInput({ status: "completed", input: { city: "Istanbul" } }, "first", steps),
    ).toEqual({ city: "Istanbul" });
    expect(
      replayInput(
        {
          status: "suspended",
          suspension: { checkpoint: { stepData: { branch: { input: false } } } },
        },
        "branch",
        steps,
      ),
    ).toBe(false);
    expect(
      replayInput(
        { status: "completed", events: [{ type: "step-start", from: "branch", input: 0 }] },
        "branch",
        steps,
      ),
    ).toBe(0);
    expect(
      replayInput({ status: "completed", input: { wrong: true } }, "branch", steps),
    ).toBeUndefined();
  });
});

it("applies saved cancellation only to the latest trace without rewriting the checkpoint", () => {
  const checkpoint = trace("checkpoint", {
    "workflow.execution.id": "execution",
    "workflow.state": "suspended",
  });
  const current = trace("current", {
    "workflow.execution.id": "execution",
    "workflow.state": "suspended",
  });
  current.spans[0].startTime = "2026-01-01T00:01:00Z";
  const unrelated = trace("unrelated", { "workflow.execution.id": "other" });
  const projected = withCancelledExecutions(
    [checkpoint, unrelated, current],
    [{ id: "execution", status: "cancelled" }],
  );
  expect(projected[0]).toBe(checkpoint);
  expect(projected[1]).toBe(unrelated);
  expect(projected[2].spans[0].attributes).toMatchObject({
    "workflow.state": "suspended",
    "playground.execution_status": "cancelled",
  });
  expect(current.spans[0].attributes["playground.execution_status"]).toBeUndefined();
});
