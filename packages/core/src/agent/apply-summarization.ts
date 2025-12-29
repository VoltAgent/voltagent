import type { Span } from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import type { LanguageModel, UIMessage } from "ai";
import { generateText } from "ai";
import type { Memory } from "../memory";
import { randomUUID } from "../utils/id";
import type { AgentSummarizationOptions, DynamicValue, OperationContext } from "./types";

const SUMMARY_METADATA_KEY = "agent";
const SUMMARY_STATE_CACHE_KEY = Symbol("agentSummaryState");

const SUMMARY_SYSTEM_PROMPT = [
  "You are a summarization assistant for an AI agent conversation.",
  "Summarize the conversation so far, preserving key facts, decisions, constraints, and open questions.",
  "Include important tool outputs, file paths, and any user preferences.",
  "Use concise bullet points and keep the summary short.",
].join("\n");

const SUMMARY_SYSTEM_MARKER = "<agent_summary>";
const DEFAULT_SUMMARY_TRIGGER_TOKENS = 170_000;
const DEFAULT_SUMMARY_KEEP_MESSAGES = 6;
const DEFAULT_SUMMARY_MAX_OUTPUT_TOKENS = 800;
const SUMMARY_CHAR_PER_TOKEN = 4;
const SUMMARY_MAX_PART_CHARS = 2000;
const SUMMARY_PREVIEW_CHARS = 600;
const SUMMARY_MAX_ATTR_CHARS = 4000;

type AgentSummaryState = {
  summary?: string;
  summaryUpdatedAt?: string;
  summaryMessageCount?: number;
};

const summaryFallbackState = new Map<string, AgentSummaryState>();

type SummarizationAgent = {
  getMemory: () => Memory | false | undefined;
};

type ResolveValue = <T>(value: T | DynamicValue<T>, context: OperationContext) => Promise<T>;

