import { useState } from "react";
import { type Entity, type EntityKind, jsonInput, parseObject } from "../lib/api";
import type { TestCase } from "../lib/test-cases";
import type { CaseExpectations } from "../lib/test-checks";
import { JsonEditor } from "./json-editor";
import { Settings, callOptions } from "./settings";

export function TestCases({
  entity,
  kind,
  cases,
  onChange,
  editing,
  onEdit,
  onPrepare,
  running,
}: {
  entity: Entity;
  kind: EntityKind;
  cases: TestCase[];
  onChange: (cases: TestCase[]) => void;
  editing?: TestCase;
  onEdit: (test?: TestCase) => void;
  onPrepare: (test: TestCase) => void;
  running: boolean;
}) {
  const local = cases.filter((test) => test.kind === kind && test.entityId === entity.id);
  return (
    <section className="test-cases">
      <div className="panel-heading">
        <h2>Test cases</h2>
      </div>
      <p className="muted">
        Choose Save test on a run result, define your checks, then repeat it with the same input and
        overrides. Cases and baseline results stay in this browser.
      </p>
      {editing ? (
        <CaseEditor
          key={editing.id}
          test={editing}
          entity={entity}
          onCancel={() => onEdit(undefined)}
          onSave={(test) => {
            onChange([...cases.filter((item) => item.id !== test.id), test]);
            onEdit(undefined);
          }}
        />
      ) : (
        <>
          {!local.length && (
            <p>No saved cases for this {kind}. Run it once, then choose “Save test” in Result.</p>
          )}
          {local.map((test) => (
            <article key={test.id} className="test-case-row">
              <strong>{test.name}</strong>
              <span className="muted">Baseline: {test.baseline.result.status}</span>
              <div className="button-row">
                <button type="button" disabled={running} onClick={() => onPrepare(test)}>
                  Prepare run
                </button>
                <button type="button" onClick={() => onEdit(test)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onChange(cases.filter((item) => item.id !== test.id))}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </>
      )}
    </section>
  );
}

function CaseEditor({
  test,
  entity,
  onSave,
  onCancel,
}: { test: TestCase; entity: Entity; onSave: (test: TestCase) => void; onCancel: () => void }) {
  const [name, setName] = useState(test.name);
  const [input, setInput] = useState(jsonInput(test.input) ?? "");
  const [settings, setSettings] = useState(test.settings);
  const [expectations, setExpectations] = useState<CaseExpectations>(test.expectations ?? {});
  const [tools, setTools] = useState(test.expectations?.tools?.join(", ") ?? "");
  const [error, setError] = useState<string>();
  return (
    <form
      className="case-editor"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const value: unknown = JSON.parse(input);
          if (!name.trim()) throw new Error("Give this case a name.");
          if (test.kind === "agent" && typeof value !== "string" && !Array.isArray(value))
            throw new Error("Agent input must be a JSON string or a message array.");
          if (test.kind === "agent") callOptions(settings);
          else parseObject(settings.context, "Context");
          onSave({
            ...test,
            name: name.trim(),
            input: value,
            settings,
            expectations: {
              ...expectations,
              tools: [
                ...new Set(
                  tools
                    .split(",")
                    .map((tool) => tool.trim())
                    .filter(Boolean),
                ),
              ],
            },
            baseline: { ...test.baseline, name: name.trim() },
          });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }}
    >
      <label className="field">
        <span>Case name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <JsonEditor
        label="Case input · JSON"
        value={input}
        onChange={setInput}
        schema={test.kind === "workflow" ? entity.inputSchema : undefined}
      />
      <Settings
        entity={entity}
        settings={settings}
        onChange={setSettings}
        isolated
        workflow={test.kind === "workflow"}
      />
      <fieldset className="case-expectations">
        <legend>
          Success checks <span>optional</span>
        </legend>
        <label className="field">
          <span>Expected execution status</span>
          <select
            value={expectations.status ?? ""}
            onChange={(event) =>
              setExpectations({
                ...expectations,
                status: (event.target.value || undefined) as CaseExpectations["status"],
              })
            }
          >
            <option value="">Do not check</option>
            <option value="success">Completed</option>
            <option value="error">Failed (expected error)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="field">
          <span>Output must contain</span>
          <input
            value={expectations.outputIncludes ?? ""}
            placeholder="Exact text, case-sensitive"
            onChange={(event) =>
              setExpectations({ ...expectations, outputIncludes: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Required tool calls</span>
          <input
            value={tools}
            placeholder="search, getWeather"
            onChange={(event) => setTools(event.target.value)}
          />
          <small>
            Comma-separated tool names. Checks that a call was recorded, including failed calls.
          </small>
        </label>
        <p className="muted">
          Checks use recorded trace data. Missing output is marked unavailable, never passed.
        </p>
      </fieldset>
      <p className="notice">
        {test.source === "request"
          ? "Input and overrides were captured from this browser’s request."
          : "Reconstructed from recorded trace fields. Unreported settings use the current runtime defaults; review them before running."}{" "}
        Each test starts with a fresh user and conversation. Server memory, external data and code
        are not snapshotted.
      </p>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <div className="button-row">
        <button type="submit">Save case</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
