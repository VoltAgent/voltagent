import { useQuery } from "@tanstack/react-query";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useState } from "react";
import { type Span, type Trace, api, pretty } from "../lib/api";
import {
  displaySpanStatus,
  isCancelledCheckpoint,
  spanExplanations,
} from "../lib/execution-insights";
import { type GraphData, traceGraph } from "../lib/graph";
import { spanIO } from "../lib/span-details";
import { extraMessageSets, record, spanError } from "../lib/span-insights";
import { latestRequestMessage, modelOutcome, stepRole } from "../lib/step-preview";
import { formatDuration, spanDuration, spanKind, spanLabel } from "../lib/trace-presentation";
import { CopyValue, DetailSection, MessageList, RecordedValue } from "./recorded-value";
import { StatusBadge } from "./run-status";
import {
  AttributeDetails,
  EventsDetails,
  MessagesDetails,
  SpanDetailsAI,
  UsageDetails,
} from "./span-details-ai";

export function Inspector({
  data,
  onClose,
  onWorkflowStep,
  onInspect,
  onShowChat,
  trace,
}: {
  data: GraphData;
  onClose: () => void;
  onWorkflowStep?: () => void;
  onInspect?: (span: Span) => void;
  onShowChat?: () => void;
  trace?: Trace;
}) {
  const [tab, setTab] = useState("details");
  const [expanded, setExpanded] = useState(false);
  const span = data.span;
  const logs = useQuery({
    queryKey: ["logs", span?.spanId],
    queryFn: () =>
      api<unknown>(`/observability/spans/${encodeURIComponent(span?.spanId ?? "")}/logs`),
    enabled: Boolean(span) && tab === "logs",
    refetchInterval: tab === "logs" ? 3000 : false,
  });
  const { input, output } = span ? spanIO(span) : { input: undefined, output: undefined };
  const value =
    tab === "input"
      ? input
      : tab === "output"
        ? output
        : tab === "events"
          ? span?.events
          : tab === "logs"
            ? logs.data
            : data.detail;
  return (
    <section className={`inspector ${expanded ? "expanded" : ""}`}>
      <div className="panel-heading">
        <div>
          <small>{span ? stepRole(span, trace) : data.kind}</small>
          <h2>{data.label}</h2>
        </div>
        <div className="inspector-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={expanded ? "Collapse details panel" : "Expand details panel"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close node details"
          >
            <X size={17} />
          </button>
        </div>
      </div>
      {span && (
        <div className="span-metrics">
          {data.status && (
            <StatusBadge status={data.status} label={displaySpanStatus(span, trace)} />
          )}
          <span>{data.subtitle}</span>
        </div>
      )}
      {onWorkflowStep && (
        <button type="button" className="step-action" onClick={onWorkflowStep}>
          {data.status === "suspended" && !(span && isCancelledCheckpoint(span, trace))
            ? "Resume workflow"
            : data.kind === "workflow"
              ? "Execution controls"
              : "Replay from this step"}
        </button>
      )}
      {onShowChat && (
        <button type="button" className="step-chat-link" onClick={onShowChat}>
          Show tool call in chat
        </button>
      )}
      <div className="tabs">
        {(span ? ["details", "input", "output"] : ["details"]).map((item) => (
          <button
            type="button"
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => setTab(item)}
          >
            {item === "details" ? "Summary" : item}
          </button>
        ))}
        {span && (
          <select
            aria-label="More step details"
            value={["details", "input", "output"].includes(tab) ? "" : tab}
            onChange={(event) => setTab(event.target.value)}
          >
            <option value="" disabled>
              More details
            </option>
            {extraMessageSets(span).length > 0 && <option value="messages">Messages</option>}
            <option value="attributes">Attributes</option>
            <option value="events">Events</option>
            <option value="logs">Logs</option>
          </select>
        )}
      </div>
      <div className="inspector-content">
        {tab !== "details" && (
          <CopyValue
            value={tab === "messages" && span ? extraMessageSets(span) : value}
            label={`Copy ${tab}`}
          />
        )}
        {logs.error && tab === "logs" ? (
          <div className="error-box">{logs.error.message}</div>
        ) : (
          <InspectorContent
            tab={tab}
            span={span}
            trace={trace}
            value={value}
            onInspect={onInspect}
          />
        )}
        {!!data.internalSpans?.length && tab === "details" && (
          <details className="internal-spans">
            <summary>{data.internalSpans.length} internal spans</summary>
            <p>Memory and model bookkeeping recorded within this operation.</p>
            {data.internalSpans.map((internal) => (
              <button type="button" key={internal.spanId} onClick={() => onInspect?.(internal)}>
                <span>{spanLabel(internal)}</span>
                <small>{formatDuration(spanDuration(internal))}</small>
              </button>
            ))}
          </details>
        )}
      </div>
    </section>
  );
}

