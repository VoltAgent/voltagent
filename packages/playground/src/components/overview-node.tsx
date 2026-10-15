import { Handle, type NodeProps, Position } from "@xyflow/react";
import { useContext } from "react";
import { displaySpanStatus, spanExplanations } from "../lib/execution-insights";
import type { GraphNode } from "../lib/graph";
import { nodeValuePreview } from "../lib/node-content";
import { stepPreview, stepRole } from "../lib/step-preview";
import { statusLabels } from "../lib/trace-presentation";
import { StatusIcon } from "./run-status";
import { SpanNodeContext } from "./span-node";

/** An overview is a summary of the flow, rather than a scaled-down full inspector. */
export function OverviewNode({ data, selected }: NodeProps<GraphNode>) {
  const { trace } = useContext(SpanNodeContext);
  const preview = data.span
    ? (spanExplanations(data.span, trace)[0] ?? stepPreview(data.span))
    : data.detail === undefined
      ? undefined
      : nodeValuePreview(data.detail);
  const status =
    data.status && (data.span ? displaySpanStatus(data.span, trace) : statusLabels[data.status]);
  return (
    <div className={`overview-node ${data.status ?? ""} ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <small>
        {data.span && trace && data.span.traceId !== trace.traceId ? "Previous · " : ""}
        {data.span ? stepRole(data.span, trace) : data.kind}
      </small>
      <strong title={data.label}>{data.label}</strong>
      <p title={preview}>{preview ?? "No input recorded"}</p>
      <footer>
        {data.status && (
          <span title={status}>
            <StatusIcon status={data.status} size={12} />
            {status}
          </span>
        )}
        <span>{data.subtitle}</span>
      </footer>
    </div>
  );
}
