import { AbstractAgent } from "@ag-ui/client";
import type {
  AssistantMessage,
  BaseEvent,
  DeveloperMessage,
  Message,
  RunAgentInput,
  RunErrorEvent,
  RunFinishedEvent,
  RunStartedEvent,
  StateSnapshotEvent,
  SystemMessage,
  TextMessageChunkEvent,
  TextMessageEndEvent,
  TextMessageStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallStartEvent,
  ToolMessage,
  UserMessage,
} from "@ag-ui/core";
import { EventType } from "@ag-ui/core";
import type { StreamTextOptions, VoltAgentTextStreamPart } from "@voltagent/core";
import type { Agent } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { Observable } from "rxjs";

type AGUIContextValue = {
  state?: Record<string, unknown>;
  context?: RunAgentInput["context"];
  forwardedProps?: RunAgentInput["forwardedProps"];
};

type VoltAgentAGUIConfig = {
  agent: Agent;
  /**
   * Optional function to derive userId for VoltAgent memory/telemetry.
   */
  deriveUserId?: (input: RunAgentInput) => string | undefined;
};

function debugLog(message: string, data?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[VoltAgentAGUI] ${message}`, data ?? {});
}

/**
 * VoltAgent adapter that speaks the AG-UI protocol.
 * Mirrors the Mastra integration strategy: preserve AG-UI state in working memory
 * and stream VoltAgent events as AG-UI BaseEvents.
 */
export class VoltAgentAGUI extends AbstractAgent {
  private readonly agent: Agent;
  private readonly deriveUserId?: VoltAgentAGUIConfig["deriveUserId"];

  constructor(config: VoltAgentAGUIConfig) {
    super();
    this.agent = config.agent;
    this.deriveUserId = config.deriveUserId;
  }

  run(input: RunAgentInput): ReturnType<AbstractAgent["run"]> {
    const stream$ = new Observable<BaseEvent>((subscriber) => {
      const abortController = new AbortController();
      let finishedSent = false;
      debugLog("run start", { threadId: input.threadId, runId: input.runId });
      const runStarted: RunStartedEvent = {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      };
      subscriber.next(runStarted);

      const run = async () => {
        let currentMessageId = generateId();

        try {
          await this.persistStateToWorkingMemory(input);

          const streamOptions = this.buildStreamOptions(input, abortController);
          const voltMessages = convertAGUIMessagesToVoltMessages(input.messages);

          debugLog("calling agent.streamText", { messagesLength: voltMessages.length });
          const result = await this.agent.streamText(voltMessages as any, streamOptions);

          for await (const part of result.fullStream) {
            debugLog("fullStream part", { partType: part.type, id: (part as any).id });
            const events = convertVoltStreamPartToEvents(part, currentMessageId);
            if (!events) continue;

            for (const event of events) {
              debugLog("emit event", { type: event.type, messageId: (event as any).messageId });

              subscriber.next(event);
              if (
                (event.type === EventType.TEXT_MESSAGE_START ||
                  event.type === EventType.TEXT_MESSAGE_CHUNK ||
                  event.type === EventType.TEXT_MESSAGE_END) &&
                "messageId" in event &&
                event.messageId
              ) {
                currentMessageId = event.messageId;
              }
            }
          }

          const snapshotEvent = await this.readWorkingMemorySnapshot(input);
          if (snapshotEvent) {
            subscriber.next(snapshotEvent);
          }

          const finished: RunFinishedEvent = {
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          };
          subscriber.next(finished);
          finishedSent = true;
          subscriber.complete();
          debugLog("run finished", { threadId: input.threadId, runId: input.runId });
        } catch (error) {
          debugLog("run error", {
            threadId: input.threadId,
            runId: input.runId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Make sure any partial text messages are closed before finishing
          const runError: RunErrorEvent = {
            type: EventType.RUN_ERROR,
            message: error instanceof Error ? error.message : "Unknown error",
          };
          subscriber.next(runError);
          const finished: RunFinishedEvent = {
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          };
          subscriber.next(finished);
          finishedSent = true;
          subscriber.complete();
        }
      };

      void run();

      return () => {
        debugLog("run abort/unsubscribe", {
          threadId: input.threadId,
          runId: input.runId,
          finishedSent,
        });
        abortController.abort();
        if (!finishedSent) {
          const finished: RunFinishedEvent = {
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          };
          subscriber.next(finished);
          finishedSent = true;
          subscriber.complete();
        }
      };
    });

    // Cast through unknown to avoid rxjs type mismatches across hoisted versions
    return stream$ as unknown as ReturnType<AbstractAgent["run"]>;
  }

  private buildStreamOptions(
    input: RunAgentInput,
    abortController: AbortController,
  ): StreamTextOptions {
    const context = new Map<string, unknown>();
    const aguiContext: AGUIContextValue = {
      state: (input.state as Record<string, unknown>) || undefined,
      context: input.context,
      forwardedProps: input.forwardedProps,
    };

    context.set("agui:context", aguiContext);

    return {
      abortSignal: abortController.signal,
      conversationId: input.threadId,
      userId: this.deriveUserId?.(input),
      context,
    };
  }

  private async persistStateToWorkingMemory(input: RunAgentInput): Promise<void> {
    const state = input.state;
    if (!state || typeof state !== "object" || Object.keys(state).length === 0) {
      return;
    }

    const memory = this.agent.getMemory?.();
    if (!memory) {
      return;
    }

    try {
      await memory.updateWorkingMemory({
        conversationId: input.threadId,
        content: safeStringify(state),
      });
    } catch (error) {
      // Non-fatal: working memory might be disabled or misconfigured
      console.debug?.("Failed to persist AG-UI state to working memory", error);
    }
  }

  private async readWorkingMemorySnapshot(
    input: RunAgentInput,
  ): Promise<StateSnapshotEvent | undefined> {
    const memory = this.agent.getMemory?.();
    if (!memory) {
      return;
    }

    try {
      const raw = await memory.getWorkingMemory({
        conversationId: input.threadId,
      });

      if (!raw) {
        return;
      }

      let snapshot: unknown = raw;
      try {
        snapshot = JSON.parse(raw);
      } catch {
        // keep raw string
      }

      return {
        type: EventType.STATE_SNAPSHOT,
        snapshot,
      };
    } catch (error) {
      console.debug?.("Failed to read AG-UI working memory snapshot", error);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Message conversion helpers
// ---------------------------------------------------------------------------

const isUserMessage = (message: Message): message is UserMessage => message.role === "user";
const isAssistantMessage = (message: Message): message is AssistantMessage =>
  message.role === "assistant";
const isSystemMessage = (message: Message): message is SystemMessage => message.role === "system";
const isDeveloperMessage = (message: Message): message is DeveloperMessage =>
  message.role === "developer";
const isToolMessage = (message: Message): message is ToolMessage => message.role === "tool";

type VoltUIPart =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; args?: unknown }
  | { type: "tool-result"; toolCallId?: string; toolName?: string; output?: unknown };

type VoltUIMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content?: string;
  parts?: VoltUIPart[];
};

function convertAGUIMessagesToVoltMessages(messages: Message[]): VoltUIMessage[] {
  const toolNameById = new Map<string, string>();

  return messages.map((msg) => {
    const messageId = msg.id || generateId();

    if (isUserMessage(msg)) {
      return {
        id: messageId,
        role: "user",
        content: extractTextContent(msg.content),
      };
    }

    if (isAssistantMessage(msg)) {
      const parts: VoltUIPart[] = [];
      const textContent = msg.content ? extractTextContent(msg.content) : "";
      if (textContent) {
        parts.push({ type: "text", text: textContent });
      }

      for (const call of msg.toolCalls ?? []) {
        const args = safelyParseJson(call.function.arguments);
        toolNameById.set(call.id, call.function.name);
        parts.push({
          type: "tool-call",
          toolCallId: call.id,
          toolName: call.function.name,
          args,
        });
      }

      return {
        id: messageId,
        role: "assistant",
        parts,
      };
    }

    if (isSystemMessage(msg) || isDeveloperMessage(msg)) {
      return {
        id: messageId,
        role: "system",
        content: msg.content,
      };
    }

    if (isToolMessage(msg)) {
      const toolName = msg.toolCallId ? toolNameById.get(msg.toolCallId) : undefined;
      return {
        id: messageId,
        role: "tool",
        parts: [
          {
            type: "tool-result",
            toolCallId: msg.toolCallId,
            toolName: toolName ?? "tool",
            output: safelyParseJson(msg.content),
          },
        ],
      };
    }

    // activity or any other custom role -> fold into assistant text
    return {
      id: messageId,
      role: "assistant",
      parts: [{ type: "text", text: safeStringify((msg as any).content ?? "") }],
    };
  });
}

function extractTextContent(content: UserMessage["content"] | AssistantMessage["content"]): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const parts = content as Array<Record<string, unknown>>;

  return parts
    .map((part: Record<string, unknown>) => {
      const textValue = typeof part.text === "string" ? (part.text as string) : "";
      return textValue;
    })
    .filter((text: string) => text.length > 0)
    .join("\n");
}

function safelyParseJson(value: string | unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ---------------------------------------------------------------------------
// Stream conversion helpers
// ---------------------------------------------------------------------------

type StreamConversionResult =
  | TextMessageStartEvent
  | TextMessageChunkEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | ToolCallArgsEvent
  | ToolCallResultEvent;

function convertVoltStreamPartToEvents(
  part: VoltAgentTextStreamPart,
  fallbackMessageId: string,
): StreamConversionResult[] | null {
  const payload = (part as { payload?: Record<string, unknown> }).payload ?? part;

  switch (part.type) {
    case "text-start": {
      // Ignore explicit start; we'll synthesize start when first chunk/end arrives to avoid duplicates
      return null;
    }
    case "text-delta": {
      const event: TextMessageChunkEvent = {
        type: EventType.TEXT_MESSAGE_CHUNK,
        delta: part.text ?? "",
        messageId: part.id ?? fallbackMessageId,
        role: "assistant",
      };
      return [event];
    }
    case "text-end": {
      // Let transformChunks close the message; avoid emitting END without a START
      return null;
    }
    case "tool-call": {
      const toolCallId = (payload as { toolCallId?: string }).toolCallId ?? generateId();
      const toolName = (payload as { toolName?: string }).toolName ?? "tool";
      const rawArgs =
        (payload as { args?: unknown }).args ??
        (payload as { input?: unknown }).input ??
        (payload as { arguments?: unknown }).arguments;
      const argsEvent: ToolCallArgsEvent = {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId,
        delta: safeStringify(rawArgs ?? {}),
      };
      const startEvent: ToolCallStartEvent = {
        type: EventType.TOOL_CALL_START,
        toolCallId,
        toolCallName: toolName,
        parentMessageId: fallbackMessageId,
      };
      const endEvent: ToolCallEndEvent = {
        type: EventType.TOOL_CALL_END,
        toolCallId,
      };
      return [startEvent, argsEvent, endEvent];
    }
    case "tool-result": {
      const rawResult =
        (payload as { result?: unknown }).result ??
        (payload as { output?: unknown }).output ??
        (payload as { data?: unknown }).data ??
        payload;
      const resultEvent: ToolCallResultEvent = {
        type: EventType.TOOL_CALL_RESULT,
        toolCallId: (payload as { toolCallId?: string }).toolCallId ?? generateId(),
        content: safeStringify(rawResult ?? {}),
        messageId: generateId(),
        role: "tool",
      };
      return [resultEvent];
    }
    case "error": {
      const errorEvent: TextMessageChunkEvent = {
        type: EventType.TEXT_MESSAGE_CHUNK,
        delta: `Error: ${(payload as { error?: unknown }).error}`,
        messageId: fallbackMessageId,
        role: "assistant",
      };
      return [errorEvent];
    }
    default:
      return null;
  }
}

export function createVoltAgentAGUI(config: VoltAgentAGUIConfig): VoltAgentAGUI {
  return new VoltAgentAGUI(config);
}

function generateId(): string {
  const cryptoApi = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const random = () => Math.floor(Math.random() * 0xffff);
  let uuid = "";
  uuid += random().toString(16).padStart(4, "0");
  uuid += random().toString(16).padStart(4, "0");
  uuid += "-";
  uuid += random().toString(16).padStart(4, "0");
  uuid += "-";
  uuid += ((random() & 0x0fff) | 0x4000).toString(16).padStart(4, "0");
  uuid += "-";
  uuid += ((random() & 0x3fff) | 0x8000).toString(16).padStart(4, "0");
  uuid += "-";
  uuid += random().toString(16).padStart(4, "0");
  uuid += random().toString(16).padStart(4, "0");
  uuid += random().toString(16).padStart(4, "0");
  return uuid;
}
