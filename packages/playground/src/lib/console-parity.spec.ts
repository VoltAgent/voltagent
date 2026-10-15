import { describe, expect, it } from "vitest";
import type { Span, Trace } from "./api";
import { requestExamples } from "./api-examples";
import { traceGraph } from "./graph";
import { decorateGraph } from "./graph-decorations";
import { middlewareChange, scorerResult } from "./node-semantics";
import { readRoute, routeUrl } from "./route-state";
import { subagentOutputs } from "./subagent-messages";
import { workspaceEventCategory } from "./workspace-events";

const span = (attributes: Record<string, unknown>, id = "root", parent?: string): Span => ({
  spanId: id,
  traceId: "trace",
  parentSpanId: parent,
  name: id,
  startTime: "2026-01-01T00:00:00.000Z",
  endTime: "2026-01-01T00:00:01.000Z",
  status: { code: 1 },
  attributes,
});

describe("Console feature parity", () => {
  it("categorizes skill listing events even when no individual skill was selected", () => {
    expect(workspaceEventCategory(span({ "workspace.operation": "skills.list" }))).toBe("skills");
    expect(workspaceEventCategory(span({ "workspace.fs.path": "/notes.txt" }))).toBe("filesystem");
    expect(workspaceEventCategory(span({ "workspace.operation": "custom.action" }))).toBe("other");
  });
  it("preserves zero scores and a failed threshold without marking the execution as failed", () => {
    const result = scorerResult(
      span({
        "eval.scorer.id": "quality",
        "eval.scorer.score": 0,
        "eval.scorer.threshold": 0.8,
        "eval.scorer.threshold_passed": false,
      }),
    );
    expect(result).toMatchObject({ score: 0, threshold: 0.8, verdict: "Below threshold" });
  });
  it("compares recorded middleware values and does not invent a change for missing output", () => {
    expect(
      middlewareChange(
        span({
          "middleware.direction": "input",
          "middleware.input.current": '{"value":0}',
          "middleware.input.after": { value: 0 },
        }),
      ),
    ).toBe("Unchanged");
    expect(
      middlewareChange(
        span({
          "middleware.direction": "output",
          "middleware.output.current": "false",
          "middleware.output.after": "true",
        }),
      ),
    ).toBe("Modified");
    expect(middlewareChange(span({ "middleware.direction": "input" }))).toBeUndefined();
  });
  it("keeps subagents with equal names separate and requires a finish event for completed", () => {
    const part = (id: string, originalType: string, delta?: string) => ({
      type: "data-subagent-stream",
      data: { subAgentId: id, subAgentName: "Researcher", originalType, delta },
    });
    const result = subagentOutputs(
      [
        part("a", "text-delta", "First"),
        part("b", "text-delta", "Second"),
        part("a", "text-delta", " result"),
        part("a", "finish"),
      ],
      false,
    );
    expect(result).toMatchObject([
      { id: "a", text: "First result", status: "completed" },
      { id: "b", text: "Second", status: "stopped" },
    ]);
  });
  it("adds input/output cards without changing telemetry or losing falsy output", () => {
    const root = span({
      "entity.type": "workflow",
      input: { count: 0 },
      output: false,
      "workflow.state": "completed",
    });
    const trace: Trace = { traceId: "trace", spans: [root], spanCount: 1 };
    const graph = traceGraph(trace);
    const decorated = decorateGraph(trace, graph);
    expect(
      decorated.nodes
        .filter((node) => node.type === "presentation")
        .map((node) => [node.data.kind, node.data.detail]),
    ).toEqual([
      ["input", { count: 0 }],
      ["output", false],
    ]);
    expect(graph.nodes).toHaveLength(1);
    expect(trace.spans).toEqual([root]);
    expect(decorated.nodes.filter((node) => node.data.span)).toHaveLength(1);
  });
  it("separates a repeated subagent invocation after its finish event", () => {
    const part = (originalType: string, delta?: string) => ({
      type: "data-subagent-stream",
      data: { subAgentId: "a", originalType, delta },
    });
    const outputs = subagentOutputs(
      [part("text-delta", "First"), part("finish"), part("text-delta", "Second")],
      true,
    );
    expect(outputs).toMatchObject([
      { id: "a", text: "First", status: "completed" },
      { id: "a/2", text: "Second", status: "streaming" },
    ]);
  });
  it("connects a pause to the suspended step and exposes its reason", () => {
    const root = span({ "entity.type": "workflow", "workflow.state": "suspended" });
    const step = span(
      {
        "workflow.step.type": "then",
        "workflow.step.state": "suspended",
        "workflow.step.suspension_reason": "Human review",
        "workflow.step.id": "review",
      },
      "step",
      "root",
    );
    const trace: Trace = { traceId: "trace", spans: [root, step], spanCount: 2 };
    const graph = decorateGraph(trace, traceGraph(trace));
    expect(graph.nodes.find((node) => node.data.kind === "pause")?.data.detail).toMatchObject({
      Reason: "Human review",
      Step: "review",
    });
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "step", target: "root/presentation/pause" }),
      ]),
    );
  });
  it("round-trips encoded trace links and removes stale span parameters", () => {
    const route = { kind: "workflow" as const, entity: "test / ü", trace: "t", span: "s" };
    const url = routeUrl("http://localhost:3142/?trace=old", route);
    expect(readRoute(new URL(url).search)).toEqual(route);
    expect(new URL(routeUrl(url, { ...route, span: undefined })).searchParams.has("span")).toBe(
      false,
    );
  });
  it("does not label the resume event itself failed when a later workflow step fails", () => {
    const root = span({ "entity.type": "workflow", "workflow.previous_trace_id": "older" });
    root.status = { code: 2, message: "Later step failed" };
    const trace: Trace = { traceId: "trace", spans: [root], spanCount: 1 };
    const graph = decorateGraph(trace, traceGraph(trace));
    expect(
      graph.nodes.find((node) => node.data.kind === "transition")?.data.status,
    ).toBeUndefined();
    expect(graph.nodes.find((node) => node.id === "root")?.data.status).toBe("error");
  });
  it("generates escaped HTTP requests from workflow schemas", () => {
    const result = requestExamples(
      {
        id: "my/workflow",
        name: "Workflow",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string", default: "O'Reilly" } },
        },
      },
      "workflow",
      "http://localhost:3141/",
      true,
    );
    expect(result.path).toBe("/workflows/my%2Fworkflow/stream");
    expect(result.curl).toContain("--no-buffer");
    expect(result.curl).toContain(`O'"'"'Reilly`);
    expect(result.fetch).toContain("getReader()");
  });
});
