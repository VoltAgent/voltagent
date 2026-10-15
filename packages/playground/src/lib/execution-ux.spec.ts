import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { Span, Trace } from "./api";
import {
  descendantIds,
  displaySpanStatus,
  isCancelledCheckpoint,
  recoveries,
  spanExplanations,
} from "./execution-insights";
import { traceGraph } from "./graph";
import { conversationKey, pendingAction, withPendingActions } from "./pending-action";
import { comparableRun, debugTrace, historyGroups } from "./run-debug";
import { spanLabel, spanStatus } from "./trace-presentation";

function span(id: string, attributes: Record<string, unknown> = {}, parentSpanId?: string): Span {
  return {
    spanId: id,
    traceId: "run",
    name: id,
    attributes,
    parentSpanId,
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-01T00:00:00.100Z",
    status: { code: 1 },
  };
}
const trace = (...spans: Span[]): Trace => ({
  traceId: spans[0]?.traceId ?? "run",
  spans,
  spanCount: spans.length,
});

describe("conversation actions", () => {
  const message = (state: string): UIMessage => ({
    id: "message",
    role: "assistant",
    parts: [{ type: "tool-book", toolCallId: "book", state, input: {} }] as UIMessage["parts"],
  });
  it("distinguishes approval and client results, excludes completed or historical tools", () => {
    expect(pendingAction([message("approval-requested")])).toEqual({
      approval: ["book"],
      client: [],
    });
    expect(pendingAction([message("input-available")])).toEqual({ approval: [], client: ["book"] });
    for (const state of ["output-available", "output-error", "output-denied", "approval-responded"])
      expect(pendingAction([message(state)])).toBeUndefined();
    expect(
      pendingAction([message("approval-requested"), { id: "user", role: "user", parts: [] }]),
    ).toBeUndefined();
  });
  it("annotates only the latest request in the matching agent/user/conversation, preserving telemetry", () => {
    const attributes = { "entity.id": "agent", "user.id": "u", "conversation.id": "c" };
    const old = trace(span("old", attributes));
    const latest = trace({ ...span("new", attributes), startTime: "2026-01-02T00:00:00Z" });
    const other = trace(span("other", { ...attributes, "user.id": "another" }));
    const actions = {
      [conversationKey({ agentId: "agent", userId: "u", conversationId: "c" })]: {
        approval: ["book"],
        client: [],
      },
    };
    const output = withPendingActions([old, latest, other], actions);
    expect(output.map((item) => spanStatus(item.spans[0]))).toEqual([
      "success",
      "approval",
      "success",
    ]);
    expect(spanStatus(latest.spans[0])).toBe("success");
    expect(debugTrace(output[1])).toEqual(latest);
    expect(spanStatus(withPendingActions([latest], {})[0].spans[0])).toBe("success");
    latest.spans[0].status.code = 2;
    expect(spanStatus(withPendingActions([latest], actions)[0].spans[0])).toBe("error");
  });
});

