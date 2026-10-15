import { useState } from "react";
import { type Span, type Trace, pretty } from "../lib/api";
import { spanExplanations } from "../lib/execution-insights";
import { spanIO, spanValue, tokenUsage, valueDiff } from "../lib/span-details";
import {
  extraMessageSets,
  insightSections,
  modelNames,
  parameterRows,
  parseRecorded,
  promptContext,
  record,
  spanError,
} from "../lib/span-insights";
import { formatDuration, spanDuration, spanKind, spanStatus } from "../lib/trace-presentation";
import { CopyValue, DetailSection, JsonTree, MessageList, RecordedValue } from "./recorded-value";

export function UsageDetails({
  span,
  trace,
  compact = false,
}: { span: Span; trace?: Trace; compact?: boolean }) {
  const usage = tokenUsage(span);
  const context = promptContext(span, trace);
  const metrics = Object.entries(usage).filter(([, value]) => value !== undefined);
  const call = span.attributes["llm.provider_attempt"] === true;
  const kind = spanKind(span);
  const scope = call
    ? "This call"
    : kind === "agent" || kind === "delegate"
      ? "Agent total"
      : kind === "llm"
        ? "Model loop total"
        : kind === "workflow"
          ? "Workflow total"
          : "Recorded usage";
  if (!metrics.length && !context && !call) return null;
  if (compact) {
    return (
      <details
        className="node-field-section node-usage"
        onClick={(event) => event.stopPropagation()}
      >
        <summary>
          {usage.total !== undefined
            ? `${scope} · ${usage.total.toLocaleString()} tokens`
            : call
              ? "This call · usage not recorded"
              : "Context estimate (not usage)"}
          {usage.input !== undefined && usage.output !== undefined && (
            <small>
              {usage.input.toLocaleString()} in / {usage.output.toLocaleString()} out
            </small>
          )}
          {!call && usage.total === undefined && context?.total !== undefined && (
            <small>~{context.total.toLocaleString()} tokens</small>
          )}
        </summary>
        <UsageDetails span={span} trace={trace} />
      </details>
    );
  }
  return (
    <div className="ai-usage">
      {call && !metrics.length && (
        <p className="muted">
          Token usage not recorded for this call. Agent totals are shown separately.
        </p>
      )}
      {metrics.length > 0 && (
        <>
          <div className="ai-section-label">
            {scope} · token usage <strong>{usage.total?.toLocaleString()}</strong>
          </div>
          {usage.input !== undefined &&
            usage.output !== undefined &&
            usage.input + usage.output > 0 && (
              <div
                className="usage-bar"
                aria-label={`Input ${usage.input} tokens, output ${usage.output} tokens`}
              >
                <span style={{ width: `${(usage.input / (usage.input + usage.output)) * 100}%` }} />
                <span />
              </div>
            )}
          <div className="ai-metric-grid">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value?.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {context && (
        <div className="context-estimate">
          <div className="ai-section-label">
            Context estimate (not usage){" "}
            <small>
              {context.calls} {context.calls === 1 ? "request" : "requests"}
            </small>
          </div>
          <div className="ai-metric-grid">
            {(["system", "messages", "tools", "total"] as const)
              .filter((key) => context[key] !== undefined)
              .map((key) => (
                <div key={key}>
                  <small>{key}</small>
                  <strong>~{context[key]?.toLocaleString()}</strong>
                </div>
              ))}
          </div>
          <p className="muted">
            Estimates from serialized request context, separate from provider token usage. Retries
            and repeated context are counted per request; child agents are excluded.
          </p>
        </div>
      )}
    </div>
  );
}

export function ParameterSchema({ value }: { value: unknown }) {
  const rows = parameterRows(value);
  return rows.length ? (
    <div className="parameter-list">
      {rows.map((row) => (
        <div key={row.name}>
          <strong>
            {row.name}
            {row.required && <span className="error"> *</span>}
          </strong>
          <code>{row.type}</code>
          {row.description && <p>{row.description}</p>}
          {row.choices && (
            <small>Values: {row.choices.map((choice) => pretty(choice)).join(", ")}</small>
          )}
        </div>
      ))}
    </div>
  ) : (
    <JsonTree value={value} />
  );
}

export function ValueChange({
  title,
  before,
  after,
  open = true,
  labels,
}: {
  title: string;
  before: unknown;
  after: unknown;
  open?: boolean;
  labels?: { initial: string; final: string; diff: string };
}) {
  const [view, setView] = useState<"initial" | "final" | "diff">("diff");
  return (
    <DetailSection title={title} open={open}>
      <div className="segmented">
        {(["initial", "final", "diff"] as const).map((item) => (
          <button
            type="button"
            className={view === item ? "active" : ""}
            key={item}
            onClick={() => setView(item)}
          >
            {labels?.[item] ?? item}
          </button>
        ))}
      </div>
      {view === "diff" ? (
        <div className="value-diff">
          {valueDiff(before, after).map((row, index) => (
            <div className={row.type} key={`${index}-${row.type}`}>
              <span>{row.type === "added" ? "+" : row.type === "removed" ? "−" : " "}</span>
              {row.line}
            </div>
          ))}
        </div>
      ) : (
        <RecordedValue value={view === "initial" ? before : after} />
      )}
    </DetailSection>
  );
}

export function MessagesDetails({ span }: { span: Span }) {
  const sets = extraMessageSets(span);
  return sets.length ? (
    <>
      {sets.map((set, index) => (
        <DetailSection
          title={`${set.label} (${set.messages.length})`}
          key={set.label}
          value={set.messages}
          open={index === 0}
        >
          <MessageList messages={set.messages} />
        </DetailSection>
      ))}
    </>
  ) : (
    <p className="muted">No messages recorded for this span.</p>
  );
}

export function AttributeDetails({ value }: { value: unknown }) {
  const [search, setSearch] = useState("");
  const attributes = record(value);
  const filtered =
    attributes && search
      ? Object.fromEntries(
          Object.entries(attributes).filter(([key, item]) =>
            `${key} ${pretty(item)}`.toLowerCase().includes(search.toLowerCase()),
          ),
        )
      : value;
  return (
    <div className="attribute-details">
      <input
        aria-label="Search attributes"
        placeholder="Search attribute names or values…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <JsonTree value={filtered} />
    </div>
  );
}

export function EventsDetails({ events }: { events: unknown[] }) {
  return events.length ? (
    <div className="recorded-events">
      {events.map((value, index) => {
        const event = record(value);
        return (
          <DetailSection
            key={`${String(event?.name ?? event?.severityText)}-${String(event?.timestamp ?? event?.time)}-${index}`}
            title={String(event?.name ?? event?.severityText ?? `Event ${index + 1}`)}
            open={index === 0}
            value={value}
          >
            {event?.time !== undefined && <small>{pretty(event.time)}</small>}
            {event?.timestamp !== undefined && <small>{String(event.timestamp)}</small>}
            {event?.body !== undefined && <RecordedValue value={event.body} />}
            <JsonTree value={event?.attributes ?? event ?? value} />
          </DetailSection>
        );
      })}
    </div>
  ) : (
    <p className="muted">No events recorded.</p>
  );
}

const payloads: Array<[title: string, ...keys: string[]]> = [
  ["Instructions", "agent.instructions", "agent.system.prompt"],
  ["Context", "agent.context", "context"],
  ["Available tools", "llm.tools"],
  ["Provider options", "llm.provider_options"],
  ["Working memory template", "memory.working.template"],
  ["Working memory schema", "memory.working.schema"],
  ["Summary text", "agent.summary.text", "agent.summary.preview"],
  ["Agent state", "agent.stateSnapshot"],
  ["Workflow state", "workflow.stateSnapshot"],
];

function MemoryAndGuardrailChanges({ span }: { span: Span }) {
  const memoryBefore = spanValue(
    span,
    "agent.workingMemory.content",
    "working_memory.previous",
    "working_memory.before",
    "memory.working.previous_content",
  );
  const memoryAfter = spanValue(
    span,
    "agent.workingMemory.finalContent",
    "working_memory.updated",
    "working_memory.after",
    "memory.working.content",
  );
  return (
    <>
      {memoryBefore !== undefined || memoryAfter !== undefined ? (
        <ValueChange title="Working memory" before={memoryBefore} after={memoryAfter} />
      ) : null}
      {(["input", "output"] as const).map((direction) => {
        const before = span.attributes[`guardrail.${direction}.original`];
        const after =
          span.attributes[`guardrail.${direction}.after`] ??
          span.attributes[`guardrail.${direction}.current`];
        return before !== undefined || after !== undefined ? (
          <ValueChange
            key={direction}
            title={`Guardrail ${direction} · before / after`}
            before={before}
            after={after}
          />
        ) : null;
      })}
    </>
  );
}

export function PlanDetails({ span }: { span: Span }) {
  const todos = parseRecorded(span.attributes["planagent.todos"]);
  if (!Array.isArray(todos)) return null;
  return (
    <DetailSection title="Todo list" value={todos} open>
      <p className="muted">
        {["done", "in_progress", "pending", "total"]
          .filter((key) => span.attributes[`planagent.todos.${key}`] !== undefined)
          .map((key) => `${span.attributes[`planagent.todos.${key}`]} ${key.replaceAll("_", " ")}`)
          .join(" · ")}
      </p>
      {span.attributes["planagent.todos.truncated"] === true && (
        <p className="notice">This trace contains a partial todo snapshot.</p>
      )}
      <ul className="recorded-todos">
        {todos.map((value, index) => {
          const todo = record(value);
          return (
            <li key={String(todo?.id ?? index)}>
              <span className={todo?.status === "done" ? "done" : ""}>
                {String(todo?.status ?? "pending").replaceAll("_", " ")}
              </span>
              <span>{String(todo?.content ?? pretty(value))}</span>
            </li>
          );
        })}
      </ul>
    </DetailSection>
  );
}

export function SpanDetailsAI({
  span,
  trace,
  onInspect,
}: { span: Span; trace?: Trace; onInspect?: (span: Span) => void }) {
  const error = spanError(span);
  const cancelled = spanStatus(span) === "cancelled";
  const models = modelNames(span, trace);
  const schema = spanValue(
    span,
    "tool.parameters",
    "tool.input_schema",
    "parameters",
    "inputSchema",
  );
  const links = span.links ?? [];
  return (
    <div className="span-details-ai">
      {spanExplanations(span, trace).map((note) => (
        <p className="notice" key={note}>
          {note}
        </p>
      ))}
      {(error.message !== undefined || error.stack !== undefined) && (
        <DetailSection title={cancelled ? "Cancellation reason" : "Error"} open value={error}>
          {error.type !== undefined && (
            <strong className={cancelled ? "cancelled" : "error"}>{String(error.type)}</strong>
          )}
          <div className={`error-box ${cancelled ? "cancelled" : ""}`}>{pretty(error.message)}</div>
          {error.stack !== undefined && <pre className="error-stack">{pretty(error.stack)}</pre>}
        </DetailSection>
      )}
      <UsageDetails span={span} trace={trace} />
      {models.length > 1 && (
        <DetailSection title="Models used" open>
          <div className="insight-tags">
            {models.map((model) => (
              <code key={model}>{model}</code>
            ))}
          </div>
        </DetailSection>
      )}
      {insightSections(span).map((section) => (
        <DetailSection
          key={section.title}
          title={section.title}
          open={["Model", "Tool", "Guardrail", "Workflow"].includes(section.title)}
        >
          <dl className="insight-fields">
            {section.fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>
                  {typeof field.value === "object" ? (
                    <JsonTree value={field.value} />
                  ) : (
                    pretty(field.value)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </DetailSection>
      ))}
      {schema !== undefined && (
        <DetailSection title="Parameters" value={schema}>
          <ParameterSchema value={schema} />
        </DetailSection>
      )}
      <MemoryAndGuardrailChanges span={span} />
      <MiddlewareChanges span={span} />
      <PlanDetails span={span} />
      {payloads.map(([title, ...keys]) => {
        const value = spanValue(span, ...keys);
        return value !== undefined ? (
          <DetailSection
            key={title}
            title={title}
            value={value}
            open={title === "Instructions" || title === "Context"}
          >
            <RecordedValue value={value} />
          </DetailSection>
        ) : null;
      })}
      {links.length > 0 && (
        <DetailSection title="Linked traces" open>
          {links.map((link, index) => {
            const target = trace?.spans.find(
              (item) =>
                item.traceId === link.traceId && (!link.spanId || item.spanId === link.spanId),
            );
            return (
              <div className="recorded-link" key={`${link.traceId}-${index}`}>
                <small>{String(link.attributes?.["link.type"] ?? "Related trace")}</small>
                <code>{link.traceId}</code>
                {target && onInspect ? (
                  <button type="button" onClick={() => onInspect(target)}>
                    Inspect linked span
                  </button>
                ) : (
                  <CopyValue value={link.traceId} label="Copy trace ID" />
                )}
              </div>
            );
          })}
        </DetailSection>
      )}
      <DetailSection title="Timing & identity">
        <dl className="insight-fields">
          <div>
            <dt>Start</dt>
            <dd>{new Date(span.startTime).toLocaleString()}</dd>
          </div>
          <div>
            <dt>End</dt>
            <dd>{span.endTime ? new Date(span.endTime).toLocaleString() : "Running"}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{formatDuration(spanDuration(span))}</dd>
          </div>
        </dl>
        {(
          [
            ["Trace ID", span.traceId],
            ["Span ID", span.spanId],
            ["Parent span ID", span.parentSpanId],
          ] as const
        ).map(
          ([label, value]) =>
            value && (
              <div className="identity-field" key={label}>
                <small>{label}</small>
                <code>{value}</code>
                <CopyValue value={value} label={`Copy ${label}`} />
              </div>
            ),
        )}
      </DetailSection>
    </div>
  );
}

export function MiddlewareChanges({ span }: { span: Span }) {
  const direction = span.attributes["middleware.direction"];
  if (direction !== "input" && direction !== "output") return null;
  const before = span.attributes[`middleware.${direction}.current`];
  const after = span.attributes[`middleware.${direction}.after`];
  if (before === undefined && after === undefined) return null;
  return (
    <ValueChange title={`Middleware ${direction} · before / after`} before={before} after={after} />
  );
}
