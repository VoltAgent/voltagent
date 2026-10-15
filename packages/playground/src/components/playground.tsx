import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ChevronRight, GitBranch } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Entity,
  type EntityKind,
  type RunTarget,
  type Span,
  type Trace,
  type WorkflowState,
  api,
} from "../lib/api";
import { type CanvasOptions, useCanvasOptions } from "../lib/canvas-options";
import { type GraphData, traceGraph } from "../lib/graph";
import { mergeTraces } from "../lib/live";

import { readRoute, routeUrl } from "../lib/route-state";
import {
  linkedTrace,
  loadTraceAncestors,
  previousTraceId,
  selectActiveTrace,
  traceTarget,
  withCancelledExecutions,
} from "../lib/run-context";
import type { RunNotes } from "../lib/run-notes";
import { readStoredState, useStoredState, writeStoredState } from "../lib/storage";
import { type RunDraft, type TestCase, caseFromTrace, freshCaseDraft } from "../lib/test-cases";
import { overviewSpans, spanStatus, toolCallSpan, traceRoot } from "../lib/trace-presentation";
import { useLiveObservability } from "../lib/use-live-observability";
import { usePendingActions } from "../lib/use-pending-actions";
import { useTestCases } from "../lib/use-test-cases";
import { workflowHistory } from "../lib/workflow-history";
import { BuildUpdate } from "./build-update";
import { Chat } from "./chat";
import { ExecutionControls } from "./execution-controls";
import { ExecutionGraph } from "./graph";
import { TraceInspector } from "./inspector";
import { PanelResizer } from "./panel-resizer";
import { type Panel, PanelTabs } from "./panel-tabs";
import { PlaygroundHeader } from "./playground-header";
import { PlaygroundSidebar } from "./playground-sidebar";
import { RunCanvasHeader } from "./run-canvas-header";
import { RunResultPanels } from "./run-result-panels";
import { TraceLogs, Waterfall } from "./timeline";
import { UtilityPanels } from "./utility-panels";
import { WorkflowRunner } from "./workflow";
import { HistoricalWorkflow } from "./workflow-history";

