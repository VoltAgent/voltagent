import type { Edge, Node } from "@xyflow/react";
import type { Entity, EntityKind, Span, Trace, WorkflowStep } from "./api";
import { descendantIds } from "./execution-insights";
import { layoutTrace } from "./trace-layout";
import {
  type RunStatus,
  overviewSpans,
  spanKind,
  spanLabel,
  spanStatus,
  statusLabels,
} from "./trace-presentation";

export { spanStatus } from "./trace-presentation";

export interface GraphData extends Record<string, unknown> {
  label: string;
  kind: string;
  subtitle?: string;
  status?: RunStatus;
  detail: unknown;
  span?: Span;
  internalSpans?: Span[];
  descendantCount?: number;
  collapsedCount?: number;
  groupSummary?: string;
}
export type GraphNode = Node<GraphData>;

function layout(items: Array<{ id: string; parent?: string; data: GraphData }>) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const rows = new Map<number, number>();
  const depth = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    const parent = byId.get(id)?.parent;
    return parent && byId.has(parent) ? depth(parent, visited) + 1 : 0;
  };
  const nodes: GraphNode[] = items.map((item) => {
    const column = depth(item.id);
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    return {
      id: item.id,
      type: "volt",
      data: item.data,
      position: { x: column * 420, y: row * 490 },
    };
  });
  const edges: Edge[] = items
    .filter((item) => item.parent && byId.has(item.parent))
    .map((item) => ({
      id: `${item.parent}-${item.id}`,
      source: item.parent as string,
      target: item.id,
      type: "smoothstep",
      animated: item.data.status === "running",
      style: { stroke: item.data.status === "error" ? "#f97373" : "#51575d", strokeWidth: 1.5 },
    }));
  return { nodes, edges };
}

export function traceGraph(
  trace: Trace,
  previous: GraphNode[] = [],
  mode: "overview" | "all" = "all",
  collapsed: ReadonlySet<string> = new Set(),
) {
  const overview = overviewSpans(trace);
  const candidates = mode === "overview" ? overview.spans : trace.spans;
  const hidden = new Set<string>();
  for (const id of collapsed) for (const child of descendantIds(candidates, id)) hidden.add(child);
  const spans = candidates.filter((span) => !hidden.has(span.spanId));
  const originals = new Map(trace.spans.map((span) => [span.spanId, span]));
  const roots = new Map(
    trace.spans
      .filter((span) => !span.parentSpanId || !originals.has(span.parentSpanId))
      .map((span) => [span.traceId, span]),
  );
  const graph = layoutTrace(
    spans.map((original) => {
      const children = descendantIds(candidates, original.spanId);
      const counts = new Map<string, number>();
      for (const child of candidates.filter((span) => children.has(span.spanId))) {
        const state = spanStatus(child);
        counts.set(state, (counts.get(state) ?? 0) + 1);
      }
      const ancestor =
        original.attributes["workflow.previous_trace_id"] ??
        original.attributes["workflow.replay.source_trace_id"];
      const parent = typeof ancestor === "string" ? roots.get(ancestor) : undefined;
      const span = parent ? { ...original, parentSpanId: parent.spanId } : original;
      return {
        id: span.spanId,
        type: "span",
        position: { x: 0, y: 0 },
        data: {
          label: spanLabel(span, trace.spans),
          kind: spanKind(span),
          internalSpans: overview.groups.get(span.spanId),
          descendantCount: children.size,
          collapsedCount: collapsed.has(span.spanId) ? children.size : 0,
          groupSummary: [...counts]
            .map(([state, count]) => `${count} ${statusLabels[state as RunStatus]}`)
            .join(" · "),
          subtitle:
            span.duration !== undefined
              ? `${Math.round(span.duration)} ms`
              : span.endTime
                ? "Completed"
                : "Running",
          status: spanStatus(span),
          detail: span.attributes,
          span,
        } as GraphData,
      };
    }),
    previous,
  );
  for (const node of graph.nodes) node.data.span = originals.get(node.id);
  for (const edge of graph.edges) {
    edge.style = { ...edge.style, strokeDasharray: "4 5" };
    edge.ariaLabel = "Time order, not a dependency";
    const target = originals.get(edge.target);
    if (target && originals.get(edge.source)?.traceId !== target.traceId) {
      edge.label = target.attributes["workflow.replay.source_trace_id"] ? "Replay" : "Resume";
      edge.ariaLabel = `${edge.label} from the linked execution`;
      edge.style = { ...edge.style, stroke: "#41d7a0", strokeDasharray: undefined };
    }
  }
  return graph;
}

