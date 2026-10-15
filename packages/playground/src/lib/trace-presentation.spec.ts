import { describe, expect, it } from "vitest";
import type { Span, Trace } from "./api";
import { traceGraph } from "./graph";
import {
  overviewSpans,
  runPreview,
  runSummary,
  runTitle,
  spanStatus,
  toolCallSpan,
} from "./trace-presentation";

function span(id: string, attributes: Record<string, unknown> = {}, parent = "root"): Span {
  return {
    spanId: id,
    traceId: "run",
    name: id,
    parentSpanId: id === "root" ? undefined : parent,
    startTime: "2026-01-01T00:00:00Z",
    endTime: "2026-01-01T00:00:01Z",
    duration: 1000,
    attributes,
    status: { code: 1 },
  };
}
const trace = (spans: Span[]): Trace => ({ traceId: "run", spans, spanCount: spans.length });

describe("readable execution overview", () => {
  it("shows a step limit only when the runtime explicitly records reaching it", () => {
    const root = span("root", {
      "voltagent.step_count": 2,
      "voltagent.max_steps": 2,
    });
    expect(runSummary(trace([root])).stepLimit).toBeUndefined();
    root.attributes["voltagent.stopped_by_max_steps"] = true;
    expect(runSummary(trace([root])).stepLimit).toEqual({ steps: 2, limit: 2 });
  });
  it("collapses bookkeeping while keeping every original span inspectable and its parent unchanged", () => {
    const root = span("root", { "entity.type": "agent" });
    const memory = span("memory", { "span.type": "memory" });
    const loop = span("loop", { "span.type": "llm", "llm.operation": "streamText" });
    const model = span("model", { "span.type": "llm", "llm.provider_attempt": true }, "loop");
    const tool = span("tool", { "span.type": "tool" }, "memory");
    const run = trace([root, memory, loop, model, tool]);
    const graph = traceGraph(run, [], "overview");
    expect(graph.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(["root", "model", "tool"]),
    );
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes.find((node) => node.id === "root")?.data.internalSpans).toEqual([
      memory,
      loop,
    ]);
    expect(graph.nodes.find((node) => node.id === "model")?.data.span).toBe(model);
    expect(model.parentSpanId).toBe("loop");
    expect(traceGraph(run).nodes).toHaveLength(5);
    expect(graph.edges.every((edge) => edge.ariaLabel === "Time order, not a dependency")).toBe(
      true,
    );
  });

  it("always exposes failing memory, paused work, guardrails and custom spans", () => {
    const failed = span("failed", { "span.type": "memory" });
    failed.status = { code: 2, message: "Storage unavailable" };
    const run = trace([
      span("root"),
      failed,
      span("paused", { "span.type": "memory", "workflow.step.state": "suspended" }),
      span("guard", { "span.type": "guardrail", "guardrail.action": "block" }),
      span("search", { "span.type": "memory", "memory.semantic": true }),
      span("custom", { "span.type": "my-operation" }),
    ]);
    expect(overviewSpans(run).hiddenCount).toBe(0);
    expect(runSummary(run).issue).toBe(failed);
  });

  it("keeps a model operation visible when the provider does not emit attempts", () => {
    const run = trace([span("root"), span("loop", { "llm.operation": "generateText" })]);
    expect(overviewSpans(run).spans).toHaveLength(2);
  });

  it("keeps orphaned and cyclic telemetry reachable", () => {
    const run = trace([
      span("orphan", { "span.type": "memory" }, "missing"),
      span("a", { "span.type": "memory" }, "b"),
      span("b", { "span.type": "memory" }, "a"),
    ]);
    const overview = overviewSpans(run);
    const ids = [
      ...overview.spans.map((item) => item.spanId),
      ...[...overview.groups.values()].flat().map((item) => item.spanId),
    ];
    expect(new Set(ids)).toEqual(new Set(["orphan", "a", "b"]));
  });

  it("preserves explicit resume links in overview mode", () => {
    const prior = { ...span("prior"), traceId: "before", parentSpanId: undefined };
    const root = span("root", { "workflow.previous_trace_id": "before" });
    const graph = traceGraph(trace([prior, root]), [], "overview");
    expect(graph.edges[0].label).toBe("Resume");
    expect(graph.edges[0].ariaLabel).toBe("Resume from the linked execution");
  });
});