export function Playground() {
  const initialRoute = useMemo(
    () => readRoute(typeof location === "undefined" ? "" : location.search),
    [],
  );
  const [runNotes, setRunNotes] = useStoredState<RunNotes>("run-notes", {});
  const [panelWidth, setPanelWidth] = useStoredState("panel-width", 420);
  const pendingRouteSpan = useRef(initialRoute.span);
  const pendingRouteTrace = useRef(initialRoute.trace);
  const [routeNotice, setRouteNotice] = useState<string>();
  const [selection, setSelection] = useState<{ kind: EntityKind; id: string }>(() =>
    initialRoute.entity
      ? { kind: initialRoute.kind, id: initialRoute.entity }
      : readStoredState("selection", { kind: "agent", id: "" }),
  );
  useEffect(() => writeStoredState("selection", selection), [selection]);
  const [panel, setPanel] = useState<Panel>(() => (initialRoute.trace ? "review" : "run"));
  const reviewAfterRun = useRef(false);
  const [presentation, setPresentation] = useState<"flow" | "waterfall">("flow");
  const [showLogs, setShowLogs] = useState(false);
  const [compact, setCompact] = useStoredState("compact-cards", true);
  const [showSearch, setShowSearch] = useState(false);
  const canvas = useCanvasOptions();
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<"structure" | "execution">(
    initialRoute.trace ? "execution" : "structure",
  );
  const [runIdentity, setRunIdentity] = useState<RunTarget>();
  const [requestError, setRequestError] = useState<string>();
  const [startedAt, setStartedAt] = useState<number>();
  const [traceId, setTraceId] = useState<string | undefined>(initialRoute.trace);
  const [target, setTarget] = useState<RunTarget | undefined>(
    initialRoute.kind === "workflow" && initialRoute.trace ? {} : undefined,
  );
  const [targetVersion, setTargetVersion] = useState(0);
  const [selectedNode, setSelectedNode] = useState<GraphData | null>(null);
  const [focusedSpanId, setFocusedSpanId] = useState<string>();
  const [spanMode, setSpanMode] = useState<"overview" | "all">("overview");
  const queries = useQueryClient();
  const {
    config,
    agents,
    workflows,
    entities,
    selected,
    detail,
    entity,
    traces,
    live,
    sortedTraces: rawTraces,
  } = usePlaygroundQueries(selection, running);
  const { sortedTraces, onPendingAction } = usePendingActions(rawTraces);
  const requestedTrace = useQuery({
    queryKey: ["trace-link", traceId],
    queryFn: () => api<Trace>(`/observability/traces/${encodeURIComponent(traceId ?? "")}`),
    enabled: Boolean(traceId) && !sortedTraces.some((item) => item.traceId === traceId),
    retry: false,
  });
  const activeTrace =
    traceId || startedAt !== undefined || runIdentity
      ? (selectActiveTrace(sortedTraces, traceId, startedAt, runIdentity) ?? requestedTrace.data)
      : undefined;
  const testCases = useTestCases(activeTrace);
  const captureRequest = testCases.capture;
  const activeExecutionId = traceTarget(activeTrace).executionId;
  const currentExecution = useQuery({
    queryKey: ["workflow-current-state", entity?.id, activeExecutionId],
    queryFn: () =>
      api<WorkflowState>(
        `/workflows/${encodeURIComponent(entity?.id ?? "")}/executions/${encodeURIComponent(activeExecutionId ?? "")}/state`,
      ),
    enabled: selection.kind === "workflow" && Boolean(activeExecutionId && entity),
    refetchInterval: 2000,
    retry: false,
  });
  const history = workflowHistory(activeTrace, sortedTraces, currentExecution.data);
  const ancestors = useQuery({
    queryKey: ["trace-ancestors", activeTrace?.traceId],
    enabled: Boolean(activeTrace && previousTraceId(activeTrace)),
    queryFn: ({ signal }) =>
      loadTraceAncestors(activeTrace, sortedTraces, (id) =>
        api<Trace>(`/observability/traces/${encodeURIComponent(id)}`, undefined, signal),
      ),
  });
  const displayTrace = useMemo(
    () => linkedTrace(activeTrace, [...sortedTraces, ...(ancestors.data ?? [])]),
    [activeTrace, sortedTraces, ancestors.data],
  );
  useEffect(() => {
    if (activeTrace?.traceId === pendingRouteTrace.current && activeTrace) {
      setTarget(traceTarget(activeTrace));
      setTargetVersion((value) => value + 1);
      pendingRouteTrace.current = undefined;
    }
  }, [activeTrace]);
  useLinkedSpan(
    displayTrace,
    pendingRouteSpan,
    ancestors.isFetching,
    setSelectedNode,
    setFocusedSpanId,
    setSpanMode,
    setRouteNotice,
  );
  const shareUrl =
    typeof location === "undefined"
      ? ""
      : routeUrl(location.href, {
          kind: selection.kind,
          entity: entity?.id,
          trace: view === "execution" ? (activeTrace?.traceId ?? traceId) : undefined,
          span: focusedSpanId,
        });
  useEffect(() => {
    if (entity && !pendingRouteSpan.current) window.history.replaceState(null, "", shareUrl);
  }, [shareUrl, entity]);
  const overview = useMemo(() => displayTrace && overviewSpans(displayTrace), [displayTrace]);
  const focusedSpan = displayTrace?.spans.find((span) => span.spanId === focusedSpanId);
  const selectNode = (data: GraphData | null) => {
    setSelectedNode(data);
    setFocusedSpanId(data?.span?.spanId);
    if (data?.span && overview && !overview.spans.some((span) => span.spanId === data.span?.spanId))
      setSpanMode("all");
  };
  const inspectSpan = (span: Span) => {
    if (!displayTrace) return;
    setView("execution");
    const node = traceGraph(displayTrace).nodes.find((item) => item.id === span.spanId);
    if (node) selectNode(node.data);
  };
  // A finished run opens its result once. Do not interrupt a developer inspecting a step.
  useEffect(() => {
    const root = activeTrace && traceRoot(activeTrace);
    if (!reviewAfterRun.current || running || !root?.endTime) return;
    reviewAfterRun.current = false;
    const status = spanStatus(root);
    if (["approval", "client-result", "suspended"].includes(status)) return;
    if (!selectedNode) setPanel((current) => (current === "run" ? "review" : current));
  }, [running, activeTrace, selectedNode]);
  const selectRun = (trace: Trace, stepId?: string) => {
    if (running) return;
    testCases.clear();
    setTraceId(trace.traceId);
    setView("execution");
    setSelectedNode(null);
    setFocusedSpanId(undefined);
    setPanel(stepId ? "run" : "review");
    reviewAfterRun.current = false;
    setTarget({ ...traceTarget(trace), stepId });
    setTargetVersion((value) => value + 1);
  };
  const onRun = useCallback(
    (identity?: RunTarget, draft?: RunDraft) => {
      captureRequest(draft);
      reviewAfterRun.current = true;
      setRunIdentity(identity);
      setView("execution");
      setStartedAt(Date.now() - 100);
      setTraceId(undefined);
      setSelectedNode(null);
      setFocusedSpanId(undefined);
      void queries.invalidateQueries({ queryKey: ["traces"] });
    },
    [queries, captureRequest],
  );
  const onExecution = useCallback((identity: RunTarget) => {
    setRunIdentity(identity);
    setView("execution");
  }, []);
  const pick = (kind: EntityKind, id: string) => {
    testCases.clear();
    testCases.setEditing(undefined);
    pendingRouteSpan.current = undefined;
    pendingRouteTrace.current = undefined;
    setRouteNotice(undefined);
    setSelection({ kind, id });
    setShowSearch(false);
    reviewAfterRun.current = false;
    setRequestError(undefined);
    setPanel("run");
    // Navigation prepares a new workflow; only an explicit run selection restores history.
    setTarget(kind === "workflow" ? {} : undefined);
    setTargetVersion((value) => value + 1);
    setRunIdentity(undefined);
    setStartedAt(undefined);
    setSelectedNode(null);
    setFocusedSpanId(undefined);
    setTraceId(undefined);
    setView("structure");
  };
  const openWorkflowRun = (trace: Trace, stepId?: string) => {
    selectRun(trace, stepId);
    setPanel("run");
  };
  const workflowAction = workflowStepAction(
    selection.kind,
    running,
    history.historical,
    currentExecution.data,
    sortedTraces,
    ancestors.data,
    activeTrace,
    openWorkflowRun,
  );
  const openRunner = runnerAction(activeTrace, workflowAction, setSelectedNode, setPanel);
  const connectionError = agents.error ?? workflows.error;
  const prepareCase = (test: TestCase) => {
    if (running) return;
    const draft = freshCaseDraft(test);
    testCases.setPrepared({ test, draft });
    setTarget({ userId: draft.settings.userId, conversationId: draft.settings.conversationId });
    setTargetVersion((value) => value + 1);
    setTraceId(undefined);
    setRunIdentity(undefined);
    setStartedAt(undefined);
    setRequestError(undefined);
    reviewAfterRun.current = false;
    setView("structure");
    setSelectedNode(null);
    setFocusedSpanId(undefined);
    setPanel("run");
  };
  const saveCase = () => {
    if (!entity || !activeTrace || running) return;
    testCases.setEditing({
      ...caseFromTrace(activeTrace, selection.kind, entity.id, testCases.draft),
      expectations: testCases.comparison?.expectations,
    });
    setPanel("cases");
    setSelectedNode(null);
  };
  return (
    <div className="app-shell">
      <PlaygroundHeader
        error={connectionError}
        connected={live.connected}
        loading={agents.isPending}
        apiUrl={config.data?.apiUrl}
        onRefresh={() => {
          void queries.invalidateQueries();
        }}
      />
      <BuildUpdate running={running} />
      <div className="workspace">
        <PlaygroundSidebar
          kind={selection.kind}
          entities={entities}
          selectedId={selected?.id}
          agentCount={agents.data?.length ?? 0}
          workflowCount={workflows.data?.length ?? 0}
          onPick={pick}
          traces={sortedTraces}
          notes={runNotes}
          activeId={activeTrace?.traceId}
          running={running}
          onSelectRun={selectRun}
          error={traces.error}
        />
        <main className="main-area">
          <div className="canvas-toolbar">
            <div className="breadcrumbs">
              <span>{selection.kind === "agent" ? "Agents" : "Workflows"}</span>
              <ChevronRight size={13} />
              <strong title={entity?.description ?? entity?.purpose}>
                {entity?.name ?? "Playground"}
              </strong>
            </div>
            <div className="segmented">
              <button
                type="button"
                className={view === "structure" ? "active" : ""}
                onClick={() => {
                  setView("structure");
                  setSelectedNode(null);
                  setFocusedSpanId(undefined);
                }}
              >
                <GitBranch size={13} />
                Structure
              </button>
              <button
                type="button"
                className={view === "execution" ? "active" : ""}
                onClick={() => {
                  setView("execution");
                  setSelectedNode(null);
                }}
              >
                <Activity size={13} />
                Execution
              </button>
            </div>
            <ExecutionControls
              execution={view === "execution"}
              hasTrace={view === "execution" && Boolean(displayTrace)}
              canvas={canvas}
              hasHistory={Boolean(activeTrace && previousTraceId(activeTrace))}
              presentation={presentation}
              onPresentation={setPresentation}
              spanMode={spanMode}
              hiddenCount={overview?.hiddenCount ?? 0}
              onToggleInternals={() => {
                setSpanMode(spanMode === "all" ? "overview" : "all");
                selectNode(null);
              }}
              showLogs={showLogs}
              onToggleLogs={() => setShowLogs(!showLogs)}
              showSearch={showSearch}
              onToggleSearch={() => setShowSearch(!showSearch)}
              compact={compact}
              onToggleCompact={() => setCompact(!compact)}
            />
          </div>
          {connectionError && (
            <div className="connection-banner">
              <strong>Cannot reach the VoltAgent API</strong>
              <span>{connectionError.message}</span>
              <button
                type="button"
                onClick={() => {
                  void queries.invalidateQueries();
                }}
              >
                Reconnect
              </button>
            </div>
          )}
          {requestedTrace.error && traceId && (
            <p className="error-box">Linked trace unavailable: {requestedTrace.error.message}</p>
          )}
          {routeNotice && <p className="notice-box">{routeNotice}</p>}
          <div className="main-content">
            <div className="canvas-column">
              <RunCanvasHeader
                trace={activeTrace}
                displayTrace={displayTrace}
                history={history}
                ancestorError={ancestors.error}
                onSelectRun={selectRun}
                onInspect={inspectSpan}
                showSearch={showSearch && view === "execution"}
                onCloseSteps={() => setShowSearch(false)}
                showHistory={canvas.showHistory}
                focusedSpanId={focusedSpanId}
              />
              <div
                className={`canvas-area ${view === "execution" && presentation === "waterfall" && displayTrace ? "timeline-mode" : ""}`}
              >
                <CanvasContent
                  entity={entity}
                  kind={selection.kind}
                  loading={agents.isPending}
                  view={view}
                  presentation={presentation}
                  trace={view === "execution" ? displayTrace : undefined}
                  mode={spanMode}
                  selectedSpanId={focusedSpanId}
                  onSelect={selectNode}
                  running={running}
                  requestError={requestError}
                  compact={compact}
                  canvas={canvas}
                  onWorkflowAction={workflowAction}
                />
              </div>
            </div>
            {entity && (
              <aside
                className="right-panel"
                style={{ "--panel-width": `${panelWidth}px` } as React.CSSProperties}
              >
                <PanelResizer width={panelWidth} onChange={setPanelWidth} />
                <PanelTabs
                  kind={selection.kind}
                  hasTrace={Boolean(activeTrace)}
                  panel={selectedNode ? undefined : panel}
                  onChange={(next) => {
                    setSelectedNode(null);
                    setPanel(next);
                  }}
                />
                <RunResultPanels
                  panel={selectedNode ? undefined : panel}
                  entity={entity}
                  kind={selection.kind}
                  trace={activeTrace}
                  displayTrace={displayTrace}
                  testCases={testCases}
                  running={running}
                  onInspect={inspectSpan}
                  onSave={saveCase}
                  onPrepare={prepareCase}
                  onPanel={setPanel}
                  onRunner={openRunner}
                  shareUrl={shareUrl}
                  notes={runNotes}
                  onNotes={setRunNotes}
                  traces={sortedTraces}
                />
                <div className="runner-container" hidden={Boolean(selectedNode) || panel !== "run"}>
                  {selection.kind === "agent" ? (
                    <Chat
                      key={`agent-${entity.id}-${targetVersion}`}
                      target={target}
                      draft={testCases.prepared?.draft}
                      entity={entity}
                      onRunning={setRunning}
                      onRequestRejected={setRequestError}
                      onPendingAction={onPendingAction}
                      onNewConversation={() => {
                        reviewAfterRun.current = false;
                        testCases.clear();
                        setView("structure");
                        setTraceId(undefined);
                        setRunIdentity(undefined);
                        setStartedAt(undefined);
                        setFocusedSpanId(undefined);
                        setSelectedNode(null);
                      }}
                      onRun={onRun}
                      trace={activeTrace}
                      selectedCallId={
                        typeof focusedSpan?.attributes["tool.call.id"] === "string"
                          ? focusedSpan.attributes["tool.call.id"]
                          : undefined
                      }
                      visible={!selectedNode && panel === "run"}
                      onInspectTool={(callId) => {
                        const span = toolCallSpan(activeTrace, callId);
                        if (span) inspectSpan(span);
                      }}
                    />
                  ) : history.historical && activeTrace ? (
                    <HistoricalWorkflow trace={activeTrace} />
                  ) : detail.isPending ? (
                    <p className="notice">Loading workflow…</p>
                  ) : (
                    <WorkflowRunner
                      key={`workflow-${entity.id}-${targetVersion}`}
                      target={target}
                      draft={testCases.prepared?.draft}
                      entity={entity}
                      onRunning={setRunning}
                      onRun={onRun}
                      onExecution={onExecution}
                      onPrepare={() => {
                        testCases.clear();
                        reviewAfterRun.current = false;
                        setTraceId(undefined);
                        setRunIdentity(undefined);
                        setStartedAt(undefined);
                        setFocusedSpanId(undefined);
                        setView("structure");
                        setSelectedNode(null);
                        setPanel("run");
                      }}
                    />
                  )}
                </div>
                <UtilityPanels
                  panel={selectedNode ? undefined : panel}
                  entity={entity}
                  kind={selection.kind}
                  running={running}
                  trace={displayTrace}
                  apiUrl={config.data?.apiUrl}
                  testCases={testCases}
                  onPrepare={prepareCase}
                  onConversation={(conversation) => {
                    if (running) return;
                    setTarget(conversation);
                    setTargetVersion((version) => version + 1);
                    setPanel("run");
                    setTraceId(undefined);
                    setStartedAt(undefined);
                    setRunIdentity(undefined);
                    reviewAfterRun.current = false;
                    setView("structure");
                    setFocusedSpanId(undefined);
                  }}
                />
                {selectedNode && (
                  <TraceInspector
                    data={selectedNode}
                    trace={displayTrace}
                    sources={[...sortedTraces, ...(ancestors.data ?? [])]}
                    workflow={Boolean(workflowAction)}
                    running={running}
                    onSelectRun={openWorkflowRun}
                    onClose={() => setSelectedNode(null)}
                    onInspect={inspectSpan}
                    onShowChat={chatInspectionAction(
                      selection.kind,
                      focusedSpan,
                      activeTrace,
                      selectRun,
                      setFocusedSpanId,
                      setSelectedNode,
                      setPanel,
                    )}
                  />
                )}
              </aside>
            )}
          </div>
          {showLogs && (
            <TraceLogs
              trace={displayTrace}
              live={live.logs}
              selectedSpanId={focusedSpanId}
              onSelect={selectNode}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function chatInspectionAction(
  kind: EntityKind,
  span: Span | undefined,
  trace: Trace | undefined,
  selectRun: (trace: Trace) => void,
  focus: (id: string) => void,
  selectNode: (data: GraphData | null) => void,
  selectPanel: (panel: Panel) => void,
) {
  if (kind !== "agent" || !span?.attributes["tool.call.id"] || !trace) return undefined;
  return () => {
    selectRun(trace);
    focus(span.spanId);
    selectNode(null);
    selectPanel("run");
  };
}

function runnerAction(
  trace: Trace | undefined,
  workflowAction: ((span: Span) => void) | undefined,
  selectNode: (data: GraphData | null) => void,
  selectPanel: (panel: Panel) => void,
) {
  return () => {
    const root = trace && traceRoot(trace);
    if (root && workflowAction) workflowAction(root);
    else {
      selectNode(null);
      selectPanel("run");
    }
  };
}

function CanvasContent({
  entity,
  kind,
  loading,
  view,
  presentation,
  trace,
  mode,
  selectedSpanId,
  onSelect,
  running,
  compact,
  requestError,
  onWorkflowAction,
  canvas,
}: {
  entity?: Entity;
  kind: EntityKind;
  loading: boolean;
  view: "structure" | "execution";
  presentation: "flow" | "waterfall";
  trace?: Trace;
  mode: "overview" | "all";
  selectedSpanId?: string;
  onSelect: (data: GraphData | null) => void;
  running: boolean;
  compact: boolean;
  requestError?: string;
  onWorkflowAction?: (span: Span) => void;
  canvas: CanvasOptions;
}) {
  if (!entity)
    return (
      <div className="workspace-empty">
        <h2>{loading ? "Connecting to your project…" : "No agents or workflows"}</h2>
        {!loading && <p>Register an agent or workflow in your VoltAgent project to get started.</p>}
      </div>
    );
  if (view === "execution" && !trace)
    return (
      <div className="workspace-empty">
        <h2>
          {requestError
            ? "Request validation failed"
            : running
              ? "Waiting for execution trace…"
              : "No execution selected"}
        </h2>
        <p>
          {requestError
            ? `${requestError}. Correct Context in Run settings and retry; no execution was started.`
            : running
              ? "Steps will appear as the runtime reports them."
              : "Start a run or select one from the history."}
        </p>
      </div>
    );
  if (presentation === "waterfall" && trace)
    return <Waterfall trace={trace} selectedSpanId={selectedSpanId} onSelect={onSelect} />;
  return (
    <ExecutionGraph
      key={`${kind}:${entity.id}:${trace?.traceId ?? "structure"}:${mode}`}
      entity={entity}
      kind={kind}
      trace={trace}
      mode={mode}
      compact={compact}
      canvas={canvas}
      selectedSpanId={selectedSpanId}
      onSelect={onSelect}
      onWorkflowAction={onWorkflowAction}
    />
  );
}

function usePlaygroundQueries(selection: { kind: EntityKind; id: string }, running: boolean) {
  const config = useQuery({
    queryKey: ["config"],
    queryFn: async () => (await fetch("/config")).json() as Promise<{ apiUrl: string }>,
  });
  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<Entity[]>("/agents"),
    refetchInterval: 5000,
  });
  const workflows = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api<Entity[]>("/workflows"),
    refetchInterval: 5000,
  });
  const entities = selection.kind === "agent" ? agents.data : workflows.data;
  const selected = entities?.find((entity) => entity.id === selection.id) ?? entities?.[0];
  const detail = useQuery({
    queryKey: [selection.kind, selected?.id],
    queryFn: () => api<Entity>(`/${selection.kind}s/${encodeURIComponent(selected?.id ?? "")}`),
    enabled: Boolean(selected),
    refetchInterval: 5000,
  });
  const entity = detail.data ?? selected;
  const live = useLiveObservability(selected?.id, selection.kind);
  const traces = useQuery({
    queryKey: ["traces", selection.kind, selected?.id],
    queryFn: () =>
      api<{ traces: Trace[] }>(
        `/observability/traces?entityId=${encodeURIComponent(selected?.id ?? "")}&entityType=${selection.kind}`,
      ),
    enabled: Boolean(selected),
    refetchInterval: live.connected ? 10000 : running ? 800 : 3000,
  });
  const cancellations = useQuery({
    queryKey: ["workflow-cancellations", selected?.id],
    enabled: selection.kind === "workflow" && Boolean(selected),
    refetchInterval: 1500,
    queryFn: () =>
      api<Array<WorkflowState & { id: string }>>(
        `/workflows/executions?workflowId=${encodeURIComponent(selected?.id ?? "")}&status=cancelled&limit=100`,
      ),
  });
  const sortedTraces = useMemo(
    () =>
      withCancelledExecutions(
        mergeTraces(traces.data?.traces ?? [], live.spans, selected?.id ?? "", selection.kind).sort(
          (a, b) => (b.spans[0]?.startTime ?? "").localeCompare(a.spans[0]?.startTime ?? ""),
        ),
        cancellations.data ?? [],
      ),
    [traces.data, live.spans, selected?.id, selection.kind, cancellations.data],
  );
  return {
    config,
    agents,
    workflows,
    entities,
    selected,
    detail,
    entity,
    traces,
    live,
    sortedTraces,
  };
}