export const applySummarization = async ({
  messages,
  operationContext,
  summarization,
  model,
  resolveValue,
  agent,
}: {
  messages: UIMessage[];
  operationContext: OperationContext;
  summarization?: AgentSummarizationOptions | false;
  model: LanguageModel | DynamicValue<LanguageModel>;
  resolveValue: ResolveValue;
  agent: SummarizationAgent;
}): Promise<UIMessage[]> => {
  const config = summarization;
  if (!config) {
    return messages;
  }

  const enabled = config.enabled ?? true;
  if (!enabled) {
    return messages;
  }

  const oc = operationContext;
  const triggerTokens = config.triggerTokens ?? DEFAULT_SUMMARY_TRIGGER_TOKENS;
  const keepMessages = config.keepMessages ?? DEFAULT_SUMMARY_KEEP_MESSAGES;
  const maxOutputTokens = config.maxOutputTokens ?? DEFAULT_SUMMARY_MAX_OUTPUT_TOKENS;
  const systemPrompt =
    config.systemPrompt === undefined ? SUMMARY_SYSTEM_PROMPT : config.systemPrompt || "";

  const sanitizedMessages = removeSystemMessagesWithMarker(messages, SUMMARY_SYSTEM_MARKER);
  const nonSystemMessages = sanitizedMessages.filter((message) => message.role !== "system");

  if (nonSystemMessages.length <= keepMessages) {
    return sanitizedMessages;
  }

  const summaryCandidateCount = Math.max(0, nonSystemMessages.length - keepMessages);
  if (summaryCandidateCount === 0) {
    return sanitizedMessages;
  }

  const estimatedTokens = estimateTokensFromMessages(nonSystemMessages);
  const state = await loadAgentSummaryState(agent, oc);
  const existingSummary = typeof state.summary === "string" ? state.summary.trim() : "";
  const existingCount =
    typeof state.summaryMessageCount === "number" ? state.summaryMessageCount : 0;

  const shouldTrigger = triggerTokens <= 0 || estimatedTokens >= triggerTokens;
  let summaryText = existingSummary;
  let summaryUpdated = false;
  let summarySpan: Span | null = null;
  let summarySpanAction: "generate" | "inject" | null = null;
  const summaryBaseAttributes = {
    "agent.summary.keep_messages": keepMessages,
    "agent.summary.candidates": summaryCandidateCount,
    "agent.summary.estimated_tokens": estimatedTokens,
    "agent.summary.trigger_tokens": triggerTokens,
    "agent.summary.previous_count": existingCount,
    "voltagent.type": "summary",
  };

  if (shouldTrigger && summaryCandidateCount > existingCount) {
    const candidates = nonSystemMessages.slice(0, summaryCandidateCount);
    const newMessages = candidates.slice(Math.max(0, existingCount));
    const summaryInput = buildSummaryInput({
      previousSummary: summaryText,
      messages: newMessages,
    });

    if (summaryInput.trim()) {
      summarySpanAction = "generate";
      summarySpan = oc.traceContext.createChildSpan("agent.summary", "summary", {
        label: "Summary (generated)",
        attributes: {
          ...summaryBaseAttributes,
          "agent.summary.action": summarySpanAction,
        },
      });

      try {
        const summaryModel = config.model ?? model;
        const resolvedModel = await resolveValue(summaryModel, oc);
        const summaryMessages: Array<{ role: "system" | "user"; content: string }> = [];
        if (systemPrompt.trim()) {
          summaryMessages.push({ role: "system" as const, content: systemPrompt });
        }
        summaryMessages.push({ role: "user" as const, content: summaryInput });

        const result = await oc.traceContext.withSpan(summarySpan, async () =>
          generateText({
            model: resolvedModel,
            messages: summaryMessages,
            temperature: 0,
            maxOutputTokens,
            abortSignal: oc.abortController?.signal,
          }),
        );

        const nextSummary = result.text?.trim();
        if (nextSummary) {
          summaryText = nextSummary;
          summaryUpdated = true;
          await updateAgentSummaryState(agent, oc, (current) => ({
            ...current,
            summary: summaryText,
            summaryUpdatedAt: new Date().toISOString(),
            summaryMessageCount: summaryCandidateCount,
          }));
        }
      } catch (error) {
        oc.logger.debug("[Agent] Failed to summarize conversation", {
          error: safeStringify(error),
        });
        if (summarySpan) {
          oc.traceContext.endChildSpan(summarySpan, "error", {
            error: error as Error,
            attributes: {
              ...summaryBaseAttributes,
              "agent.summary.action": summarySpanAction,
            },
          });
        }
        return sanitizedMessages;
      }
    }
  }

  const canUseSummary =
    summaryText &&
    summaryCandidateCount > 0 &&
    (summaryCandidateCount <= existingCount || summaryUpdated);

  if (!canUseSummary) {
    if (summarySpan) {
      oc.traceContext.endChildSpan(summarySpan, "completed", {
        attributes: {
          ...summaryBaseAttributes,
          "agent.summary.action": summarySpanAction,
          "agent.summary.updated": summaryUpdated,
          "agent.summary.length": summaryText.length,
        },
      });
    }
    return sanitizedMessages;
  }

  const systemMessages = sanitizedMessages.filter((message) => message.role === "system");
  const tailMessages = keepMessages > 0 ? nonSystemMessages.slice(-keepMessages) : [];
  const summaryMessage = buildSummarySystemMessage(summaryText);
  const summaryAttributes = {
    ...summaryBaseAttributes,
    "agent.summary.action": summarySpanAction ?? "inject",
    "agent.summary.updated": summaryUpdated,
    "agent.summary.length": summaryText.length,
    "agent.summary.preview": truncateText(summaryText, SUMMARY_PREVIEW_CHARS),
    "agent.summary.text": truncateText(summaryText, SUMMARY_MAX_ATTR_CHARS),
  };

  if (!summarySpan) {
    summarySpan = oc.traceContext.createChildSpan("agent.summary", "summary", {
      label: "Summary (cached)",
      attributes: summaryAttributes,
    });
  }
  oc.traceContext.endChildSpan(summarySpan, "completed", {
    output: summaryAttributes["agent.summary.text"],
    attributes: summaryAttributes,
  });

  return [...systemMessages, summaryMessage, ...tailMessages];
};

function cloneSummaryState(state?: AgentSummaryState | null): AgentSummaryState {
  if (!state) {
    return {};
  }
  return { ...state };
}

function getSummaryConversationKey(context: OperationContext): string {
  return context.conversationId || context.operationId;
}

function readSummaryStateFromMetadata(
  metadata: Record<string, unknown> | undefined,
): AgentSummaryState | null {
  if (!metadata) return null;
  const entry = metadata[SUMMARY_METADATA_KEY];
  if (!entry || typeof entry !== "object") return null;
  return cloneSummaryState(entry as AgentSummaryState);
}

async function loadAgentSummaryState(
  agent: SummarizationAgent,
  context: OperationContext,
): Promise<AgentSummaryState> {
  const cached = context.systemContext.get(SUMMARY_STATE_CACHE_KEY) as
    | AgentSummaryState
    | undefined;
  if (cached) {
    return cloneSummaryState(cached);
  }

  let state: AgentSummaryState | null = null;
  const memory = agent.getMemory();

  if (memory && context.conversationId) {
    try {
      const conversation = await memory.getConversation(context.conversationId);
      state = readSummaryStateFromMetadata(conversation?.metadata);
    } catch (error) {
      context.logger.debug("[Agent] Failed to load summary state from memory", {
        error: safeStringify(error),
      });
    }
  }

  if (!state) {
    state = cloneSummaryState(summaryFallbackState.get(getSummaryConversationKey(context)) || {});
  }

  context.systemContext.set(SUMMARY_STATE_CACHE_KEY, state);
  return cloneSummaryState(state);
}