export function structureGraph(entity: Entity, kind: EntityKind, observed?: Trace) {
  const items: Array<{ id: string; parent?: string; data: GraphData }> = [];
  const add = (
    id: string,
    label: string,
    type: string,
    detail: unknown,
    parent?: string,
    subtitle?: string,
  ) => {
    items.push({
      id,
      parent,
      data: {
        label,
        kind: type,
        detail,
        subtitle,
        ownerId:
          type === "agent"
            ? (detail as Entity).id
            : (items.find((item) => item.id === parent)?.data.ownerId ?? entity.id),
      },
    });
  };
  add(entity.id, entity.name, kind, entity, undefined, entity.model ?? "Ready to run");
  if (kind === "agent") {
    const addAgent = (agent: Entity, parent: string, trail: Set<string>) => {
      if (trail.has(agent.id)) return;
      const seen = new Set(trail).add(agent.id);
      if (agent.model)
        add(
          `${parent}/model`,
          agent.model,
          "llm",
          { model: agent.model },
          parent,
          "Language model",
        );
      for (const tool of agent.tools ?? [])
        add(`${parent}/tool/${tool.name}`, tool.name, "tool", tool, parent, tool.description);
      if (agent.memory?.available)
        add(`${parent}/memory`, "Memory", "memory", agent.memory, parent, "Conversation context");
      for (const [component, label] of [
        ["embeddingModel", "Embedding model"],
        ["vectorDB", "Vector store"],
        ["workingMemory", "Working memory"],
      ] as const) {
        const value = agent.memory?.[component];
        if (
          value &&
          typeof value === "object" &&
          (value as { enabled?: boolean }).enabled !== false
        )
          add(
            `${parent}/memory/${component}`,
            label,
            component === "embeddingModel"
              ? "embedding"
              : component === "vectorDB"
                ? "vector"
                : "working-memory",
            value,
            `${parent}/memory`,
          );
      }
      if (agent.retriever)
        add(`${parent}/retriever`, "Retriever", "retriever", agent.retriever, parent);
      for (const direction of ["input", "output"] as const)
        for (const [index, guardrail] of (agent.guardrails?.[direction] ?? []).entries())
          add(
            `${parent}/guardrail/${direction}/${guardrail.id ?? index}`,
            guardrail.name,
            "guardrail",
            guardrail,
            parent,
            `${direction} guardrail`,
          );
      for (const child of agent.subAgents ?? []) {
        const id = `${parent}/agent/${child.id}`;
        add(id, child.name, "agent", child, parent, "Subagent");
        addAgent(child, id, seen);
      }
    };
    addAgent(entity, entity.id, new Set());
  } else {
    const steps = (list: WorkflowStep[], parent: string, parallel = false) => {
      let previous = parent;
      list.forEach((step, index) => {
        const id = `${parent}/step/${step.id ?? index}`;
        add(
          id,
          step.name ?? step.id ?? `Step ${index + 1}`,
          step.type,
          step,
          previous,
          step.agentId ?? step.type,
        );
        if (step.nestedStep) steps([step.nestedStep], id);
        if (step.subSteps)
          steps(step.subSteps, id, step.type.startsWith("parallel") || step.type === "branch");
        if (!parallel) previous = id;
      });
    };
    steps(entity.steps ?? [], entity.id);
  }
  const graph = layout(items);
  if (observed)
    for (const node of graph.nodes) {
      const detail = node.data.detail as
        | { id?: string; name?: string; model?: string; node_id?: string; direction?: string }
        | undefined;
      const matching = observed.spans.filter((span) => {
        if (kind === "workflow")
          return node.data.kind === "workflow"
            ? !span.parentSpanId
            : detail?.id && span.attributes["workflow.step.id"] === detail.id;
        if (span.attributes["entity.id"] !== node.data.ownerId) return false;
        const type = String(span.attributes["span.type"] ?? span.attributes["entity.type"]);
        if (node.data.kind === "tool")
          return type === "tool" && span.attributes["tool.name"] === detail?.name;
        if (node.data.kind === "llm")
          return type === "llm" && span.attributes["llm.model"] === detail?.model;
        if (node.data.kind === "guardrail")
          return (
            type === "guardrail" &&
            span.attributes["guardrail.name"] === detail?.name &&
            (!detail?.direction || span.attributes["guardrail.direction"] === detail.direction)
          );
        if (node.data.kind === "working-memory")
          return span.attributes["agent.workingMemory.enabled"] === true;
        return type === node.data.kind && (type !== "agent" || !span.attributes["span.type"]);
      });
      const executed = matching.at(-1);
      if (executed) {
        node.data.status = spanStatus(executed);
        node.data.subtitle = `Executed · ${node.data.subtitle ?? node.data.kind}`;
      }
    }
  return graph;
}

export function traceTokenCount(span?: Span): number {
  if (!span) return 0;
  return Number(
    span.attributes["usage.total_tokens"] ??
      Number(span.attributes["gen_ai.usage.input_tokens"] ?? 0) +
        Number(span.attributes["gen_ai.usage.output_tokens"] ?? 0),
  );
}