export function TraceInspector({
  data,
  trace,
  sources,
  workflow,
  running,
  onSelectRun,
  onClose,
  onInspect,
  onShowChat,
}: {
  data: GraphData;
  trace?: Trace;
  sources: Trace[];
  workflow: boolean;
  running: boolean;
  onSelectRun: (trace: Trace, stepId?: string) => void;
  onClose: () => void;
  onInspect: (span: Span) => void;
  onShowChat?: () => void;
}) {
  const detail =
    data.span && trace
      ? (traceGraph(trace).nodes.find((node) => node.id === data.span?.spanId)?.data ?? data)
      : data;
  const stepId = detail.span?.attributes["workflow.step.id"];
  const source = sources.find((item) => item.traceId === detail.span?.traceId);
  const onWorkflowStep =
    workflow &&
    !running &&
    (typeof stepId === "string" || detail.kind === "workflow") &&
    source &&
    source.traceId === trace?.traceId
      ? () => onSelectRun(source, typeof stepId === "string" ? stepId : undefined)
      : undefined;
  return (
    <Inspector
      key={detail.span?.spanId ?? detail.label}
      data={detail}
      onClose={onClose}
      onWorkflowStep={onWorkflowStep}
      onInspect={onInspect}
      onShowChat={onShowChat}
      trace={trace}
    />
  );
}

function InspectorContent({
  tab,
  span,
  trace,
  value,
  onInspect,
}: { tab: string; span?: Span; trace?: Trace; value: unknown; onInspect?: (span: Span) => void }) {
  if (tab === "details" && span)
    return <StepSummary span={span} trace={trace} onInspect={onInspect} />;
  if (tab === "messages" && span) return <MessagesDetails span={span} />;
  if (tab === "attributes" || !span) return <AttributeDetails value={value} />;
  if (tab === "events") return <EventsDetails events={span.events ?? []} />;
  if (tab === "logs") {
    const logs = record(value)?.logs ?? value;
    return Array.isArray(logs) ? <EventsDetails events={logs} /> : <pre>{pretty(value)}</pre>;
  }
  return <RecordedValue value={value} expandSmall />;
}

export function StepSummary({
  span,
  trace,
  onInspect,
}: { span: Span; trace?: Trace; onInspect?: (span: Span) => void }) {
  const { input, output } = spanIO(span);
  const error = spanError(span);
  const model = spanKind(span) === "llm";
  const latest = model ? latestRequestMessage(input) : undefined;
  const outcome = model ? modelOutcome(span) : undefined;
  return (
    <div className="step-summary">
      {spanExplanations(span, trace).map((note) => (
        <p className="notice" key={note}>
          {note}
        </p>
      ))}
      {error.message !== undefined && <div className="error-box">{pretty(error.message)}</div>}
      {outcome && <p className="node-semantic-summary">{outcome}</p>}
      <DetailSection
        title={latest === undefined ? "Input" : "Latest request message"}
        value={latest === undefined ? input : undefined}
        open
      >
        {latest === undefined ? (
          <RecordedValue value={input} expandSmall />
        ) : (
          <div className="step-request-preview">
            <MessageList messages={[latest]} showIndex={false} />
          </div>
        )}
      </DetailSection>
      {latest !== undefined && (
        <DetailSection title="All request messages" value={input}>
          <RecordedValue value={input} />
        </DetailSection>
      )}
      <DetailSection title="Output" value={output} open>
        <RecordedValue value={output} expandSmall />
      </DetailSection>
      <UsageDetails span={span} trace={trace} compact />
      <DetailSection title="Configuration & telemetry">
        <SpanDetailsAI span={span} trace={trace} onInspect={onInspect} />
      </DetailSection>
    </div>
  );
}