function workflowStepAction(
  kind: EntityKind,
  running: boolean,
  historical: boolean,
  state: WorkflowState | undefined,
  traces: Trace[],
  ancestors: Trace[] | undefined,
  active: Trace | undefined,
  select: (trace: Trace, stepId?: string) => void,
) {
  if (kind !== "workflow" || running || historical || !state) return undefined;
  return (span: Span) => {
    const source = [...traces, ...(ancestors ?? []), ...(active ? [active] : [])].find(
      (item) => item.traceId === span.traceId,
    );
    if (source)
      select(
        source,
        typeof span.attributes["workflow.step.id"] === "string"
          ? span.attributes["workflow.step.id"]
          : undefined,
      );
  };
}

function useLinkedSpan(
  displayTrace: Trace | undefined,
  pendingRouteSpan: React.RefObject<string | undefined>,
  ancestorsLoading: boolean,
  setSelectedNode: React.Dispatch<React.SetStateAction<GraphData | null>>,
  setFocusedSpanId: React.Dispatch<React.SetStateAction<string | undefined>>,
  setSpanMode: React.Dispatch<React.SetStateAction<"overview" | "all">>,
  setRouteNotice: React.Dispatch<React.SetStateAction<string | undefined>>,
) {
  useEffect(() => {
    if (!displayTrace || !pendingRouteSpan.current) return;
    const node = traceGraph(displayTrace).nodes.find(
      (item) => item.id === pendingRouteSpan.current,
    );
    if (node) {
      setSelectedNode(node.data);
      setFocusedSpanId(node.id);
      if (!overviewSpans(displayTrace).spans.some((span) => span.spanId === node.id))
        setSpanMode("all");
      pendingRouteSpan.current = undefined;
    } else if (!ancestorsLoading) {
      pendingRouteSpan.current = undefined;
      setRouteNotice("The linked span is unavailable. Showing the trace instead.");
    }
  }, [
    displayTrace,
    ancestorsLoading,
    pendingRouteSpan,
    setSelectedNode,
    setFocusedSpanId,
    setSpanMode,
    setRouteNotice,
  ]);
}