async function updateAgentSummaryState(
  agent: SummarizationAgent,
  context: OperationContext,
  updater: (state: AgentSummaryState) => AgentSummaryState,
): Promise<AgentSummaryState> {
  const current = await loadAgentSummaryState(agent, context);
  const nextState = updater(cloneSummaryState(current));
  const normalized = nextState || {};

  context.systemContext.set(SUMMARY_STATE_CACHE_KEY, normalized);
  summaryFallbackState.set(getSummaryConversationKey(context), cloneSummaryState(normalized));

  const memory = agent.getMemory();
  if (memory && context.conversationId) {
    try {
      const conversation = await memory.getConversation(context.conversationId);
      if (conversation) {
        const metadata = {
          ...conversation.metadata,
          [SUMMARY_METADATA_KEY]: cloneSummaryState(normalized),
        };
        await memory.updateConversation(context.conversationId, { metadata });
      }
    } catch (error) {
      context.logger.debug("[Agent] Failed to persist summary state", {
        error: safeStringify(error),
      });
    }
  }

  return cloneSummaryState(normalized);
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function extractMessageText(message: UIMessage): string {
  if ("content" in message && typeof message.content === "string") {
    return message.content;
  }

  if ("parts" in message && Array.isArray(message.parts)) {
    return message.parts.map((part) => (part.type === "text" ? (part.text ?? "") : "")).join("");
  }

  return "";
}

function removeSystemMessagesWithMarker(messages: UIMessage[], marker: string): UIMessage[] {
  return messages.filter((message) => {
    if (message.role !== "system") {
      return true;
    }
    return !extractMessageText(message).includes(marker);
  });
}

function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / SUMMARY_CHAR_PER_TOKEN);
}

function summarizePartValue(value: unknown): string {
  if (typeof value === "string") {
    return truncateText(value, SUMMARY_MAX_PART_CHARS);
  }
  if (value === null || value === undefined) {
    return "";
  }
  return truncateText(safeStringify(value), SUMMARY_MAX_PART_CHARS);
}

function extractSummaryText(message: UIMessage): string {
  if ("content" in message && typeof message.content === "string") {
    return message.content;
  }

  if (!("parts" in message) || !Array.isArray(message.parts)) {
    return "";
  }

  const parts: string[] = [];
  for (const part of message.parts) {
    if (!part || typeof part !== "object") {
      continue;
    }

    if (part.type === "text" || part.type === "reasoning") {
      if (typeof part.text === "string" && part.text.trim()) {
        parts.push(part.text);
      }
      continue;
    }

    if (part.type === "tool-call") {
      const toolName = "toolName" in part ? String(part.toolName) : "tool";
      const input = "input" in part ? summarizePartValue(part.input) : "";
      const detail = input ? ` ${input}` : "";
      parts.push(`tool-call ${toolName}:${detail}`);
      continue;
    }

    if (part.type === "tool-result") {
      const toolName = "toolName" in part ? String(part.toolName) : "tool";
      const output = "output" in part ? summarizePartValue(part.output) : "";
      const detail = output ? ` ${output}` : "";
      parts.push(`tool-result ${toolName}:${detail}`);
      continue;
    }

    if ("text" in part && typeof part.text === "string" && part.text.trim()) {
      parts.push(part.text);
    }
  }

  return parts.join("\n");
}

function formatMessageForSummary(message: UIMessage): string {
  const content = extractSummaryText(message).trim();
  if (!content) {
    return "";
  }
  return `${message.role.toUpperCase()}: ${content}`;
}

function estimateTokensFromMessages(messages: UIMessage[]): number {
  let total = 0;
  for (const message of messages) {
    const formatted = formatMessageForSummary(message);
    if (formatted) {
      total += estimateTokensFromText(formatted);
    }
  }
  return total;
}

function buildSummaryInput(options: {
  previousSummary?: string;
  messages: UIMessage[];
}): string {
  const lines = options.messages
    .map(formatMessageForSummary)
    .filter((line) => line.trim().length > 0);

  const sections: string[] = [];
  const previousSummary = options.previousSummary?.trim();
  if (previousSummary) {
    sections.push("Existing summary:");
    sections.push(previousSummary);
  }

  if (lines.length > 0) {
    sections.push("New conversation messages:");
    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

function buildSummarySystemMessage(summary: string): UIMessage {
  return {
    id: randomUUID(),
    role: "system",
    parts: [
      {
        type: "text",
        text: [SUMMARY_SYSTEM_MARKER, summary.trim(), "</agent_summary>"].join("\n"),
      },
    ],
  };
}