describe("run summaries and history", () => {
  it("uses the last user message rather than instructions or historical assistant content", () => {
    const run = trace([
      span("root", {
        input:
          '[{"role":"system","content":"Hidden instructions"},{"role":"user","content":"First question"},{"role":"assistant","content":"Old response"},{"role":"user","parts":[{"type":"text","text":"  Latest\\n question  "}]}]',
      }),
    ]);
    expect(runPreview(run)).toBe("Latest question");
    run.spans[0].attributes.input = [{ role: "system", content: "Instructions only" }];
    expect(runPreview(run)).toBeUndefined();
    run.spans[0].attributes.input = [
      { role: "user", parts: [{ type: "file", filename: "report.pdf" }] },
    ];
    expect(runPreview(run)).toBe("report.pdf");
  });

  it("preserves workflow inputs including zero, false and long prompts", () => {
    const root = span("root", { input: false });
    expect(runPreview(trace([root]))).toBe("false");
    root.attributes.input = 0;
    expect(runPreview(trace([root]))).toBe("0");
    root.attributes.input = { city: "Istanbul" };
    expect(runPreview(trace([root]))).toContain("Istanbul");
    root.attributes.input = "x".repeat(300);
    expect(runPreview(trace([root]))).toHaveLength(180);
  });

  it("reports the selected execution, without summing ancestors or duplicate model usage", () => {
    const prior = {
      ...span("prior", { "usage.total_tokens": 900 }),
      traceId: "before",
      parentSpanId: undefined,
    };
    const root = span("root", { "usage.total_tokens": 112 });
    const loop = span("loop", { "llm.operation": "streamText", "llm.usage.total_tokens": 112 });
    const call = { ...span("model", { "llm.provider_attempt": true }), duration: 200 };
    const tool = { ...span("weather", { "span.type": "tool" }), duration: 750 };
    const summary = runSummary(trace([prior, root, loop, call, tool]));
    expect(summary.tokens).toBe(112);
    expect(summary.tools).toBe(1);
    expect(summary.longest).toMatchObject({ spanId: "weather" });
    expect(summary.duration).toBe(1000);
  });

  it("does not confuse a recovered attempt with a failed run, and locates the underlying failure", () => {
    const root = span("root");
    const attempt = span("attempt", { "llm.provider_attempt": true });
    attempt.status = { code: 2 };
    expect(runSummary(trace([root, attempt])).status).toBe("success");
    expect(runSummary(trace([root, attempt])).issue).toBe(attempt);
    root.status = { code: 2 };
    expect(runSummary(trace([root, attempt])).status).toBe("error");
    expect(runSummary(trace([root, attempt])).issue).toBe(attempt);
    const intermediate = span("intermediate");
    attempt.parentSpanId = intermediate.spanId;
    expect(runSummary(trace([root, intermediate, attempt])).issue).toBe(attempt);
  });

  it("distinguishes missing usage from zero and partial traces from finished executions", () => {
    expect(runSummary(trace([span("root")])).tokens).toBeUndefined();
    expect(runSummary(trace([span("root", { "usage.total_tokens": 0 })])).tokens).toBe(0);
    expect(runSummary(trace([span("child")])).status).toBe("running");
    expect(spanStatus(span("root", { "agent.state": "cancelled" }))).toBe("cancelled");
    expect(spanStatus(span("model", { "llm.state": "cancelled" }))).toBe("cancelled");
    expect(spanStatus(span("step", { "workflow.step.state": "skipped" }))).toBe("skipped");
    expect(spanStatus(span("root", { "workflow.state": "suspended" }))).toBe("suspended");
  });

  it("links chat calls by exact ID even when tool names repeat", () => {
    const first = span("first", { "tool.name": "weather", "tool.call.id": "call-one" });
    const second = span("second", { "tool.name": "weather", "tool.call.id": "call-two" });
    expect(toolCallSpan(trace([first, second]), "call-two")).toBe(second);
    expect(toolCallSpan(trace([first, second]), "older-call")).toBeUndefined();
  });
});

it("uses meaningful workflow history labels and retains falsy recorded results", () => {
  expect(
    runTitle(
      trace([
        span("root", {
          "voltagent.input": '{"message":"Review a duplicate bill","priority":"high"}',
        }),
      ]),
    ),
  ).toBe("Review a duplicate bill");
  expect(
    runTitle(trace([span("root", { "voltagent.input": { query: "  Find\nflights  " } })])),
  ).toBe("Find flights");
  for (const output of [false, 0, null]) {
    expect(
      runTitle(trace([span("root", { "voltagent.input": {}, "voltagent.output": output })])),
    ).toBe(`Result: ${output}`);
  }
  expect(runTitle(trace([span("root", { "voltagent.input": "Explain this" })]))).toBe(
    "Explain this",
  );
  expect(
    runTitle(trace([span("root", { "voltagent.input": {}, "workflow.name": "Trip planner" })])),
  ).toBe("Trip planner");
});

it("keeps rejected tool input separate from executed tools and the agent outcome", () => {
  const root = span("root");
  const rejected = span("rejected", {
    "span.type": "tool-validation",
    "tool.input.rejected": true,
    "tool.executed": false,
  });
  rejected.status = { code: 2, message: "Invalid city" };
  const summary = runSummary({ traceId: "run", spans: [root, rejected], spanCount: 2 });
  expect(summary.status).toBe("success");
  expect(summary.tools).toBe(0);
  expect(summary.rejectedTools).toBe(1);
  expect(summary.issue).toBe(rejected);
});
