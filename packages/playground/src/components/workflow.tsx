import { safeStringify } from "@voltagent/internal";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  type Entity,
  type RunTarget,
  type StreamEvent,
  type WorkflowState,
  api,
  consumeSSE,
  jsonInput,
  parseObject,
  pretty,
  readableError,
} from "../lib/api";
import { replayInput, workflowSteps } from "../lib/run-context";
import { schemaSample } from "../lib/schema";
import { useStoredState } from "../lib/storage";
import type { RunDraft } from "../lib/test-cases";
import { workflowOutcome } from "../lib/workflow-outcome";
import { EntityGuide } from "./entity-guide";
import { JsonEditor } from "./json-editor";
import { CopyValue, RecordedValue } from "./recorded-value";
import { Settings, initialSettings } from "./settings";
import { ParameterSchema, ValueChange } from "./span-details-ai";

export function WorkflowRunner({
  entity,
  draft,
  onRunning,
  onRun,
  target,
  onExecution,
  onPrepare,
}: {
  target?: RunTarget;
  entity: Entity;
  draft?: RunDraft;
  onRunning: (running: boolean) => void;
  onRun: (identity?: RunTarget, draft?: RunDraft) => void;
  onExecution?: (identity: RunTarget) => void;
  onPrepare?: () => void;
}) {
  const [settings, setSettings] = useStoredState(
    `settings.workflow.${entity.id}`,
    initialSettings(),
    draft?.settings,
  );
  const [input, setInput] = useStoredState(
    `input.${entity.id}`,
    jsonInput(schemaSample(entity.inputSchema)),
    draft ? jsonInput(draft.input) : undefined,
  );
  const [settingsValid, setSettingsValid] = useState(true);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [savedExecution, saveExecution] = useStoredState(`execution.${entity.id}`, "");
  const initialExecution = useRef(target ? (target.executionId ?? "") : savedExecution);
  const [executionId, setExecutionId] = useState<string>(() =>
    target ? (target.executionId ?? "") : savedExecution,
  );
  const [status, setStatus] = useState("idle");
  const [screen, setScreen] = useState<"input" | "result">(() =>
    initialExecution.current ? "result" : "input",
  );
  const [submittedInput, setSubmittedInput] = useState<unknown>();
  const [error, setError] = useState<string>();
  const [controlBusy, setControlBusy] = useState(false);
  const [resumeData, setResumeData] = useState("{}");
  const [stepId, setStepId] = useState(target?.stepId ?? "");
  const [state, setState] = useState<WorkflowState>();
  const [replayData, setReplayData] = useState("{}");
  const [stateOverride, setStateOverride] = useState("");
  const [restoring, setRestoring] = useState(Boolean(initialExecution.current));
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((status === "completed" || status === "error") && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [status]);
  const steps = entity.steps ?? [];
  const selectedStep = steps.find((step) => step.id === stepId);
  const resumeSchema = selectedStep?.resumeSchema ?? entity.resumeSchema;
  const replayIndex = steps.findIndex((step) => step.id === stepId);
  const recordedReplayInput = replayInput(state, stepId, steps);
  const jsonError = (value: string) => {
    try {
      JSON.parse(value);
      return undefined;
    } catch {
      return "Enter valid JSON";
    }
  };
  const resumeError = jsonError(resumeData);
  const replayError = jsonError(replayData);
  let editedReplayInput: unknown;
  if (!replayError) editedReplayInput = JSON.parse(replayData);
  const outcome = workflowOutcome(events, state);
  const stateRef = useRef(state);
  stateRef.current = state;
  const selectStep = useCallback(
    (id: string, snapshot = stateRef.current) => {
      setStepId(id);
      const recorded = replayInput(snapshot, id, entity.steps ?? []);
      setReplayData(recorded === undefined ? "" : jsonInput(recorded));
      setResumeData(
        pretty(
          schemaSample(
            workflowSteps(entity.steps).find((step) => step.id === id)?.resumeSchema ??
              entity.resumeSchema,
          ),
        ),
      );
    },
    [entity.steps, entity.resumeSchema],
  );
  const controller = useRef<AbortController | undefined>(undefined);
  const running = status === "running";
  useEffect(() => {
    onRunning(status === "running" || controlBusy);
    return () => onRunning(false);
  }, [status, controlBusy, onRunning]);
  useEffect(() => () => controller.current?.abort(), []);
  const path = `/workflows/${encodeURIComponent(entity.id)}`;
  const receive = useCallback(
    (event: StreamEvent) => {
      setEvents((previous) => [...previous.slice(-499), event]);
      if (typeof event.executionId === "string") {
        setExecutionId(event.executionId);
        saveExecution(event.executionId);
        onExecution?.({ executionId: event.executionId });
      }
      if (event.type === "workflow-start") setStatus("running");
      if (event.type === "workflow-suspended") setStatus("suspended");
      if (event.type === "workflow-cancelled") setStatus("cancelled");
      if (event.type === "workflow-error" || event.type === "error") setStatus("error");
      if (event.type === "workflow-result" || event.type === "workflow-complete")
        setStatus(typeof event.status === "string" ? event.status : "completed");
    },
    [saveExecution, onExecution],
  );
  const restoration = useRef({
    steps: entity.steps,
    stepId: target?.stepId,
    selectStep,
    automatic: target === undefined,
    savedExecution,
  });
  useEffect(() => {
    if (!initialExecution.current) return;
    const abort = new AbortController();
    controller.current = abort;
    const executionPath = `${path}/executions/${encodeURIComponent(initialExecution.current)}`;
    let restored = false;
    void (async () => {
      const state = await api<WorkflowState>(`${executionPath}/state`, undefined, abort.signal);
      if (abort.signal.aborted) return;
      restored = true;
      setState(state);
      setSubmittedInput(state.input);
      onExecution?.({ executionId: initialExecution.current });
      setStatus(state.status);
      setEvents(state.events ?? [{ type: "restored-state", data: state }]);
      if (state.input !== undefined) setInput(jsonInput(state.input));
      const id =
        restoration.current.stepId ??
        restoration.current.steps?.[state.suspension?.stepIndex ?? -1]?.id ??
        "";
      restoration.current.selectStep(id, state);
      setRestoring(false);
      if (state.status === "running" || state.status === "suspended") {
        await consumeSSE(
          await fetch(`/api${executionPath}/stream`, { signal: abort.signal }),
          receive,
        );
      }
    })().catch((error) => {
      if (!abort.signal.aborted) {
        const missing = !restored && error instanceof ApiError && error.status === 404;
        if (missing) {
          if (restoration.current.savedExecution === initialExecution.current) saveExecution("");
          initialExecution.current = "";
        }
        setRestoring(false);
        setError(
          missing && restoration.current.automatic
            ? undefined
            : `Previous execution unavailable: ${error instanceof Error ? error.message : String(error)}`,
        );
        setStatus("idle");
        setScreen("input");
        setExecutionId("");
      }
    });
    return () => abort.abort();
  }, [path, receive, setInput, onExecution, saveExecution]);
  useEffect(() => {
    if (!executionId || status === "idle" || status === "running" || restoring) return;
    const abort = new AbortController();
    void api<WorkflowState>(
      `${path}/executions/${encodeURIComponent(executionId)}/state`,
      undefined,
      abort.signal,
    )
      .then((snapshot) => {
        if (abort.signal.aborted) return;
        setState(snapshot);
        const suspendedStep = entity.steps?.[snapshot.suspension?.stepIndex ?? -1]?.id;
        if (suspendedStep) selectStep(suspendedStep, snapshot);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [executionId, path, status, restoring, entity.steps, selectStep]);
  const run = async () => {
    let started = false;
    try {
      const data: unknown = JSON.parse(input);
      const context = parseObject(settings.context, "Context");
      setError(undefined);
      started = true;
      setSubmittedInput(data);
      setScreen("result");
      setEvents([]);
      setState(undefined);
      setExecutionId("");
      saveExecution("");
      setStatus("running");
      onRun(undefined, { input: data, settings, source: "request" });
      controller.current?.abort();
      controller.current = new AbortController();
      const response = await fetch(`/api${path}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.current.signal,
        body: safeStringify({
          input: data,
          options: { userId: settings.userId, conversationId: settings.conversationId, context },
        }),
      });
      await consumeSSE(response, receive);
      setStatus((previous) => (previous === "running" ? "completed" : previous));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setError(error instanceof Error ? error.message : String(error));
        if (started) setStatus("error");
      }
    }
  };
  const control = async (action: "suspend" | "cancel" | "resume" | "replay") => {
    if (!executionId) return;
    try {
      setError(undefined);
      setControlBusy(true);
      const body =
        action === "resume"
          ? { resumeData: JSON.parse(resumeData), options: { stepId: stepId || undefined } }
          : action === "replay"
            ? {
                stepId,
                inputData: JSON.parse(replayData),
                resumeData: JSON.parse(resumeData),
                ...(stateOverride.trim()
                  ? { workflowStateOverride: parseObject(stateOverride, "Workflow state") }
                  : {}),
              }
            : {};
      if (action === "resume" || action === "replay") setStatus("running");
      if (action === "replay" || action === "resume")
        onRun(action === "resume" ? { executionId } : undefined);
      const data = await api<{ status?: string; executionId?: string; result?: unknown }>(
        `${path}/executions/${encodeURIComponent(executionId)}/${action}`,
        body,
      );
      setStatus(
        data.status ??
          (action === "suspend" ? "suspended" : action === "cancel" ? "cancelled" : "completed"),
      );
      setEvents((previous) => [...previous, { type: action, ...data }]);
      if (action === "cancel") controller.current?.abort();
      const nextId = data.executionId ?? executionId;
      onExecution?.({ executionId: nextId });
      const snapshot = await api<WorkflowState>(
        `${path}/executions/${encodeURIComponent(nextId)}/state`,
      );
      setState(snapshot);
      setSubmittedInput(snapshot.input);
      setStatus(snapshot.status);
      setEvents(snapshot.events ?? [{ type: action, ...data }]);
      if (action === "replay" && data.executionId) {
        setExecutionId(data.executionId);
        saveExecution(data.executionId);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setStatus(status);
    } finally {
      setControlBusy(false);
    }
  };
  return (
    <section className="runner">
      <div className="panel-heading">
        <h2>{screen === "input" ? "New run" : workflowHeading(status)}</h2>
        {screen === "result" ? (
          <button
            type="button"
            className="quiet-button"
            disabled={running || controlBusy || restoring}
            onClick={() => {
              setScreen("input");
              setError(undefined);
              onPrepare?.();
            }}
          >
            New run
          </button>
        ) : (
          executionId && (
            <button
              type="button"
              className="quiet-button"
              onClick={() => {
                setScreen("result");
                setError(undefined);
                onExecution?.({ executionId });
              }}
            >
              Back to result
            </button>
          )
        )}
      </div>
      {screen === "input" && (
        <>
          <EntityGuide entity={entity} />
          <Settings
            settings={settings}
            onChange={setSettings}
            workflow
            disabled={running || controlBusy || restoring}
            onValidity={setSettingsValid}
          />
        </>
      )}
      {restoring && <p className="notice">Loading execution state…</p>}
      <div className="workflow-body" ref={bodyRef}>
        {(error || (screen === "result" && outcome.error)) && (
          <div className="error-box" role="alert">
            {readableError(error ?? outcome.error ?? "Workflow failed")}
          </div>
        )}
        {screen === "result" && (
          <>
            {status === "suspended" && (
              <p className="notice" role="status">
                Enter resume data below, then select Resume.
              </p>
            )}
            {state?.metadata?.bailed === true && (
              <p className="notice">
                Ended early (bail) at{" "}
                {String(
                  state.metadata.bailStepName ?? state.metadata.bailStepId ?? "a workflow step",
                )}
                . Subsequent steps did not run.
              </p>
            )}
            {status === "completed" && outcome.result !== undefined && (
              <section className="workflow-result" aria-label="Workflow result">
                <h3>
                  Result <CopyValue value={outcome.result} label="Copy workflow result" />
                </h3>
                <RecordedValue value={outcome.result} />
              </section>
            )}
          </>
        )}
        {screen === "input" && (
          <>
            <div className="field">
              <span>Input · JSON</span>
              <JsonEditor
                label="Input · JSON"
                value={input}
                onChange={setInput}
                schema={entity.inputSchema}
              />
            </div>
            <button
              type="button"
              disabled={running || restoring}
              onClick={() => setInput(jsonInput(schemaSample(entity.inputSchema)))}
            >
              Use schema example
            </button>
            <details className="schema">
              <summary>Input schema</summary>
              <pre>{pretty(entity.inputSchema)}</pre>
            </details>
            <div className="button-row">
              <button
                type="button"
                className="primary run-button"
                disabled={!settingsValid || running || controlBusy || restoring}
                onClick={() => {
                  void run();
                }}
              >
                <Play size={15} />
                Run workflow
              </button>
            </div>
          </>
        )}
        {screen === "result" && executionId && (running || status === "suspended") && (
          <div className="button-row workflow-controls">
            {status === "suspended" && (
              <button
                type="button"
                className="primary"
                disabled={
                  status !== "suspended" ||
                  controlBusy ||
                  Boolean(resumeError) ||
                  Boolean(stepId && !selectedStep)
                }
                onClick={() => {
                  void control("resume");
                }}
              >
                <Play size={13} />
                Resume
              </button>
            )}
            {status === "running" && (
              <button type="button" disabled={controlBusy} onClick={() => void control("suspend")}>
                <Pause size={14} /> Suspend
              </button>
            )}
            <button type="button" disabled={controlBusy} onClick={() => void control("cancel")}>
              <Square size={14} /> Cancel
            </button>
          </div>
        )}
        {screen === "result" && (
          <>
            {submittedInput !== undefined && (
              <details className="run-input">
                <summary>Run input</summary>
                <RecordedValue value={submittedInput} />
              </details>
            )}
            {executionId && (
              <details open={status === "suspended" || Boolean(target?.stepId)}>
                <summary>Resume / replay</summary>
                <p className="notice">
                  Resume continues this checkpoint. Replay options start a separate execution.
                </p>
                {stepId && !selectedStep && (
                  <p className="notice">
                    This is a nested step. Choose its top-level container to replay it.
                  </p>
                )}
                <details open={status === "suspended"} className="resume-form">
                  <summary>Resume data</summary>
                  <p className="muted">
                    Passed to the suspended step as resumeData. This does not replace its original
                    input.
                  </p>
                  {resumeSchema ? (
                    <details>
                      <summary>Resume schema</summary>
                      <ParameterSchema value={resumeSchema} />
                    </details>
                  ) : (
                    <p className="muted">
                      No resume schema reported. Check the step instructions for expected fields.
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={controlBusy}
                    onClick={() => setResumeData(jsonInput(schemaSample(resumeSchema)))}
                  >
                    Use resume schema example
                  </button>
                  <div className="field">
                    <span>Resume data · JSON</span>
                    <JsonEditor
                      label="Resume data · JSON"
                      value={resumeData}
                      onChange={setResumeData}
                      schema={resumeSchema}
                    />
                  </div>
                  {resumeError && <p className="error">Resume data: {resumeError}</p>}
                </details>
                <details
                  className="replay-form"
                  open={Boolean(target?.stepId) && status !== "suspended"}
                >
                  <summary>Replay options</summary>
                  <label className="field">
                    <span>Top-level step</span>
                    <select
                      value={stepId}
                      onChange={(event) => selectStep(event.target.value)}
                      disabled={controlBusy || restoring}
                    >
                      <option value="">Suspended step (resume default)</option>
                      {steps
                        .filter((step) => step.id)
                        .map((step) => (
                          <option key={step.id} value={step.id}>
                            {step.name ?? step.id} · {step.type}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p className="notice">
                    {replayIndex >= 0
                      ? `Replay will run: ${steps
                          .slice(replayIndex)
                          .map((step) => step.name ?? step.id ?? step.type)
                          .join(" → ")}. Nested branches follow their runtime conditions.`
                      : "Choose a step to preview the replay scope."}
                  </p>
                  <div className="field">
                    <span>Replay input · JSON</span>
                    <JsonEditor
                      label="Replay input · JSON"
                      value={replayData}
                      onChange={setReplayData}
                      schema={selectedStep?.inputSchema}
                    />
                  </div>
                  {replayError && <p className="error">Replay input: {replayError}</p>}
                  {selectedStep?.inputSchema && (
                    <details>
                      <summary>Selected step input schema</summary>
                      <ParameterSchema value={selectedStep.inputSchema} />
                    </details>
                  )}
                  {!replayError && (
                    <details>
                      <summary>Review replay input changes</summary>
                      <ValueChange
                        title="Recorded input → replay input"
                        before={recordedReplayInput}
                        after={editedReplayInput}
                      />
                    </details>
                  )}
                  <details>
                    <summary>Workflow state override</summary>
                    <p className="muted">Leave empty to preserve the execution’s stored state.</p>
                    <JsonEditor
                      label="Workflow state override"
                      value={stateOverride}
                      onChange={setStateOverride}
                    />
                    <pre>
                      {pretty(state?.suspension?.checkpoint?.workflowState ?? state?.workflowState)}
                    </pre>
                  </details>
                  <div className="button-row">
                    <button
                      type="button"
                      disabled={
                        !selectedStep ||
                        Boolean(replayError) ||
                        Boolean(resumeError) ||
                        !replayData.trim() ||
                        status === "running" ||
                        controlBusy ||
                        restoring
                      }
                      onClick={() => {
                        void control("replay");
                      }}
                    >
                      <RotateCcw size={13} />
                      Replay from step
                    </button>
                  </div>
                </details>
              </details>
            )}
            <details className="execution-details">
              <summary>Execution details · {events.length} events</summary>
              {executionId && (
                <div className="execution-id">
                  Execution <code>{executionId}</code>
                </div>
              )}
              {events.length === 0 && (
                <p className="muted">Run the workflow to inspect each step as it executes.</p>
              )}
              <div className="events">
                {events.map((event, index) => (
                  <details key={`${index}-${event.type}`}>
                    <summary>
                      <span
                        className={`event-dot ${event.type.includes("error") ? "error" : ""}`}
                      />
                      <strong>{event.type}</strong>
                      <span>{event.from}</span>
                    </summary>
                    <pre>{pretty(event)}</pre>
                  </details>
                ))}
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  );
}

function workflowHeading(status: string): string {
  const labels: Record<string, string> = {
    running: "Running",
    suspended: "Waiting to resume",
    completed: "Completed",
    error: "Failed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? "Run result";
}
