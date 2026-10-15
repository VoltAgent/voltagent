import type { Edge } from "@xyflow/react";
import type { Span } from "./api";
import type { GraphNode } from "./graph";

const COLUMN = 420;
const ROW = 490;

interface Branch {
  end: number;
  state?: unknown;
  exits: string[];
  right: number;
  top: number;
  bottom: number;
}

function start(span: Span): number {
  return Date.parse(span.startTime) || 0;
}

function end(span: Span): number {
  // The outer model operation encloses the entire tool loop, although provider
  // attempts and tools are exported as its siblings. Keep it as an inspectable
  // entry node, rather than mistaking the whole loop for parallel work.
  if (span.attributes["llm.operation"] && span.attributes["llm.provider_attempt"] !== true) {
    return start(span);
  }
  if (span.endTime) return Date.parse(span.endTime) || start(span);
  if (span.duration !== undefined) return start(span) + span.duration;
  return Number.POSITIVE_INFINITY;
}

/** Lay out execution order independently of the telemetry parent tree. */
export function layoutTrace(input: GraphNode[], previous: GraphNode[] = []) {
  const byId = new Map(input.map((node) => [node.id, node]));
  const children = new Map<string, GraphNode[]>();
  const roots: GraphNode[] = [];
  const order = new Map(input.map((node, index) => [node.id, index]));
  const anchors = new Map(
    previous.filter((node) => byId.has(node.id)).map((node) => [node.id, node.position]),
  );
  const occupied = [...anchors.values()];
  const visited = new Set<string>();
  const nodes: GraphNode[] = [];
  const edges: Edge[] = [];

  for (const node of input) {
    const parent = node.data.span?.parentSpanId;
    if (parent && parent !== node.id && byId.has(parent)) {
      const siblings = children.get(parent) ?? [];
      siblings.push(node);
      children.set(parent, siblings);
    } else roots.push(node);
  }

  const sorted = (list: GraphNode[]) =>
    [...list].sort((a, b) => {
      const left = a.data.span;
      const right = b.data.span;
      if (!left || !right) return 0;
      return start(left) - start(right) || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });

  const connect = (sources: string[], target: GraphNode) => {
    for (const source of sources) {
      if (source === target.id) continue;
      edges.push({
        id: `${source}-${target.id}`,
        source,
        target: target.id,
        type: "smoothstep",
        animated: target.data.status === "running",
        style: {
          stroke: target.data.status === "error" ? "#f97373" : "#51575d",
          strokeWidth: 1.5,
        },
      });
    }
  };

  const place = (node: GraphNode, column: number, row: number): Branch => {
    visited.add(node.id);
    const position = anchors.get(node.id) ?? { x: column * COLUMN, y: row * ROW };
    if (!anchors.has(node.id)) {
      // Late-arriving spans get a free lane without moving already visible nodes.
      while (
        occupied.some((p) => Math.abs(p.x - position.x) < 370 && Math.abs(p.y - position.y) < 450)
      ) {
        position.y += ROW;
      }
      occupied.push(position);
    }
    nodes.push({ ...node, position });
    const ownColumn = position.x / COLUMN;
    const ownRow = position.y / ROW;
    const span = node.data.span;
    let frontier: Branch[] = [];
    let fork = [node.id];
    let forkColumn = ownColumn + 1;
    let right = ownColumn;
    let bottom = ownRow;
    const stepType = span?.attributes["workflow.step.type"];
    const parallel = stepType === "parallel-all" || stepType === "parallel-race";

    for (const child of sorted(children.get(node.id) ?? [])) {
      if (visited.has(child.id) || !child.data.span) continue;
      const childSpan = child.data.span;
      const completed = parallel ? [] : frontier.filter((branch) => branch.end <= start(childSpan));
      frontier = frontier.filter((branch) => !completed.includes(branch));
      if (completed.length) {
        fork = completed.flatMap((branch) => branch.exits);
        forkColumn = Math.max(...completed.map((branch) => branch.right)) + 1;
      }

      const childKind = childSpan.attributes["span.type"] ?? childSpan.attributes["entity.type"];
      // Agent invocations and explicit workflow branches get their own lanes.
      const separateLane = childKind === "agent" || parallel;
      let childRow = ownRow + (separateLane ? 1 : 0);
      for (const branch of [...frontier].sort((a, b) => a.top - b.top)) {
        if (childRow >= branch.top && childRow <= branch.bottom) childRow = branch.bottom + 1;
      }
      const branch = place(child, forkColumn, childRow);
      connect(fork, child);
      frontier.push(branch);
      right = Math.max(right, branch.right);
      bottom = Math.max(bottom, branch.bottom);
    }

    // A race continues after its winner, without waiting for unfinished losers.
    const exits =
      stepType === "parallel-race" && span?.endTime
        ? frontier.filter(
            (branch) =>
              branch.end <= end(span) && branch.state !== "skipped" && branch.state !== "cancelled",
          )
        : frontier;
    return {
      end: span ? end(span) : 0,
      state: span?.attributes["workflow.step.state"],
      exits: exits.length ? exits.flatMap((branch) => branch.exits) : [node.id],
      right,
      top: ownRow,
      bottom,
    };
  };

  let rootRow = 0;
  // The second pass also handles partial/malformed traces containing parent cycles.
  for (const node of [...sorted(roots), ...sorted(input)]) {
    if (visited.has(node.id)) continue;
    rootRow = place(node, 0, rootRow).bottom + 2;
  }
  return { nodes, edges };
}
