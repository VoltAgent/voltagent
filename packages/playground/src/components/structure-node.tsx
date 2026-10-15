import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Bot, Braces, Cpu, Database, Eye, GitBranch, ShieldCheck, Wrench } from "lucide-react";
import { useContext } from "react";
import type { GraphNode } from "../lib/graph";
import { record } from "../lib/span-insights";
import { SpanNodeContext } from "./span-node";
import { CardValue, NodeFields, NodeParameters } from "./span-node-content";

const icons = {
  agent: Bot,
  tool: Wrench,
  llm: Cpu,
  memory: Database,
  "working-memory": Database,
  workflow: GitBranch,
  guardrail: ShieldCheck,
};
const configFields: Record<string, string> = {
  model: "Model",
  type: "Type",
  provider: "Provider",
  adapter: "Adapter",
  available: "Available",
  enabled: "Enabled",
  scope: "Scope",
  format: "Format",
  dimensions: "Dimensions",
  operation: "Operation",
  agentId: "Agent",
  needsApproval: "Requires approval",
};

/** Configuration cards deliberately contain no historical execution state. */
export function StructureNode({ data, selected }: NodeProps<GraphNode>) {
  const { onSelect } = useContext(SpanNodeContext);
  const detail = record(data.detail) ?? {};
  const Icon = icons[data.kind as keyof typeof icons] ?? Braces;
  const fields = Object.entries(configFields).flatMap(([key, label]) => {
    const value = detail[key];
    return value !== undefined && value !== null && typeof value !== "object"
      ? [{ label, value }]
      : [];
  });
  for (const [key, label] of [
    ["tools", "Tools"],
    ["subAgents", "Subagents"],
    ["steps", "Steps"],
  ]) {
    const items = detail[key];
    if (Array.isArray(items) && items.length)
      fields.push({
        label,
        value: items
          .map((item) => record(item)?.name ?? record(item)?.id ?? record(item)?.type)
          .filter(Boolean)
          .join(", "),
      });
  }
  const purpose = detail.description ?? detail.purpose;
  return (
    <div className={`console-node structure-node ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} style={{ top: 27 }} />
      <Handle type="source" position={Position.Right} style={{ top: 27 }} />
      <header className="console-node-header">
        <Icon size={16} />
        <strong title={data.label}>{data.label}</strong>
      </header>
      <div className="console-node-body nodrag nowheel">
        <div className="console-node-kind">
          <span>{data.kind}</span>
          <small>Configured</small>
        </div>
        <NodeFields fields={fields} />
        <CardValue label="Description" value={purpose} />
        <CardValue label="Instructions" value={detail.instructions} />
        {data.kind === "tool" ? (
          <NodeParameters value={detail.parameters ?? detail.inputSchema} />
        ) : (
          <CardValue label="Input schema" value={detail.inputSchema} />
        )}
        <CardValue label="Result schema" value={detail.resultSchema} />
        <CardValue label="Resume schema" value={detail.resumeSchema} />
        <CardValue label="Memory" value={detail.memory} />
        {!fields.length && purpose === undefined && detail.instructions === undefined && (
          <CardValue label="Configuration" value={detail} />
        )}
      </div>
      <button
        type="button"
        className="console-node-inspect nodrag"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(data);
        }}
      >
        <Eye size={13} /> Details
      </button>
    </div>
  );
}
