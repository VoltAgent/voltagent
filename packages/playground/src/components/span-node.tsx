import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
  Bot,
  Braces,
  Clock3,
  Cpu,
  Database,
  Eye,
  FunctionSquare,
  Gauge,
  GitBranch,
  Layers,
  ListTree,
  Repeat2,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { createContext, useContext } from "react";
import { type Trace, pretty, readableError } from "../lib/api";
import { descendantIds, displaySpanStatus, spanExplanations } from "../lib/execution-insights";
import { type GraphData, type GraphNode, traceGraph } from "../lib/graph";
import { spanCardContent } from "../lib/node-content";
import { middlewareChange, scorerResult, workflowStepSummary } from "../lib/node-semantics";
import { spanError } from "../lib/span-insights";
import { runSummary, spanLabel } from "../lib/trace-presentation";
import { StatusBadge, StatusIcon } from "./run-status";
import { SpanNodeContent } from "./span-node-content";

export const SpanNodeContext = createContext<{
  trace?: Trace;
  onSelect: (data: GraphData) => void;
  compact?: boolean;
  onToggleGroup?: (id: string) => void;
  onWorkflowAction?: (span: import("../lib/api").Span) => void;
}>({ onSelect: () => {} });

function nodePresentation(kind: string) {
  if (kind === "middleware") return { Icon: SlidersHorizontal, section: "Middleware" };
  if (kind === "scorer") return { Icon: Gauge, section: "Evaluation" };
  if (kind.includes("tool")) return { Icon: Wrench, section: "Tool" };
  if (kind.includes("llm")) return { Icon: Cpu, section: "Model" };
  if (kind.includes("memory")) return { Icon: Database, section: "Memory" };
  if (kind.includes("guardrail")) return { Icon: ShieldCheck, section: "Guardrail" };
  if (kind.includes("workflow")) return { Icon: GitBranch, section: "Workflow" };
  if (kind === "summary") return { Icon: Braces, section: "Summary" };
  if (kind.includes("agent")) return { Icon: Bot, section: "Model" };
  return { Icon: Braces, section: "Knowledge & retrieval" };
}

export function SpanNode({ data, selected }: NodeProps<GraphNode>) {
  const { trace, onSelect, compact, onToggleGroup } = useContext(SpanNodeContext);
  const span = data.span;
  if (!span) return null;
  const kind = data.kind.toLowerCase();
  const presentation = nodePresentation(kind);
  const stepType = String(span.attributes["workflow.step.type"] ?? "");
  const stepIcons = {
    agent: Bot,
    workflow: GitBranch,
    branch: GitBranch,
    "conditional-when": GitBranch,
    func: FunctionSquare,
    "parallel-all": Layers,
    "parallel-race": Layers,
    foreach: ListTree,
    loop: Repeat2,
    sleep: Clock3,
    "sleep-until": Clock3,
    guardrail: ShieldCheck,
    tap: FunctionSquare,
    map: Braces,
  };
  const Icon = stepIcons[stepType as keyof typeof stepIcons] ?? presentation.Icon;
  const evaluation = scorerResult(span);
  const change = middlewareChange(span);
  const content = spanCardContent(span, trace);
  const error = spanError(span);
  const origin = trace && runSummary(trace).issue;
  const sameFailure =
    origin &&
    trace &&
    origin.spanId !== span.spanId &&
    (descendantIds(trace.spans, span.spanId).has(origin.spanId) ||
      (kind === "llm" &&
        !span.attributes["llm.provider_attempt"] &&
        span.parentSpanId === origin.parentSpanId)) &&
    error.message !== undefined &&
    String(spanError(origin).message).replace(/^\w*Error:\s*/, "") ===
      String(error.message).replace(/^\w*Error:\s*/, "");
  return (
    <div
      className={`console-node ${compact ? "compact" : ""} ${data.status ?? ""} ${selected ? "selected" : ""}`}
    >
      <Handle type="target" position={Position.Left} style={{ top: 27 }} />
      <Handle type="source" position={Position.Right} style={{ top: 27 }} />
      <header className="console-node-header">
        <Icon size={16} />
        <strong title={data.label}>{data.label}</strong>
        <span className="console-node-duration">
          {compact && data.status === "success" ? (
            <span title="Completed" aria-label="Completed">
              <StatusIcon status="success" size={12} />
            </span>
          ) : (
            <Clock3 size={11} />
          )}
          {data.subtitle}
        </span>
      </header>
      <div className="console-node-body nodrag nowheel">
        <div className="console-node-kind">
          <span>{content.role}</span>
          {data.status && (!compact || data.status !== "success") && (
            <StatusBadge status={data.status} label={displaySpanStatus(span, trace)} />
          )}
        </div>
        {span.traceId !== trace?.traceId && (
          <p className="node-explanation">Previous run · historical status</p>
        )}
        {spanExplanations(span, trace).map((note) => (
          <p className="node-explanation" key={note}>
            {note}
          </p>
        ))}
        {sameFailure && trace ? (
          <button
            type="button"
            className="node-failure-source"
            onClick={(event) => {
              event.stopPropagation();
              const cause = traceGraph(trace).nodes.find((node) => node.id === origin.spanId);
              if (cause) onSelect(cause.data);
            }}
          >
            Failure from {spanLabel(origin, trace.spans)} →
          </button>
        ) : (
          error.message !== undefined && (
            <div className="node-error">{readableError(pretty(error.message))}</div>
          )
        )}
        {kind === "middleware" && (
          <p className="node-semantic-summary">
            {String(span.attributes["middleware.direction"] ?? "")} ·{" "}
            {change ?? "No result recorded"}
          </p>
        )}
        {evaluation && (
          <div className="node-score">
            <strong>{evaluation.score ?? "—"}</strong>
            <span>
              {evaluation.verdict ?? evaluation.status}
              {evaluation.threshold !== undefined && (
                <small>Threshold {evaluation.threshold}</small>
              )}
            </span>
          </div>
        )}
        {workflowStepSummary(span, trace).map((line) => (
          <p className="node-semantic-summary" key={line}>
            {line}
          </p>
        ))}
        <SpanNodeContent span={span} trace={trace} content={content} detailed={!compact} />
        {Boolean(data.descendantCount) && (
          <button
            type="button"
            className="node-group-toggle"
            onClick={(event) => {
              event.stopPropagation();
              onToggleGroup?.(span.spanId);
            }}
            aria-expanded={!data.collapsedCount}
          >
            {data.collapsedCount ? "Expand" : "Collapse"} {data.descendantCount} steps
            {Boolean(data.collapsedCount) && <small>{data.groupSummary}</small>}
          </button>
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
        <Eye size={13} /> Details{" "}
        {data.internalSpans?.length ? <span>+{data.internalSpans.length} internal</span> : null}
      </button>
    </div>
  );
}
