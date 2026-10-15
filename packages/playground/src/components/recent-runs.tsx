import { Pin } from "lucide-react";
import { useState } from "react";
import type { Trace } from "../lib/api";
import { recoveries } from "../lib/execution-insights";
import { historyGroups } from "../lib/run-debug";
import { type RunNotes, runOutcomePreview } from "../lib/run-notes";
import {
  formatDuration,
  runSummary,
  runTitle,
  statusLabels,
  traceRoot,
} from "../lib/trace-presentation";
import { StatusIcon } from "./run-status";

export function RecentRuns({
  traces,
  activeId,
  running,
  onSelect,
  error,
  notes = {},
}: {
  traces: Trace[];
  activeId?: string;
  running: boolean;
  onSelect: (trace: Trace) => void;
  error?: Error | null;
  notes?: RunNotes;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [grouped, setGrouped] = useState(true);
  const filtered = traces.filter((trace) => {
    const summary = runSummary(trace);
    return (
      (filter === "all" || summary.status === filter) &&
      `${notes[trace.traceId]?.name ?? ""} ${runTitle(trace)} ${runOutcomePreview(trace) ?? ""} ${summary.preview ?? ""} ${trace.traceId} ${summary.root?.startTime ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  const groups = (
    grouped
      ? historyGroups(traces, true)
      : traces.map((trace) => ({ id: trace.traceId, traces: [trace] }))
  )
    .map((group) => ({
      ...group,
      traces: group.traces.filter((trace) => filtered.includes(trace)),
    }))
    .filter((group) => group.traces.length)
    .sort(
      (a, b) =>
        Number(b.traces.some((t) => notes[t.traceId]?.pinned)) -
        Number(a.traces.some((t) => notes[t.traceId]?.pinned)),
    );
  const renderRun = (trace: Trace, earlier = false, groupDate?: Date) => {
    const { root, status, duration, issue, tools } = runSummary(trace);
    const date = runDate(trace);
    const title = notes[trace.traceId]?.name.trim() || runTitle(trace);
    const outcome = title.startsWith("Result:") ? undefined : runOutcomePreview(trace);
    const statusText = `${statusLabels[status]}${
      status === "success" && issue
        ? recoveries(trace).length
          ? " · recovered"
          : " · error recorded"
        : ""
    }`;
    const workflow = Boolean(root?.attributes["workflow.execution.id"]);
    const label =
      earlier && workflow && !notes[trace.traceId]?.name.trim()
        ? root?.attributes["workflow.replay.source_trace_id"]
          ? "Replayed run"
          : root?.attributes["workflow.previous_trace_id"]
            ? "Resumed run"
            : "Initial run"
        : title;
    return (
      <button
        type="button"
        key={trace.traceId}
        className={`trace-item ${earlier ? "earlier-run" : ""} ${activeId === trace.traceId ? "active" : ""}`}
        disabled={running}
        onClick={() => onSelect(trace)}
        title={`${title}\n${statusText}${duration === undefined ? "" : ` · ${formatDuration(duration)}`} · ${date?.toLocaleString() ?? trace.traceId}\n${outcome ?? ""}\nTrace ${trace.traceId}`}
        aria-current={activeId === trace.traceId ? "true" : undefined}
      >
        <strong>
          {notes[trace.traceId]?.pinned && <Pin size={11} aria-label="Pinned" />}
          {label}
        </strong>
        {date && (
          <time
            className="run-history-time"
            dateTime={date.toISOString()}
            title={date.toLocaleString()}
          >
            {earlier && date.toDateString() !== groupDate?.toDateString()
              ? `${date.toLocaleDateString([], { month: "short", day: "numeric" })} `
              : ""}
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </time>
        )}
        <span
          className={`run-history-status ${status}`}
          title={`${statusText}${duration === undefined ? "" : ` · ${formatDuration(duration)}${root?.attributes["workflow.previous_trace_id"] ? " this segment" : ""}`}`}
        >
          <StatusIcon status={status} size={11} />
          <span>{statusText}</span>
          {duration !== undefined && (
            <small>
              {formatDuration(duration)}
              {root?.attributes["workflow.previous_trace_id"] ? " segment" : ""}
            </small>
          )}
          {tools > 0 && (
            <small>
              {tools} {tools === 1 ? "tool" : "tools"}
            </small>
          )}
        </span>
      </button>
    );
  };
  return (
    <div className="trace-list">
      <details className="history-filter-options">
        <summary>Filter runs{search || filter !== "all" ? " · active" : ""}</summary>
        <div className="history-filters">
          <input
            aria-label="Search run history"
            placeholder="Find a run…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Filter run status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={grouped}
              onChange={(event) => setGrouped(event.target.checked)}
            />{" "}
            Group related runs
          </label>
        </div>
      </details>
      {groups.map((group, index) => {
        const [latest, ...earlier] = group.traces;
        const pinned = group.traces.some((trace) => notes[trace.traceId]?.pinned);
        const previousPinned = groups[index - 1]?.traces.some(
          (trace) => notes[trace.traceId]?.pinned,
        );
        const date = runDate(latest);
        const previousDate = runDate(groups[index - 1]?.traces[0]);
        return (
          <div key={group.id} className={`history-entry ${pinned ? "pinned-runs" : ""}`}>
            {(index === 0 ||
              pinned !== previousPinned ||
              (!pinned && date?.toDateString() !== previousDate?.toDateString())) && (
              <div className="history-date">{pinned ? "Pinned" : historyDateLabel(date)}</div>
            )}
            {renderRun(latest)}
            {earlier.length > 0 && (
              <details
                className="history-group"
                open={earlier.some(
                  (trace) => trace.traceId === activeId || notes[trace.traceId]?.pinned,
                )}
              >
                <summary>
                  {earlier.length} earlier {earlier.length === 1 ? "run" : "runs"}
                </summary>
                {earlier.map((trace) => renderRun(trace, true, date))}
              </details>
            )}
          </div>
        );
      })}
      {!!traces.length && !filtered.length && (
        <p className="muted sidebar-empty">No runs match these filters.</p>
      )}
      {!traces.length && <p className="muted sidebar-empty">Your local runs will appear here.</p>}
      {error && <p className="error sidebar-empty">{error.message}</p>}
    </div>
  );
}

function runDate(trace?: Trace): Date | undefined {
  const time = trace && traceRoot(trace)?.startTime;
  if (!time) return undefined;
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function historyDateLabel(date?: Date): string {
  if (!date) return "Unknown date";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" as const } : {}),
  });
}
