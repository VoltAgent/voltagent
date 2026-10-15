import { safeStringify } from "@voltagent/internal";
import { useEffect, useState } from "react";
import { type Trace, api, pretty } from "../lib/api";
import { comparableRun, debugTrace, recordedSettings } from "../lib/run-debug";
import type { RunNote } from "../lib/run-notes";
import type { CaseBaseline } from "../lib/test-cases";
import { runTitle, traceRoot } from "../lib/trace-presentation";
import { CopyValue, RecordedValue } from "./recorded-value";
import { RunChecks } from "./run-review";
import { ValueChange } from "./span-details-ai";

export function RunDebug({
  trace,
  traces,
  shareUrl,
  note,
  onNote,
  onSaveCase,
  caseBaseline,
  embedded = false,
}: {
  trace: Trace;
  traces: Trace[];
  shareUrl?: string;
  note?: RunNote;
  onNote?: (note: RunNote) => void;
  onSaveCase?: () => void;
  caseBaseline?: CaseBaseline;
  embedded?: boolean;
}) {
  const [baseline, setBaseline] = useState(caseBaseline ? "__saved_case" : "");
  const [open, setOpen] = useState(Boolean(caseBaseline));
  useEffect(() => {
    if (caseBaseline) {
      setBaseline("__saved_case");
      setOpen(true);
    }
  }, [caseBaseline]);
  const [file, setFile] = useState<{ url: string; name: string; data: unknown }>();
  useEffect(
    () => () => {
      if (file) URL.revokeObjectURL(file.url);
    },
    [file],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const before = traces.find((item) => item.traceId === baseline);
  const left = baseline === "__saved_case" ? caseBaseline?.result : before && comparableRun(before);
  const right = comparableRun(trace);
  const comparisonLabels = { initial: "Baseline", final: "Selected run", diff: "Changes" };
  const download = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const ids = [...new Set(trace.spans.map((span) => span.traceId))];
      const logs = await Promise.all(
        ids.map(async (id) => {
          try {
            return {
              traceId: id,
              ...(await api<{ logs: unknown[] }>(
                `/observability/traces/${encodeURIComponent(id)}/logs`,
              )),
            };
          } catch (cause) {
            return { traceId: id, logs: [], error: String(cause) };
          }
        }),
      );
      const data = {
        format: "voltagent-playground-debug",
        version: 1,
        exportedAt: new Date().toISOString(),
        trace: debugTrace(trace),
        browserPendingAction: traceRoot(trace)?.attributes["playground.pending_action"],
        logs,
      };
      const url = URL.createObjectURL(
        new Blob([safeStringify(data, { indentation: 2 })], { type: "application/json" }),
      );
      setFile({ url, name: `voltagent-trace-${trace.traceId}.json`, data });
      if (logs.some((item) => "error" in item))
        setError(
          "Debug file prepared. Some logs were unavailable; the file includes the fetch errors.",
        );
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };
  const body = (
    <div className="run-debug-body">
      {embedded && (
        <div className="panel-heading">
          <h2>Compare runs</h2>
        </div>
      )}
      <div className="button-row">
        <label className="field">
          <span>Baseline run</span>
          <select value={baseline} onChange={(event) => setBaseline(event.target.value)}>
            <option value="">Choose a baseline</option>
            {caseBaseline && <option value="__saved_case">Reference · {caseBaseline.name}</option>}
            {traces
              .filter((item) => item.traceId !== trace.traceId)
              .map((item) => (
                <option key={item.traceId} value={item.traceId}>
                  {new Date(traceRoot(item)?.startTime ?? "").toLocaleString()} · {runTitle(item)}
                </option>
              ))}
          </select>
        </label>
      </div>
      {!left && (
        <p className="muted">
          Choose a baseline to compare output, input, timing, tokens and settings. Select Run again
          on a result to prepare a new run with its baseline attached.
        </p>
      )}
      {left && (
        <>
          {baseline === "__saved_case" && (
            <p role="status">
              Compared with saved baseline. Review output and settings changes; this comparison does
              not grade answer quality.
            </p>
          )}
          <table className="run-comparison">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Baseline</th>
                <th>Selected run</th>
              </tr>
            </thead>
            <tbody>
              {(["status", "duration", "tokens", "tools"] as const).map((key) => (
                <tr key={key}>
                  <th>{key === "duration" ? "Duration (ms)" : key}</th>
                  <td>
                    {pretty(
                      key === "duration" && left[key] !== undefined
                        ? Math.round(left[key])
                        : left[key],
                    )}
                  </td>
                  <td>
                    {pretty(
                      key === "duration" && right[key] !== undefined
                        ? Math.round(right[key])
                        : right[key],
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Comparisons show baseline → selected run. Missing values mean the runtime did not report
            them.
          </p>
          <p className="comparison-outcome">
            {left.output === undefined || right.output === undefined
              ? "Output comparison incomplete: one run has no recorded output."
              : pretty(left.output) === pretty(right.output)
                ? "Output unchanged"
                : "Output changed"}
          </p>
          <ValueChange
            title="Output comparison"
            before={left.output}
            after={right.output}
            labels={comparisonLabels}
          />
          <ValueChange
            title="Input comparison"
            before={left.input}
            after={right.input}
            labels={comparisonLabels}
            open={false}
          />
          <ValueChange
            title="Recorded settings comparison"
            before={left.settings}
            after={right.settings}
            labels={comparisonLabels}
            open={false}
          />
          {baseline === "__saved_case" && (
            <RunChecks trace={trace} expectations={caseBaseline?.expectations} />
          )}
        </>
      )}
      <details className="run-organization" open={!caseBaseline}>
        <summary>Organize & export</summary>
        {onSaveCase && (
          <button
            type="button"
            className="save-test-case"
            onClick={() => {
              onSaveCase();
              setOpen(false);
            }}
          >
            Save as test case
          </button>
        )}
        {onNote && (
          <div className="run-note-editor">
            <label className="field">
              <span>Run name</span>
              <input
                placeholder={runTitle(trace)}
                value={note?.name ?? ""}
                onChange={(event) =>
                  onNote({ name: event.target.value, pinned: note?.pinned ?? false })
                }
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={note?.pinned ?? false}
                onChange={(event) =>
                  onNote({ name: note?.name ?? "", pinned: event.target.checked })
                }
              />{" "}
              Pin this run
            </label>
            <small>Names and pins stay in this browser.</small>
          </div>
        )}
        {shareUrl && <CopyValue value={shareUrl} label="Copy run link" />}
        <button type="button" disabled={busy} onClick={() => void download()}>
          {busy ? "Preparing…" : "Prepare debug JSON"}
        </button>
        {file && (
          <div className="button-row">
            <a className="debug-download" href={file.url} download={file.name}>
              Save debug JSON
            </a>
            <CopyValue value={file.data} label="Copy debug JSON" />
          </div>
        )}
        <p className="muted">
          The file includes recorded prompts, outputs, context, linked traces and logs. Nothing is
          uploaded.
        </p>
        {error && <p role="status">{error}</p>}
      </details>
      <details>
        <summary>Recorded effective settings</summary>
        <p className="muted">
          Values captured by this execution, including each model call. Unreported defaults are not
          inferred.
        </p>
        <RecordedValue value={recordedSettings(trace)} />
      </details>
    </div>
  );
  return embedded ? (
    <section className="run-debug embedded">{body}</section>
  ) : (
    <details
      className="run-debug"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Run actions</summary>
      {body}
    </details>
  );
}
