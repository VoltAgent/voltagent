import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type UIMessage,
  convertFileListToFileUIParts,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { ArrowUp, Bot, Paperclip, RotateCcw, Square, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { type Entity, type RunTarget, type Trace, api, pretty, readableError } from "../lib/api";
import { type ConversationAction, actionText, pendingAction } from "../lib/pending-action";
import { spanError } from "../lib/span-insights";
import { readStoredState, writeStoredState } from "../lib/storage";
import { type RunDraft, caseContinuationInput } from "../lib/test-cases";
import { spanStatus, toolCallSpan, traceRoot } from "../lib/trace-presentation";
import { EntityGuide, entityDescription } from "./entity-guide";
import { MessagePart, RecordedValue } from "./recorded-value";
import { Settings, callOptions, initialSettings } from "./settings";
import { SubagentOutputs } from "./subagent-output";
import { VoiceControls } from "./voice";

export function Chat({
  entity,
  draft,
  onRunning,
  onRun,
  target,
  trace,
  selectedCallId,
  visible = true,
  onInspectTool,
  onPendingAction,
  onNewConversation,
  onRequestRejected,
}: {
  onRequestRejected?: (message?: string) => void;
  onPendingAction?: (action: ConversationAction) => void;
  onNewConversation?: () => void;
  target?: RunTarget;
  entity: Entity;
  draft?: RunDraft;
  onRunning: (running: boolean) => void;
  onRun: (identity?: RunTarget, draft?: RunDraft) => void;
  trace?: Trace;
  selectedCallId?: string;
  visible?: boolean;
  onInspectTool?: (callId: string) => void;
}) {
  const [settings, setSettings] = useState(() => ({
    ...initialSettings(),
    ...readStoredState(`settings.agent.${entity.id}`, initialSettings()),
    ...(target
      ? {
          conversationId: target.conversationId ?? crypto.randomUUID(),
          userId: target.userId ?? "",
        }
      : {}),
    ...draft?.settings,
  }));
  useEffect(() => writeStoredState(`settings.agent.${entity.id}`, settings), [entity.id, settings]);
  const preparedRequest = useRef(draft);
  const [caseReady, setCaseReady] = useState(Boolean(draft));
  const [openSettings, setOpenSettings] = useState(0);
  const [settingsValid, setSettingsValid] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [historyNotice, setHistoryNotice] = useState<string>();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileList>();
  const [validationError, setValidationError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const hasMemory = entity.memory?.available === true;
  const pendingContinuation = useRef(false);
  const [stopped, setStopped] = useState(false);
  const requestRef = useRef(onRun);
  requestRef.current = onRun;
  const submitting = useRef(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/agents/${encodeURIComponent(entity.id)}/chat`,
        prepareReconnectToStreamRequest: () => ({
          api: `/api/agents/${encodeURIComponent(entity.id)}/chat/${encodeURIComponent(settingsRef.current.conversationId)}/stream?userId=${encodeURIComponent(settingsRef.current.userId)}`,
        }),
        prepareSendMessagesRequest: async ({ messages, trigger }) => {
          setStopped(false);
          const retryCase =
            draft &&
            trigger === "regenerate-message" &&
            messages.filter((item) => item.role === "user").length === 1;
          const input = retryCase
            ? draft.input
            : preparedRequest.current
              ? preparedRequest.current.input
              : hasMemory && settingsRef.current.userId && settingsRef.current.conversationId
                ? messages.slice(-1)
                : draft
                  ? await caseContinuationInput(draft.input, messages)
                  : messages;
          const options = callOptions(settingsRef.current);
          preparedRequest.current = undefined;
          requestRef.current(
            {
              conversationId: settingsRef.current.conversationId,
              userId: settingsRef.current.userId,
            },
            { input, settings: { ...settingsRef.current }, source: "request" },
          );
          return { body: { input, options } };
        },
      }),
    [entity.id, hasMemory, draft],
  );
  const historyKey = `messages.${entity.id}.${settings.userId}.${settings.conversationId}`;
  const initialMessages = useMemo(() => readStoredState<UIMessage[]>(historyKey, []), [historyKey]);
  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    resumeStream,
    addToolApprovalResponse,
    addToolResult,
    regenerate,
    clearError,
  } = useChat({
    id: `${settings.userId}:${settings.conversationId}`,
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: (options) => {
      if (!pendingContinuation.current) return false;
      const complete =
        lastAssistantMessageIsCompleteWithApprovalResponses(options) ||
        lastAssistantMessageIsCompleteWithToolCalls(options);
      if (complete) pendingContinuation.current = false;
      return complete;
    },
  });
  useEffect(() => {
    const abort = new AbortController();
    setHistoryNotice(
      target && !target.conversationId
        ? "This trace has no conversation ID. A new conversation is ready."
        : undefined,
    );
    if (draft || !settings.conversationId) return;
    setRestoring(true);
    void (async () => {
      if (hasMemory) {
        try {
          const { messages: history } = await api<{ messages: UIMessage[] }>(
            `/observability/memory/conversations/${encodeURIComponent(settings.conversationId)}/messages?userId=${encodeURIComponent(settings.userId)}&agentId=${encodeURIComponent(entity.id)}&limit=100`,
            undefined,
            abort.signal,
          );
          if (!abort.signal.aborted) setMessages(history);
        } catch (cause) {
          if (!abort.signal.aborted && !String(cause).toLowerCase().includes("not found"))
            setHistoryNotice("Server history unavailable; showing this browser’s messages.");
        }
      }
      if (abort.signal.aborted) return;
      if (settingsRef.current.resumableStream === "on" && settingsRef.current.userId)
        await resumeStream();
    })()
      .catch((cause) => {
        if (!abort.signal.aborted)
          setHistoryNotice(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!abort.signal.aborted) setRestoring(false);
      });
    return () => abort.abort();
  }, [
    draft,
    entity.id,
    hasMemory,
    settings.conversationId,
    settings.userId,
    setMessages,
    resumeStream,
    target,
  ]);
  useEffect(() => {
    if (!restoring) writeStoredState(historyKey, messages);
  }, [historyKey, messages, restoring]);
  const running = status === "streaming" || status === "submitted";
  const activeRoot = trace && traceRoot(trace);
  const restoredError =
    !running && activeRoot && spanStatus(activeRoot) === "error"
      ? pretty(spanError(activeRoot).message ?? "This run failed. Inspect its recorded error.")
      : undefined;
  const displayedError = validationError ?? error?.message ?? restoredError;
  const contextError = displayedError?.includes("Invalid agent context");
  useEffect(() => {
    onRequestRejected?.(
      contextError ? readableError(displayedError ?? "Invalid agent context") : undefined,
    );
  }, [contextError, displayedError, onRequestRejected]);
  const cancelled = activeRoot ? spanStatus(activeRoot) === "cancelled" : false;
  const pending = useMemo(
    () => (!running && !error && !stopped && !cancelled ? pendingAction(messages) : undefined),
    [running, error, stopped, messages, cancelled],
  );
  useEffect(() => {
    if (restoring) return;
    onPendingAction?.({
      agentId: entity.id,
      conversationId: settings.conversationId,
      userId: settings.userId,
      pending,
    });
  }, [entity.id, settings.conversationId, settings.userId, restoring, pending, onPendingAction]);
  useEffect(() => {
    onRunning(running);
    return () => onRunning(false);
  }, [running, onRunning]);
  useEffect(() => {
    if (messages.length === 0) return;
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  useEffect(
    () => () => {
      void stop();
    },
    [stop],
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      submitting.current ||
      running ||
      Boolean(pending) ||
      restoring ||
      !settingsValid ||
      (!text.trim() && !files?.length)
    )
      return;
    submitting.current = true;
    try {
      callOptions(settings);
      setValidationError(undefined);
      // FileList is live: clearing the picker before conversion would silently drop attachments.
      const message = { text, files: await convertFileListToFileUIParts(files) };
      setText("");
      setFiles(undefined);
      if (fileInput.current) fileInput.current.value = "";
      await sendMessage(message);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : String(error));
    } finally {
      submitting.current = false;
    }
  };
  const latestReply = messages.at(-1);
  return (
    <section className="runner">
      <div className="panel-heading">
        <h2>Conversation</h2>
        <button
          type="button"
          className="icon-button"
          disabled={running}
          aria-label="New conversation"
          title="New conversation"
          onClick={() => {
            clearError();
            setValidationError(undefined);
            pendingContinuation.current = false;
            preparedRequest.current = undefined;
            setCaseReady(false);
            setSettings({ ...settings, conversationId: crypto.randomUUID() });
            setMessages([]);
            onNewConversation?.();
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <EntityGuide entity={entity} />
      <Settings
        openRequest={openSettings}
        entity={entity}
        settings={settings}
        onChange={setSettings}
        disabled={running || restoring}
        onValidity={setSettingsValid}
      />
      {draft && (
        <details className="prepared-case-input" open={caseReady}>
          <summary>Test case input</summary>
          <RecordedValue value={draft.input} />
        </details>
      )}
      {caseReady && (
        <div className="prepared-case-action">
          <p>Fresh conversation. Review Run settings, then start the saved request.</p>
          <button
            type="button"
            disabled={running || !settingsValid}
            onClick={async () => {
              try {
                callOptions(settings);
                setValidationError(undefined);
                setCaseReady(false);
                await sendMessage({
                  text:
                    typeof draft?.input === "string"
                      ? draft.input
                      : "Saved test input (see Test case input)",
                });
              } catch (cause) {
                setValidationError(String(cause));
                setCaseReady(true);
                preparedRequest.current = draft;
              }
            }}
          >
            Run test case
          </button>
        </div>
      )}
      {!caseReady && (
        <VoiceControls
          agentId={entity.id}
          running={running}
          blocked={Boolean(pending || displayedError || restoring || !settingsValid)}
          reply={
            latestReply?.role === "assistant"
              ? {
                  id: latestReply.id,
                  text: latestReply.parts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("\n"),
                }
              : undefined
          }
          onDraft={setText}
          onSend={async (input) => {
            callOptions(settings);
            await sendMessage({ text: input });
          }}
        />
      )}
      {restoring && <p className="notice">Loading conversation history…</p>}
      {historyNotice && <p className="notice">{historyNotice}</p>}
      <div className="messages">
        {!caseReady && messages.length === 0 && (
          <div className="chat-empty">
            <div className="empty-icon">
              <Bot size={27} />
            </div>
            <h3>{entity.name}</h3>
            <p>
              {entityDescription(entity) ??
                "Send a message to see your agent, tools, and subagents work together."}
            </p>
            <button
              type="button"
              className="suggestion"
              onClick={() => setText("What can you help me with?")}
            >
              What can you help me with? ↗
            </button>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-label">{message.role === "user" ? "You" : entity.name}</div>
            {message.parts.map((part, index) => {
              const key = `${message.id}-${index}`;
              if (part.type === "text")
                return (
                  <div className="markdown" key={key}>
                    <Markdown>{part.text}</Markdown>
                  </div>
                );
              if (part.type === "reasoning")
                return (
                  <details className="reasoning" key={key}>
                    <summary>Reasoning</summary>
                    <Markdown>{part.text}</Markdown>
                  </details>
                );
              if (part.type === "file") return <MessagePart key={key} value={part} />;
              if (isToolUIPart(part))
                return (
                  <ToolCard
                    key={key}
                    part={part}
                    waiting={!running}
                    selected={visible && part.toolCallId === selectedCallId}
                    onInspect={
                      toolCallSpan(trace, part.toolCallId) && onInspectTool
                        ? () => onInspectTool(part.toolCallId)
                        : undefined
                    }
                    approve={(id, approved) => {
                      pendingContinuation.current = true;
                      void addToolApprovalResponse({ id, approved });
                    }}
                    result={(output, errorText) => {
                      pendingContinuation.current = true;
                      if (errorText)
                        void addToolResult({
                          tool: getToolName(part),
                          toolCallId: part.toolCallId,
                          state: "output-error",
                          errorText,
                        });
                      else
                        void addToolResult({
                          tool: getToolName(part),
                          toolCallId: part.toolCallId,
                          output,
                        });
                    }}
                  />
                );
              return null;
            })}
            <SubagentOutputs
              parts={message.parts}
              streaming={running && message.id === messages.at(-1)?.id}
            />
          </div>
        ))}
        {status === "submitted" && (
          <div className="thinking">
            <span />
            <span />
            <span /> Thinking
          </div>
        )}
        {displayedError && (
          <div className="error-box" role="alert">
            {readableError(displayedError)}
            {contextError ? (
              <p>
                Open Run settings and correct Context, then retry. Validation stopped this request
                before an execution trace was created.
              </p>
            ) : activeRoot ? (
              <p>Inspect this run’s recorded error and model attempts.</p>
            ) : (
              <p>The request failed before an execution trace was available.</p>
            )}
            {contextError && (
              <button
                type="button"
                onClick={() => {
                  setOpenSettings((value) => value + 1);
                  end.current
                    ?.closest(".runner")
                    ?.querySelector(".settings")
                    ?.scrollIntoView({ block: "start", behavior: "smooth" });
                }}
              >
                Edit context
              </button>
            )}
            {(error || restoredError) && !running && messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void regenerate();
                }}
              >
                Retry last message
              </button>
            )}
          </div>
        )}
        {!running &&
          !error &&
          latestReply?.role === "assistant" &&
          messages.at(-1)?.parts.some(isToolUIPart) &&
          messages
            .at(-1)
            ?.parts.every(
              (part) =>
                part.type !== "text" &&
                (!isToolUIPart(part) ||
                  ["output-available", "output-error", "output-denied"].includes(part.state)),
            ) && (
            <p className="notice" role="status">
              Run ended after tool calls, without a text reply. Inspect the tool results and step
              limit in the trace.
            </p>
          )}
        <div ref={end} />
      </div>
      {pending && (
        <p className="pending-action notice" role="status">
          {actionText(pending)}.
          <button
            type="button"
            onClick={() => {
              const cards = end.current?.parentElement?.querySelectorAll(".pending-tool-controls");
              cards?.[cards.length - 1]?.scrollIntoView({ block: "start", behavior: "smooth" });
            }}
          >
            Show action
          </button>
        </p>
      )}
      <form className="composer" hidden={caseReady} onSubmit={submit}>
        <textarea
          aria-label="Message"
          placeholder="Ask your agent anything…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {files?.length ? (
          <small>
            {Array.from(files)
              .map((file) => file.name)
              .join(", ")}
          </small>
        ) : null}
        <div className="composer-actions">
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(event) => setFiles(event.target.files ?? undefined)}
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Attach files"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip size={17} />
          </button>
          <span>↵ send · ⇧↵ new line</span>
          {running ? (
            <button
              type="button"
              className="send"
              aria-label="Stop response"
              onClick={() => {
                setStopped(true);
                void stop();
              }}
            >
              <Square size={15} />
            </button>
          ) : (
            <button
              type="submit"
              className="send"
              aria-label="Send message"
              disabled={
                Boolean(pending) || !settingsValid || restoring || (!text.trim() && !files?.length)
              }
            >
              <ArrowUp size={20} />
            </button>
          )}
        </div>
      </form>
      <div className="panel-foot">Connected to your local VoltAgent runtime</div>
    </section>
  );
}

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` | "dynamic-tool" }>;
function ToolCard({
  part,
  waiting,
  approve,
  result,
  selected,
  onInspect,
}: {
  part: ToolPart;
  waiting: boolean;
  approve: (id: string, approved: boolean) => void;
  result: (output?: unknown, error?: string) => void;
  selected?: boolean;
  onInspect?: () => void;
}) {
  const [output, setOutput] = useState("{}");
  const [error, setError] = useState<string>();
  const card = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (selected) card.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  return (
    <details
      ref={card}
      className={`tool-card ${selected ? "selected" : ""}`}
      open={selected || part.state === "approval-requested" || part.state === "input-available"}
    >
      <summary>
        <Wrench size={13} />
        <strong>{getToolName(part)}</strong>
        <span>{part.state.replaceAll("-", " ")}</span>
      </summary>
      {onInspect && (
        <button type="button" className="tool-inspect" onClick={onInspect}>
          Inspect in flow
        </button>
      )}
      <pre>{pretty(part.input)}</pre>
      {part.state === "output-available" && (
        <>
          <small>Output</small>
          <pre>{pretty(part.output)}</pre>
        </>
      )}
      {part.state === "output-error" && <div className="error-box">{part.errorText}</div>}
      {part.state === "approval-requested" && (
        <div className="button-row pending-tool-controls">
          <button type="button" onClick={() => approve(part.approval.id, false)}>
            Deny
          </button>
          <button type="button" className="primary" onClick={() => approve(part.approval.id, true)}>
            Approve
          </button>
        </div>
      )}
      {part.state === "input-available" && waiting && (
        <details open className="pending-tool-controls">
          <summary>Provide a client-side result</summary>
          <p>For tools executed by the client, enter their JSON result.</p>
          <textarea
            aria-label="Tool result JSON"
            value={output}
            onChange={(event) => setOutput(event.target.value)}
          />
          <div className="button-row">
            <button type="button" onClick={() => result(undefined, "Tool declined in playground")}>
              Decline
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  result(JSON.parse(output));
                } catch {
                  setError("Enter valid JSON");
                }
              }}
            >
              Submit result
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </details>
      )}
    </details>
  );
}
