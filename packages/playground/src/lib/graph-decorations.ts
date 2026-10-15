import type { Edge } from "@xyflow/react";
import type { Trace } from "./api";
import type { GraphNode } from "./graph";
import { spanIO, spanValue } from "./span-details";
import { formatDuration, spanStatus, traceRoot } from "./trace-presentation";

/** Presentation cards never enter telemetry, token counts, or exported span data. */
export function decorateGraph(
  trace: Trace,
  graph: { nodes: GraphNode[]; edges: Edge[] },
  showIO = true,
) {
  const root = traceRoot(trace);
  const rootNode = graph.nodes.find((node) => node.id === root?.spanId);
  if (!root || !rootNode) return graph;
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];
  const recorded = spanIO(root);
  const input = showIO ? recorded.input : undefined;
  const output = showIO ? recorded.output : undefined;
  const add = (
    kind: string,
    label: string,
    value: unknown,
    x: number,
    source?: string,
    target?: string,
  ) => {
    const id = `${root.spanId}/presentation/${kind}`;
    nodes.push({
      id,
      type: "presentation",
      position: { x, y: rootNode.position.y },
      data: {
        label,
        kind,
        detail: value,
        sourceSpan: root,
        status: kind === "input" || kind === "transition" ? undefined : spanStatus(root),
      },
    });
    if (source || target)
      edges.push({
        id: `${source ?? id}-${target ?? id}`,
        source: source ?? id,
        target: target ?? id,
        type: "smoothstep",
        style: { stroke: "#626a73", strokeDasharray: "4 5" },
        ariaLabel: `${label} presentation`,
      });
    return id;
  };
  if (input !== undefined)
    add("input", "Input", input, rootNode.position.x - 420, undefined, rootNode.id);
  const state = spanStatus(root);
  const suspended =
    trace.spans.find(
      (span) =>
        span.traceId === root.traceId &&
        span.spanId !== root.spanId &&
        spanStatus(span) === "suspended",
    ) ?? root;
  const previousId = spanValue(
    root,
    "workflow.previous_trace_id",
    "workflow.replay.source_trace_id",
  );
  const right = Math.max(...graph.nodes.map((node) => node.position.x)) + 420;
  if (previousId && showIO) {
    const previous = trace.spans.find(
      (span) =>
        span.traceId === previousId &&
        !trace.spans.some((parent) => parent.spanId === span.parentSpanId),
    );
    const replay = root.attributes["workflow.replay.source_trace_id"] !== undefined;
    const wait = previous?.endTime
      ? Date.parse(root.startTime) - Date.parse(previous.endTime)
      : undefined;
    add(
      "transition",
      replay ? "Workflow replay" : "Workflow resumed",
      {
        "Previous trace": previousId,
        ...(previous?.endTime ? { "Previous run ended": previous.endTime } : {}),
        Started: root.startTime,
        ...(wait !== undefined && wait >= 0 ? { "Time between runs": formatDuration(wait) } : {}),
        "Resume payload": spanValue(root, "workflow.resume.data", "resume.data") ?? "Not recorded",
        "From step": spanValue(
          root,
          "workflow.replay.from_step",
          "workflow.replay.source_step_id",
          "workflow.replay.step_id",
          "workflow.resume.step_index",
        ),
      },
      rootNode.position.x - (input === undefined ? 420 : 840),
      undefined,
      input === undefined ? rootNode.id : `${root.spanId}/presentation/input`,
    );
  }
  if (state === "suspended" && showIO) {
    add(
      "pause",
      "Workflow paused",
      {
        Reason:
          suspended &&
          spanValue(
            suspended,
            "workflow.step.suspension_reason",
            "workflow.suspension.reason",
            "workflow.suspend.reason",
          ),
        "Paused at": suspended?.endTime ?? root.endTime,
        Step: suspended && spanValue(suspended, "workflow.step.name", "workflow.step.id"),
      },
      right,
      graph.nodes.some((node) => node.id === suspended.spanId) ? suspended.spanId : rootNode.id,
    );
  } else if (output !== undefined) {
    const leaves = graph.nodes.filter(
      (node) =>
        node.data.span?.traceId === root.traceId &&
        !graph.edges.some((edge) => edge.source === node.id),
    );
    const id = add("output", "Output", output, right, leaves[0]?.id ?? rootNode.id);
    for (const leaf of leaves.slice(1))
      edges.push({
        id: `${leaf.id}-${id}`,
        source: leaf.id,
        target: id,
        type: "smoothstep",
        style: { stroke: "#626a73", strokeDasharray: "4 5" },
      });
  }
  return { nodes, edges };
}
