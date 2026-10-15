import { describe, expect, it } from "vitest";
import type { Span, Trace } from "./api";
import { traceGraph } from "./graph";
import {
  defaultGraphFocus,
  followViewport,
  initialTraceViewport,
  overviewViewport,
  spanCardHeight,
} from "./graph-viewport";

function span(
  id: string,
  begin: number,
  finish?: number,
  parent = "root",
  attributes: Record<string, unknown> = { "span.type": "tool" },
): Span {
  return {
    spanId: id,
    traceId: "trace",
    parentSpanId: id === "root" ? undefined : parent,
    name: id,
    startTime: new Date(begin).toISOString(),
    endTime: finish === undefined ? undefined : new Date(finish).toISOString(),
    attributes,
    status: { code: 0 },
  };
}

function trace(spans: Span[]): Trace {
  return { traceId: "trace", spans, spanCount: spans.length };
}

const root = span("root", 0, 1000, "", { "entity.type": "agent" });
const position = (graph: ReturnType<typeof traceGraph>, id: string) => {
  const node = graph.nodes.find((item) => item.id === id);
  if (!node) throw new Error(`Missing node: ${id}`);
  return node.position;
};
const connections = (graph: ReturnType<typeof traceGraph>) =>
  graph.edges.map((edge) => `${edge.source}->${edge.target}`);

