import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  Panel,
  ReactFlow,
  type ReactFlowInstance,
  useNodesState,
} from "@xyflow/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Entity, EntityKind, Span, Trace } from "../lib/api";
import type { CanvasOptions } from "../lib/canvas-options";
import { descendantIds } from "../lib/execution-insights";
import { type GraphData, type GraphNode, structureGraph, traceGraph } from "../lib/graph";
import { decorateGraph } from "../lib/graph-decorations";
import {
  defaultGraphFocus,
  followViewport,
  initialTraceViewport,
  overviewViewport,
} from "../lib/graph-viewport";
import { useStoredState } from "../lib/storage";
import { traceRoot } from "../lib/trace-presentation";
import { OverviewNode } from "./overview-node";
import { PresentationNode } from "./presentation-node";
import { SpanNode, SpanNodeContext } from "./span-node";
import { StructureNode } from "./structure-node";

const nodeTypes = {
  volt: StructureNode,
  span: SpanNode,
  presentation: PresentationNode,
  overview: OverviewNode,
};

export function ExecutionGraph({
  entity,
  kind,
  trace,
  mode = "overview",
  compact = true,
  selectedSpanId,
  onSelect,
  onWorkflowAction,
  canvas,
}: {
  entity: Entity;
  kind: EntityKind;
  trace?: Trace;
  mode?: "overview" | "all";
  compact?: boolean;
  selectedSpanId?: string;
  onSelect: (data: GraphData | null) => void;
  onWorkflowAction?: (span: Span) => void;
  canvas: CanvasOptions;
}) {
  const { showHistory, setShowHistory, showIO, command } = canvas;
  const completed = useRef(false);
  const [overview, setOverview] = useState(false);
  const [overviewZoom, setOverviewZoom] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [instance, setInstance] = useState<ReactFlowInstance<GraphNode>>();
  const [positions, savePositions] = useStoredState<Record<string, { x: number; y: number }>>(
    `positions.${trace ? `execution-v5.${mode}.` : "structure-v2."}${kind}.${entity.id}`,
    {},
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [following, setFollowing] = useState(true);
  const container = useRef<HTMLDivElement>(null);
  const layout = useRef<GraphNode[]>([]);
  const fitted = useRef(false);
  const seen = useRef(new Set<string>());
  const followLatest = useRef(false);
  const focused = useRef<string | undefined>(undefined);
  const layoutMode = useRef({ showHistory, showIO, overview });
  useEffect(() => {
    if (!trace || !selectedSpanId) return;
    setOverview(false);
    if (
      trace.spans.some((span) => span.spanId === selectedSpanId && span.traceId !== trace.traceId)
    )
      setShowHistory(true);
    setCollapsed((previous) => {
      const next = new Set(
        [...previous].filter((id) => !descendantIds(trace.spans, id).has(selectedSpanId)),
      );
      return next.size === previous.size ? previous : next;
    });
  }, [trace, selectedSpanId, setShowHistory]);
  const toggleGroup = (id: string) => {
    setFollowing(false);
    const node = instance?.getNode(id);
    if (instance && node && container.current)
      void instance.setViewport(
        followViewport(instance.getViewport(), node.position, {
          width: container.current.clientWidth,
          height: container.current.clientHeight,
        }),
        { duration: 150 },
      );
    layout.current = [];
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  useEffect(() => {
    if (
      layoutMode.current.showHistory !== showHistory ||
      layoutMode.current.showIO !== showIO ||
      layoutMode.current.overview !== overview
    ) {
      layout.current = [];
      fitted.current = false;
      layoutMode.current = { showHistory, showIO, overview };
    }
    const baseGraph = trace
      ? traceGraph(
          showHistory
            ? trace
            : {
                ...trace,
                spans: trace.spans.filter((span) => span.traceId === trace.traceId),
              },
          layout.current,
          mode,
          collapsed,
        )
      : structureGraph(entity, kind);
    const graph = trace ? decorateGraph(trace, baseGraph, showIO) : baseGraph;
    layout.current = baseGraph.nodes;
    setEdges(graph.edges);
    setNodes((previous) => {
      const existing = new Map(previous.map((node) => [node.id, node]));
      return graph.nodes.map((node) => ({
        ...existing.get(node.id),
        ...node,
        type: overview ? "overview" : node.type,
        measured:
          overview !== (existing.get(node.id)?.type === "overview")
            ? undefined
            : existing.get(node.id)?.measured,
        position: overview
          ? { x: (node.position.x * 200) / 420, y: (node.position.y * 340) / 490 }
          : (positions[node.id] ?? node.position),
        selected: trace ? node.id === selectedSpanId : existing.get(node.id)?.selected,
      }));
    });
  }, [
    entity,
    kind,
    trace,
    positions,
    mode,
    selectedSpanId,
    setNodes,
    collapsed,
    showHistory,
    showIO,
    overview,
  ]);
  useEffect(() => {
    if (!nodes.length || !instance || nodes.some((node) => (node.type === "overview") !== overview))
      return;
    const frame = requestAnimationFrame(() => {
      const added = nodes.filter((node) => !seen.current.has(node.id));
      seen.current = new Set(nodes.map((node) => node.id));
      if (!fitted.current) {
        fitted.current = true;
        if (overview && container.current) {
          void instance.setViewport(
            overviewViewport(nodes, {
              width: container.current.clientWidth,
              height: container.current.clientHeight,
            }),
          );
        } else if (trace && container.current) {
          completed.current = Boolean(traceRoot(trace)?.endTime);
          focused.current = selectedSpanId;
          if (selectedSpanId) setFollowing(false);
          void instance.setViewport(
            initialTraceViewport(
              nodes,
              {
                width: container.current.clientWidth,
                height: container.current.clientHeight,
              },
              compact,
              selectedSpanId ?? defaultGraphFocus(trace, nodes),
              !selectedSpanId,
            ),
          );
        } else {
          const width = container.current?.clientWidth ?? 800;
          const height = container.current?.clientHeight ?? 600;
          const graphWidth = Math.max(...nodes.map((node) => node.position.x + 350));
          const graphHeight = Math.max(...nodes.map((node) => node.position.y + 200));
          const zoom = Math.max(0.9, Math.min(1, (width - 64) / graphWidth));
          // Keep labels readable; larger structures can be panned horizontally.
          void instance.setViewport({
            x: Math.max(32, (width - graphWidth * zoom) / 2),
            y: Math.max(60, (height - graphHeight * zoom) / 2),
            zoom,
          });
        }
        return;
      }
      if (overview) return;
      if (focused.current !== selectedSpanId && container.current) {
        focused.current = selectedSpanId;
        const selected = nodes.find((node) => node.id === selectedSpanId);
        if (selected) {
          setFollowing(false);
          void instance.setViewport(
            initialTraceViewport(
              nodes,
              {
                width: container.current.clientWidth,
                height: container.current.clientHeight,
              },
              compact,
              selectedSpanId,
            ),
            { duration: 200 },
          );
          return;
        }
      }
      if (!trace || !following || !container.current) return;
      if (traceRoot(trace)?.endTime && !completed.current) {
        completed.current = true;
        void instance.setViewport(
          initialTraceViewport(
            nodes,
            {
              width: container.current.clientWidth,
              height: container.current.clientHeight,
            },
            compact,
            defaultGraphFocus(trace, nodes),
            true,
          ),
          { duration: 200 },
        );
        return;
      }
      const candidates = followLatest.current ? nodes : added;
      followLatest.current = false;
      const latest = [...candidates].sort(
        (a, b) =>
          Date.parse(b.data.span?.startTime ?? "") - Date.parse(a.data.span?.startTime ?? "") ||
          b.position.x - a.position.x,
      )[0];
      if (!latest) return;
      const viewport = instance.getViewport();
      const next = followViewport(viewport, latest.position, {
        width: container.current.clientWidth,
        height: container.current.clientHeight,
      });
      if (next.x !== viewport.x || next.y !== viewport.y) {
        void instance.setViewport(next, { duration: 200 });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [nodes, instance, following, trace, selectedSpanId, compact, overview]);
  useEffect(() => {
    const element = container.current;
    if (!element || !instance || (!selectedSpanId && !overview)) return;
    let width = element.clientWidth;
    let height = element.clientHeight;
    const observer = new ResizeObserver(() => {
      if (width === element.clientWidth && height === element.clientHeight) return;
      width = element.clientWidth;
      height = element.clientHeight;
      if (overview) {
        void instance.setViewport(overviewViewport(instance.getNodes(), { width, height }));
        return;
      }
      const selected = selectedSpanId && instance.getNode(selectedSpanId);
      if (!selected) return;
      // Expanding the inspector should keep the selected card within the remaining canvas.
      void instance.setViewport(
        followViewport(instance.getViewport(), selected.position, { width, height }),
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [instance, selectedSpanId, overview]);
  const lastCommand = useRef<number | undefined>(command?.version);
  useEffect(() => {
    if (!command || !instance || !container.current || lastCommand.current === command.version)
      return;
    lastCommand.current = command.version;
    setFollowing(command.action === "follow");
    if (command.action === "follow") followLatest.current = true;
    if (command.action === "fit") {
      onSelect(null);
      if (trace) {
        if (overview)
          void instance.setViewport(
            overviewViewport(instance.getNodes(), {
              width: container.current.clientWidth,
              height: container.current.clientHeight,
            }),
            { duration: 200 },
          );
        else {
          setOverview(true);
          fitted.current = false;
        }
      } else void instance.fitView({ padding: 0.2, minZoom: 0.85, duration: 200 });
    }
    if (command.action === "focus" || command.action === "follow") setOverview(false);
    if (command.action === "focus" && !overview)
      void instance.setViewport(
        initialTraceViewport(
          instance.getNodes(),
          {
            width: container.current.clientWidth,
            height: container.current.clientHeight,
          },
          compact,
          selectedSpanId,
        ),
        { duration: 200 },
      );
    if (command.action === "expand") {
      layout.current = [];
      setCollapsed(new Set());
    }
  }, [command, instance, compact, selectedSpanId, overview, trace, onSelect]);
  const pauseFollowing = () => setFollowing(false);
  return (
    <div
      className={`execution-graph ${overview ? "overview" : ""}`}
      ref={container}
      style={{ "--overview-zoom": overviewZoom } as CSSProperties}
    >
      <SpanNodeContext.Provider
        value={{ trace, onSelect, compact, onWorkflowAction, onToggleGroup: toggleGroup }}
      >
        <ReactFlow
          onInit={setInstance}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => {
            setOverview(false);
            onSelect(node.data);
            if (instance && container.current && instance.getZoom() < 0.85 && !overview)
              void instance.setViewport(
                initialTraceViewport(
                  nodes,
                  {
                    width: container.current.clientWidth,
                    height: container.current.clientHeight,
                  },
                  compact,
                  node.id,
                ),
                { duration: 200 },
              );
          }}
          onPaneClick={() => onSelect(null)}
          onNodeDragStart={pauseFollowing}
          onNodeDragStop={(_, node) => {
            if (!overview) savePositions({ ...positions, [node.id]: node.position });
          }}
          nodesDraggable={!overview}
          onMove={(_, viewport) => {
            if (overview) setOverviewZoom(viewport.zoom);
          }}
          onMoveStart={(event) => {
            if (event) pauseFollowing();
          }}
          nodesConnectable={false}
          panOnScroll
          zoomOnScroll={false}
          minZoom={overview ? 0.55 : 0.15}
          maxZoom={1.7}
          colorMode="dark"
        >
          <Background gap={24} size={1} color="#30343a" />
          {trace && (
            <Panel position="bottom-left" className="graph-legend">
              {overview ? "Overview · select a step to inspect" : "Time order · scroll to pan"}
            </Panel>
          )}
          {overview && (
            <Panel position="top-left">
              <button type="button" onClick={() => setOverview(false)}>
                Back to cards
              </button>
            </Panel>
          )}
          <Controls
            showInteractive={false}
            showFitView={false}
            onZoomIn={pauseFollowing}
            onZoomOut={pauseFollowing}
          />
          {nodes.length > 3 && !overview && (
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) =>
                node.data.status ? `var(--status-${node.data.status})` : "#45534d"
              }
              maskColor="rgba(17,20,23,.65)"
            />
          )}
        </ReactFlow>
      </SpanNodeContext.Provider>
    </div>
  );
}