describe("explaining execution", () => {
  it("distinguishes recovered retries/fallbacks from terminal failures and other invocations", () => {
    const attrs = { "llm.provider_attempt": true, "llm.model_index": 0, "llm.attempt": 1 };
    const failed = { ...span("failed", attrs, "root"), status: { code: 2 } };
    const succeeded = {
      ...span("ok", { ...attrs, "llm.attempt": 2 }, "root"),
      startTime: "2026-01-01T00:00:01Z",
    };
    expect(recoveries(trace(failed, succeeded))[0]?.kind).toBe("Retry");
    expect(spanExplanations(failed, trace(failed, succeeded)).join()).toContain(
      "Recovered by Model call 2",
    );
    succeeded.attributes["llm.model_index"] = 1;
    expect(recoveries(trace(failed, succeeded))[0]?.kind).toBe("Fallback");
    expect(recoveries(trace(failed))).toEqual([]);
    expect(recoveries(trace(failed, { ...succeeded, parentSpanId: "subagent" }))).toEqual([]);
    succeeded.attributes["llm.model_index"] = 0;
    succeeded.attributes["llm.attempt"] = 1;
    expect(recoveries(trace(failed, succeeded))).toEqual([]);
  });
  it("explains skipped steps, race winner, bail and one-based iteration/item labels", () => {
    const parent = span("race", { "workflow.step.type": "parallel-race" });
    const winner = span("cache", {}, "race");
    const skipped = span(
      "slow",
      {
        "workflow.step.state": "skipped",
        "workflow.step.skipped_reason": "Another step settled the race",
      },
      "race",
    );
    expect(spanExplanations(winner, trace(parent, winner, skipped)).join()).toContain(
      "Won the race",
    );
    expect(spanExplanations(skipped).join()).toContain("Another step settled the race");
    expect(
      spanExplanations(
        winner,
        trace(parent, winner, span("also-finished", {}, "race"), skipped),
      ).join(),
    ).not.toContain("Won the race");
    expect(spanExplanations(span("bail", { "workflow.bailed": true })).join()).toContain(
      "Ended early",
    );
    expect(spanExplanations(span("iteration", { "workflow.step.loop_iteration": 2 }))).toContain(
      "Loop iteration 3",
    );
    expect(spanLabel(span("increment", { "workflow.step.loop_iteration": 0 }))).toBe(
      "increment · iteration 1",
    );
    expect(
      spanLabel(
        span("double", { "workflow.step.foreach": true, "workflow.step.parallel_index": 2 }),
      ),
    ).toBe("double · item 3");
  });
  it("collapses groups without losing failure counts, then restores their descendants", () => {
    const root = span("root");
    const loop = span("loop", {}, "root");
    const failed = { ...span("failed", {}, "loop"), status: { code: 2 } };
    const child = span("child", {}, "failed");
    const run = trace(root, loop, failed, child);
    const collapsed = traceGraph(run, [], "all", new Set(["loop"]));
    expect(collapsed.nodes.map((node) => node.id)).toEqual(["root", "loop"]);
    expect(collapsed.nodes[1].data.groupSummary).toContain("1 Failed");
    expect(collapsed.nodes[1].data.collapsedCount).toBe(2);
    expect(traceGraph(run).nodes).toHaveLength(4);
    expect(run.spans).toHaveLength(4);
    expect(descendantIds([span("a", {}, "b"), span("b", {}, "a")], "a")).toEqual(new Set(["b"]));
  });
  it("groups explicit resume/replay chains without combining unrelated executions", () => {
    const first = trace({
      ...span("first", { "workflow.execution.id": "execution1" }),
      traceId: "first",
    });
    const second = trace({
      ...span("second", {
        "workflow.execution.id": "execution2",
        "workflow.replay.source_trace_id": "first",
      }),
      traceId: "second",
    });
    const unrelated = trace(span("other", { "workflow.execution.id": "other" }));
    expect(
      historyGroups([second, unrelated, first], true).map((group) => group.traces.length),
    ).toEqual([2, 1]);
    const zero = trace(span("zero", { input: 0, output: false }));
    expect(comparableRun(zero)).toMatchObject({ input: 0, output: false });
  });
});

it("explains saved checkpoints after cancellation without changing their recorded status", () => {
  const root = span("root", {
    "span.type": "workflow",
    "playground.execution_status": "cancelled",
  });
  const step = span(
    "review",
    { "span.type": "workflow-step", "workflow.step.state": "suspended" },
    "root",
  );
  const data = trace(root, step);
  expect(spanStatus(step)).toBe("suspended");
  expect(isCancelledCheckpoint(step, data)).toBe(true);
  expect(displaySpanStatus(step, data)).toBe("Paused checkpoint");
  expect(displaySpanStatus(root, data)).toBe("Cancelled");
  expect(spanExplanations(step, data).join(" ")).toContain("no longer waiting to resume");
  expect(isCancelledCheckpoint({ ...step, traceId: "previous" }, data)).toBe(false);
  expect(spanStatus(step)).toBe("suspended");
});