describe("execution timeline", () => {
  it("orders sequential siblings chronologically along one horizontal lane", () => {
    const graph = traceGraph(trace([root, span("last", 30, 40), span("first", 10, 20)]));
    expect(connections(graph)).toEqual(["root->first", "first->last"]);
    expect(position(graph, "first").x).toBeLessThan(position(graph, "last").x);
    expect(position(graph, "first").y).toBe(position(graph, "last").y);
  });

  it("forks overlapping tools and joins both branches before continuing", () => {
    const graph = traceGraph(
      trace([
        root,
        span("model", 1, 10),
        span("a", 11, 30),
        span("b", 12, 25),
        span("next", 31, 40),
      ]),
    );
    expect(connections(graph)).toEqual([
      "root->model",
      "model->a",
      "model->b",
      "a->next",
      "b->next",
    ]);
    expect(position(graph, "a").x).toBe(position(graph, "b").x);
    expect(position(graph, "a").y).not.toBe(position(graph, "b").y);
    expect(position(graph, "next").y).toBe(position(graph, "model").y);
  });

  it("continues a finished branch while another branch is still running", () => {
    const graph = traceGraph(
      trace([
        root,
        span("slow", 1, 80),
        span("fast", 2, 10),
        span("continuation", 11, 20),
        span("join", 81, 90),
      ]),
    );
    expect(connections(graph)).toContain("fast->continuation");
    expect(connections(graph)).not.toContain("slow->continuation");
    expect(connections(graph)).toEqual(
      expect.arrayContaining(["slow->join", "continuation->join"]),
    );
    expect(position(graph, "fast").y).toBe(position(graph, "continuation").y);
  });

  it("respects explicit parallel workflow branches even with non-overlapping timestamps", () => {
    const graph = traceGraph(
      trace([
        root,
        span("parallel", 1, 50, "root", { "workflow.step.type": "parallel-all" }),
        span("a", 2, 10, "parallel"),
        span("b", 11, 20, "parallel"),
        span("next", 51, 60),
      ]),
    );
    expect(connections(graph)).toEqual(
      expect.arrayContaining(["parallel->a", "parallel->b", "a->next", "b->next"]),
    );
    expect(connections(graph)).not.toContain("a->b");
    expect(position(graph, "a").x).toBe(position(graph, "b").x);
    expect(position(graph, "next").x).toBeGreaterThan(position(graph, "b").x);
  });

  it("continues a parallel race from the winner without waiting for its unfinished sibling", () => {
    const graph = traceGraph(
      trace([
        root,
        span("race", 1, 20, "root", { "workflow.step.type": "parallel-race" }),
        span("winner", 2, 19, "race"),
        span("pending", 2, undefined, "race"),
        span("skipped", 2, 20, "race", { "workflow.step.state": "skipped" }),
        span("next", 21, 30),
      ]),
    );
    expect(connections(graph)).toContain("winner->next");
    expect(connections(graph)).not.toContain("pending->next");
    expect(graph.nodes.some((node) => node.id === "pending")).toBe(true);
  });

  it("puts subagent execution on its own lane and returns to the parent flow", () => {
    const graph = traceGraph(
      trace([
        root,
        span("delegate", 1, 50),
        span("agent", 2, 49, "delegate", { "entity.type": "agent" }),
        span("child-model", 3, 20, "agent", { "span.type": "llm" }),
        span("child-tool", 21, 30, "agent"),
        span("answer", 51, 60),
      ]),
    );
    expect(position(graph, "agent").y).toBeGreaterThan(position(graph, "delegate").y);
    expect(position(graph, "child-model").y).toBe(position(graph, "agent").y);
    expect(position(graph, "answer").y).toBe(position(graph, "delegate").y);
    expect(connections(graph)).toContain("child-tool->answer");
  });

  it("keeps the model operation inspectable without treating the tool loop as parallel", () => {
    const graph = traceGraph(
      trace([
        root,
        span("operation", 1, 90, "root", { "span.type": "llm", "llm.operation": "streamText" }),
        span("attempt", 2, 20, "root", {
          "span.type": "llm",
          "llm.operation": "streamText",
          "llm.provider_attempt": true,
        }),
        span("tool", 21, 40),
        span("answer", 41, 89),
      ]),
    );
    expect(graph.nodes).toHaveLength(5);
    expect(connections(graph)).toEqual([
      "root->operation",
      "operation->attempt",
      "attempt->tool",
      "tool->answer",
    ]);
    expect(new Set(graph.nodes.map((node) => node.position.y)).size).toBe(1);
  });

  it("keeps existing nodes fixed as running branches finish and new steps arrive", () => {
    const first = traceGraph(trace([root, span("a", 1), span("b", 2)]));
    const second = traceGraph(
      trace([root, span("a", 1, 10), span("b", 2, 20), span("next", 21)]),
      first.nodes,
    );
    for (const node of first.nodes) expect(position(second, node.id)).toEqual(node.position);
    expect(connections(second)).toEqual(expect.arrayContaining(["a->next", "b->next"]));
    expect(position(second, "next").x).toBeGreaterThan(position(second, "b").x);
  });

  it("places late spans without collisions or losing any spans in partial traces", () => {
    const first = traceGraph(trace([root, span("last", 30, 40)]));
    const second = traceGraph(
      trace([root, span("first", 10, 20), span("last", 30, 40)]),
      first.nodes,
    );
    expect(position(second, "last")).toEqual(position(first, "last"));
    expect(position(second, "first")).not.toEqual(position(second, "last"));
    const malformed = traceGraph(
      trace([span("orphan", 0, 1, "missing"), span("a", 2, 3, "b"), span("b", 3, 4, "a")]),
    );
    expect(new Set(malformed.nodes.map((node) => node.id)).size).toBe(3);
    expect(malformed.edges).toHaveLength(1);
  });
});

describe("live graph viewport", () => {
  it("preserves zoom when revealing a step and leaves an already visible step alone", () => {
    const size = { width: 1000, height: 700 };
    const viewport = { x: 50, y: 200, zoom: 0.8 };
    expect(followViewport(viewport, { x: 300, y: 0 }, size)).toEqual(viewport);
    const next = followViewport(viewport, { x: 1600, y: 600 }, size);
    expect(next.zoom).toBe(viewport.zoom);
    expect(next.x + (1600 + 350) * next.zoom).toBeLessThanOrEqual(size.width - 40);
    expect(next.y + (600 + spanCardHeight(size.height)) * next.zoom).toBeLessThanOrEqual(
      size.height - 20,
    );
  });
  it("keeps responsive card footers reachable on a short canvas", () => {
    const size = { width: 660, height: 447 };
    const next = followViewport({ x: 40, y: 150, zoom: 1 }, { x: 0, y: 0 }, size);
    expect(next.y).toBeGreaterThanOrEqual(95);
    expect(next.y + spanCardHeight(size.height)).toBeLessThanOrEqual(size.height - 20);
  });
});

