import type { Span, Trace } from "../lib/api";
import { pretty } from "../lib/api";
import { nodeValuePreview, type spanCardContent } from "../lib/node-content";
import { type InsightField, parameterRows } from "../lib/span-insights";
import { modelOutcome, stepPreview } from "../lib/step-preview";
import { spanKind } from "../lib/trace-presentation";
import { CopyValue, RecordedValue } from "./recorded-value";
import { MiddlewareChanges, ParameterSchema, PlanDetails, UsageDetails } from "./span-details-ai";

export function CardValue({
  label,
  value,
  preview,
}: { label: string; value: unknown; preview?: string }) {
  if (value === undefined) return null;
  const text = preview ?? nodeValuePreview(value);
  return (
    <details className="node-value nodrag nowheel" onClick={(event) => event.stopPropagation()}>
      <summary>
        <span className="node-value-label">
          <span>{label}</span>
          <small>Expand</small>
        </span>
        <span className="node-value-preview" title={text}>
          {text.length > 240 ? `${text.slice(0, 240)}…` : text}
        </span>
      </summary>
      <div className="node-value-full">
        <CopyValue value={value} label={`Copy ${label}`} />
        <RecordedValue value={value} expandSmall />
      </div>
    </details>
  );
}

export function NodeFields({ fields }: { fields: InsightField[] }) {
  if (!fields.length) return null;
  return (
    <dl className="node-facts">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd title={pretty(field.value)}>
            {typeof field.value === "boolean" ? (field.value ? "Yes" : "No") : pretty(field.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function NodeParameters({ value }: { value: unknown }) {
  if (value === undefined) return null;
  const rows = parameterRows(value);
  return (
    <details className="node-value nodrag nowheel" onClick={(event) => event.stopPropagation()}>
      <summary>
        <span className="node-value-label">
          <span>Parameters{rows.length ? ` · ${rows.length}` : ""}</span>
          <small>Expand</small>
        </span>
        {rows.length > 0 && (
          <span className="node-value-preview">
            {rows.map((row) => `${row.name}${row.required ? "*" : "?"}: ${row.type}`).join(" · ")}
          </span>
        )}
      </summary>
      <div className="node-value-full">
        <ParameterSchema value={value} />
      </div>
    </details>
  );
}

export function SpanNodeContent({
  span,
  trace,
  content,
  detailed,
}: {
  span: Span;
  trace?: Trace;
  content: ReturnType<typeof spanCardContent>;
  detailed: boolean;
}) {
  const kind = spanKind(span);
  const model = kind === "llm";
  const outcome = model ? modelOutcome(span) : undefined;
  const primaryLabels = new Set(content.fields.map((field) => field.label));
  const extraSections = content.sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => !primaryLabels.has(field.label)),
    }))
    .filter((section) => section.fields.length);
  return (
    <>
      {outcome && <p className="node-semantic-summary">{outcome}</p>}
      {!model && kind !== "tool" && <NodeFields fields={content.fields} />}
      {content.payloads.map((payload) => (
        <CardValue
          key={payload.label}
          {...payload}
          preview={model && payload.label === "Messages" ? stepPreview(span) : undefined}
        />
      ))}
      <UsageDetails span={span} trace={trace} compact />
      <CardValue label="Description" value={content.description} />
      {model ? (
        <details className="node-field-section" onClick={(event) => event.stopPropagation()}>
          <summary>Configuration</summary>
          <NodeFields fields={content.fields} />
        </details>
      ) : kind === "tool" ? (
        <NodeFields fields={content.fields} />
      ) : null}
      <NodeParameters value={content.schema} />
      <PlanDetails span={span} />
      {!content.payloads.length && <p className="node-missing">Input / output not recorded</p>}
      {detailed && (
        <>
          <MiddlewareChanges span={span} />
          {extraSections.map((section) => (
            <details
              className="node-field-section"
              key={section.title}
              onClick={(event) => event.stopPropagation()}
            >
              <summary>{section.title}</summary>
              <NodeFields fields={section.fields} />
            </details>
          ))}
        </>
      )}
    </>
  );
}
