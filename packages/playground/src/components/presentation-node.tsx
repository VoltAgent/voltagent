import { Handle, type NodeProps, Position } from "@xyflow/react";
import { useContext } from "react";
import type { Span } from "../lib/api";
import type { GraphNode } from "../lib/graph";
import { RecordedValue } from "./recorded-value";
import { StatusBadge } from "./run-status";
import { SpanNodeContext } from "./span-node";

export function PresentationNode({ data }: NodeProps<GraphNode>) {
  const { onSelect, onWorkflowAction, compact, trace } = useContext(SpanNodeContext);
  return (
    <div
      className={`console-node presentation-node ${compact ? "compact" : ""} ${data.status ?? ""}`}
    >
      <Handle type="target" position={Position.Left} style={{ top: 27 }} />
      <Handle type="source" position={Position.Right} style={{ top: 27 }} />
      <header className="console-node-header">
        <strong>{data.label}</strong>
        {data.status && <StatusBadge status={data.status} />}
      </header>
      <div
        className="presentation-value nodrag nowheel"
        onClick={(event) => event.stopPropagation()}
      >
        <RecordedValue value={data.detail} />
      </div>
      {data.kind === "pause" &&
        onWorkflowAction &&
        (!trace || (data.sourceSpan as Span)?.traceId === trace.traceId) && (
          <button
            type="button"
            className="node-workflow-action nodrag"
            onClick={(event) => {
              event.stopPropagation();
              onWorkflowAction(data.sourceSpan as Span);
            }}
          >
            Resume workflow
          </button>
        )}
      <button type="button" className="console-node-inspect nodrag" onClick={() => onSelect(data)}>
        Details
      </button>
    </div>
  );
}