describe("initial trace framing", () => {
  const nodes = [
    { id: "root", position: { x: 0, y: 0 } },
    { id: "parallel", position: { x: 315, y: 0 } },
    { id: "winner", position: { x: 630, y: 304 } },
    { id: "loser", position: { x: 630, y: 608 } },
    { id: "next", position: { x: 945, y: 0 } },
  ];
  it("keeps every parallel branch within a large viewport without shrinking text below readable zoom", () => {
    const size = { width: 1500, height: 1200 };
    const viewport = initialTraceViewport(nodes, size, true);
    expect(viewport.zoom).toBeGreaterThanOrEqual(0.85);
    for (const node of nodes) {
      expect(viewport.y + node.position.y * viewport.zoom).toBeGreaterThanOrEqual(65);
      expect(
        viewport.y + (node.position.y + spanCardHeight(size.height)) * viewport.zoom,
      ).toBeLessThan(size.height);
      expect(viewport.x + (node.position.x + 350) * viewport.zoom).toBeLessThan(size.width);
    }
  });
  it("frames a short run without clipping its first operation when automatically focusing its outcome", () => {
    const compactNodes = nodes.slice(0, 3);
    const size = { width: 1163, height: 1052 };
    const viewport = initialTraceViewport(compactNodes, size, true, "winner", true);
    for (const node of compactNodes) {
      expect(viewport.x + node.position.x * viewport.zoom).toBeGreaterThanOrEqual(40);
      expect(viewport.x + (node.position.x + 350) * viewport.zoom).toBeLessThan(size.width);
    }
  });
  it("preserves readable cards on a narrow canvas and can open at a selected branch", () => {
    const size = { width: 660, height: 550 };
    const viewport = initialTraceViewport(nodes, size, true);
    expect(viewport).toEqual({ x: 40, y: 65, zoom: 1 });
    const selected = initialTraceViewport(nodes, size, true, "loser");
    expect(selected.x + 630 * selected.zoom).toBeGreaterThanOrEqual(40);
    expect(selected.x + (630 + 350) * selected.zoom).toBeLessThan(size.width);
    expect(selected.y + 608 * selected.zoom).toBeGreaterThanOrEqual(65);
    expect(selected.y + (608 + 250) * selected.zoom).toBeLessThan(size.height);
  });
});

it("opens the failed operation instead of its input or a successful sibling", () => {
  const failed = { ...span("provider", 1, 20), status: { code: 2 } };
  const data = trace([{ ...root, status: { code: 2 } }, failed, span("cleanup", 21, 30)]);
  expect(defaultGraphFocus(data, traceGraph(data).nodes)).toBe("provider");
});

it("opens a completed run at its root instead of hiding the beginning", () => {
  const data = trace([root, span("model", 1, 5), span("tool", 6, 7), span("last", 8, 9)]);
  expect(defaultGraphFocus(data, traceGraph(data).nodes)).toBe("root");
});

it("fits five readable summaries and bounds the zoom for larger flows", () => {
  const nodes = Array.from({ length: 5 }, (_, index) => ({ position: { x: index * 200, y: 0 } }));
  const viewport = overviewViewport(nodes, { width: 590, height: 574 });
  expect(viewport.zoom).toBeGreaterThanOrEqual(0.55);
  expect(viewport.x).toBeGreaterThanOrEqual(20);
  expect(viewport.x + (800 + 180) * viewport.zoom).toBeLessThanOrEqual(570);
  expect(
    overviewViewport([...nodes, { position: { x: 10000, y: 0 } }], { width: 590, height: 574 })
      .zoom,
  ).toBe(0.55);
});
