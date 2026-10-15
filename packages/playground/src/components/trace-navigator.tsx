import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Span, Trace } from "../lib/api";
import { displaySpanStatus, spanExplanations } from "../lib/execution-insights";
import { stepPreview, stepRole } from "../lib/step-preview";
import {
  formatDuration,
  overviewSpans,
  spanDuration,
  spanLabel,
  spanStatus,
  statusLabels,
} from "../lib/trace-presentation";
import { StatusIcon } from "./run-status";

export function TraceNavigator({
  trace,
  selectedId,
  onSelect,
  onClose,
}: {
  trace: Trace;
  selectedId?: string;
  onSelect: (span: Span) => void;
  onClose: () => void;
}) {
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    searchInput.current?.focus();
  }, []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [internals, setInternals] = useState(false);
  const spans = [...(internals ? trace.spans : overviewSpans(trace).spans)].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const matches = spans.filter(
    (span) =>
      (status === "all" || spanStatus(span) === status) &&
      `${spanLabel(span, trace.spans)} ${span.spanId} ${stepPreview(span) ?? ""} ${stepRole(span, trace)} ${spanExplanations(span, trace).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <nav
      id="execution-steps"
      className="step-browser"
      aria-label="Execution steps"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="step-browser-heading">
        <strong>Steps</strong>
        <button type="button" className="icon-button" aria-label="Close steps" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="step-browser-filters">
        <label>
          <Search size={14} />
          <input
            ref={searchInput}
            aria-label="Search steps"
            placeholder="Find a step or reason…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter step status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <label className="step-browser-internals">
        <input
          type="checkbox"
          checked={internals}
          onChange={(event) => setInternals(event.target.checked)}
        />{" "}
        Include internal spans
      </label>
      <div className="step-browser-list">
        {matches.map((span) => (
          <button
            type="button"
            key={span.spanId}
            aria-current={selectedId === span.spanId ? "step" : undefined}
            onClick={() => {
              onSelect(span);
              onClose();
            }}
          >
            <StatusIcon status={spanStatus(span)} size={13} />
            <span>
              <strong>{spanLabel(span, trace.spans)}</strong>
              <small className="step-preview" title={stepPreview(span)}>
                {stepPreview(span)}
              </small>
              <small>
                {stepRole(span, trace)} · {span.traceId !== trace.traceId ? "Previous run · " : ""}
                {displaySpanStatus(span, trace)}
              </small>
            </span>
            <small>{formatDuration(spanDuration(span))}</small>
          </button>
        ))}
        {!matches.length && <p className="muted">No steps match these filters.</p>}
      </div>
    </nav>
  );
}
