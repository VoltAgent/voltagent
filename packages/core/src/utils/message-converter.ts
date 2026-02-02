/**
 * Message converter utility functions for converting between AI SDK message types
 */

import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "@ai-sdk/provider-utils";
import type { FileUIPart, ReasoningUIPart, TextUIPart, ToolUIPart, UIMessage } from "ai";
import { bytesToBase64 } from "./base64";
import { randomUUID } from "./id";

const hasOpenAIReasoningProviderOptions = (providerOptions: unknown): boolean => {
  if (!providerOptions || typeof providerOptions !== "object") {
    return false;
  }

  const openai = (providerOptions as Record<string, any>).openai;
  if (!openai || typeof openai !== "object") {
    return false;
  }

  const itemId = typeof openai.itemId === "string" ? openai.itemId.trim() : "";
  if (itemId) {
    return true;
  }

  const reasoningTraceId =
    typeof openai.reasoning_trace_id === "string" ? openai.reasoning_trace_id.trim() : "";
  if (reasoningTraceId) {
    return true;
  }

  const reasoning = openai.reasoning;
  if (reasoning && typeof reasoning === "object") {
    const reasoningId = typeof reasoning.id === "string" ? reasoning.id.trim() : "";
    if (reasoningId) {
      return true;
    }
  }

  if (typeof openai.reasoningEncryptedContent === "string" && openai.reasoningEncryptedContent) {
    return true;
  }

  return false;
};

/**
 * Convert response messages to UIMessages for batch saving
 * This follows the same pattern as AI SDK's internal toUIMessageStream conversion
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: conversion mirrors AI SDK logic
export async function convertResponseMessagesToUIMessages(
  responseMessages: (AssistantModelMessage | ToolModelMessage)[],
): Promise<UIMessage[]> {
  // Collapse all response messages from a single call into ONE assistant UIMessage,
  // mirroring AI SDK's stream behavior (single response message with combined parts).

  const uiMessage: UIMessage = {
    id: randomUUID(),
    role: "assistant",
    parts: [],
  };

  // Track tool parts globally by toolCallId to update outputs when tool results arrive
  const toolPartsById = new Map<string, any>();
  const approvalIdToToolCallId = new Map<string, string>();
  const pendingApprovalByToolCallId = new Map<string, string>();

  for (const message of responseMessages) {
    if (message.role === "assistant" && message.content) {
      if (typeof message.content === "string") {
        if (message.content.trim()) {
          pushTextPart(uiMessage.parts, message.content);
        }
        continue;
      }

      for (const contentPart of message.content) {
        switch (contentPart.type) {
          case "text": {
            if (contentPart.text && contentPart.text.length > 0) {
              pushTextPart(uiMessage.parts, contentPart.text, contentPart.providerOptions);
            }
            break;
          }
          case "reasoning": {
            const reasoningText = typeof contentPart.text === "string" ? contentPart.text : "";
            const hasReasoningId =
              typeof (contentPart as any).id === "string" &&
              (contentPart as any).id.trim().length > 0;
            const shouldKeep =
              reasoningText.length > 0 ||
              hasReasoningId ||
              hasOpenAIReasoningProviderOptions(contentPart.providerOptions);

            if (shouldKeep) {
              uiMessage.parts.push({
                type: "reasoning",
                text: reasoningText,
                ...(contentPart.providerOptions
                  ? { providerMetadata: contentPart.providerOptions }
                  : {}),
                ...((contentPart as any).id ? { reasoningId: (contentPart as any).id } : {}),
                ...((contentPart as any).confidence
                  ? { reasoningConfidence: (contentPart as any).confidence }
                  : {}),
              } satisfies ReasoningUIPart);
            }
            break;
          }
          case "tool-call": {
            const toolPart = {
              type: `tool-${contentPart.toolName}` as const,
              toolCallId: contentPart.toolCallId,
              state: "input-available" as const,
              input: contentPart.input || {},
              ...(contentPart.providerOptions
                ? { callProviderMetadata: contentPart.providerOptions }
                : {}),
              ...(contentPart.providerExecuted != null
                ? { providerExecuted: contentPart.providerExecuted }
                : {}),
            } satisfies ToolUIPart;

            const approvalId = pendingApprovalByToolCallId.get(contentPart.toolCallId);
            if (approvalId) {
              applyApprovalRequestToToolPart(toolPart, approvalId);
              approvalIdToToolCallId.set(approvalId, contentPart.toolCallId);
              pendingApprovalByToolCallId.delete(contentPart.toolCallId);
            }

            uiMessage.parts.push(toolPart);
            toolPartsById.set(contentPart.toolCallId, toolPart);
            break;
          }
          case "tool-approval-request": {
            pendingApprovalByToolCallId.set(contentPart.toolCallId, contentPart.approvalId);
            approvalIdToToolCallId.set(contentPart.approvalId, contentPart.toolCallId);

            const existing =
              toolPartsById.get(contentPart.toolCallId) ||
              findExistingToolPart(uiMessage.parts, contentPart.toolCallId);

            if (existing) {
              applyApprovalRequestToToolPart(existing, contentPart.approvalId);
            }
            break;
          }
          case "tool-result": {
            const assignOutput = (target: ToolUIPart) => {
              target.state = "output-available";
              target.output = contentPart.output;
              target.providerExecuted = true;
            };

            const existing = toolPartsById.get(contentPart.toolCallId);
            if (existing) {
              assignOutput(existing);
              break;
            }

            const fallback = findExistingToolPart(uiMessage.parts, contentPart.toolCallId);
            if (fallback) {
              assignOutput(fallback);
              toolPartsById.set(contentPart.toolCallId, fallback);
              break;
            }

            const resultPart = {
              type: `tool-${contentPart.toolName}` as const,
              toolCallId: contentPart.toolCallId,
              state: "output-available" as const,
              input: {},
              output: contentPart.output,
              providerExecuted: true,
            } satisfies ToolUIPart;
            uiMessage.parts.push(resultPart);
            toolPartsById.set(contentPart.toolCallId, resultPart);
            break;
          }
          case "file": {
            let url: string;
            if (contentPart.data instanceof URL) {
              url = contentPart.data.toString();
            } else if (typeof contentPart.data === "string") {
              url = `data:${contentPart.mediaType};base64,${contentPart.data}`;
            } else {
              const base64 = bytesToBase64(contentPart.data as Uint8Array);
              url = `data:${contentPart.mediaType};base64,${base64}`;
            }
            uiMessage.parts.push({
              type: "file",
              mediaType: contentPart.mediaType,
              url,
            } satisfies FileUIPart);
            break;
          }
        }
      }
    } else if (message.role === "tool" && message.content) {
      for (const toolResult of message.content) {
        if (toolResult.type === "tool-result") {
          const existing = toolPartsById.get(toolResult.toolCallId);
          if (existing) {
            existing.state = "output-available";
            existing.output = toolResult.output;
            existing.providerExecuted = false;
          } else {
            const resultPart = {
              type: `tool-${toolResult.toolName}` as const,
              toolCallId: toolResult.toolCallId,
              state: "output-available" as const,
              input: {},
              output: toolResult.output,
              providerExecuted: false,
            } satisfies ToolUIPart;
            uiMessage.parts.push(resultPart);
            toolPartsById.set(toolResult.toolCallId, resultPart);
          }
        } else if (toolResult.type === "tool-approval-response") {
          const toolCallId = approvalIdToToolCallId.get(toolResult.approvalId);
          const existing =
            (toolCallId ? toolPartsById.get(toolCallId) : undefined) ||
            (toolCallId ? findExistingToolPart(uiMessage.parts, toolCallId) : undefined) ||
            findToolPartByApprovalId(uiMessage.parts, toolResult.approvalId);

          if (existing) {
            applyApprovalResponseToToolPart(existing, {
              id: toolResult.approvalId,
              approved: toolResult.approved,
              ...(toolResult.reason ? { reason: toolResult.reason } : {}),
            });
          }
        }
      }
    }
  }

  return uiMessage.parts.length > 0 ? [uiMessage] : [];
}

function pushTextPart(
  parts: UIMessage["parts"],
  text: string,
  providerOptions?: Record<string, any>,
) {
  const prev = parts.at(-1);
  if (prev?.type?.startsWith("tool-") && "state" in prev && prev.state === "output-available") {
    parts.push({ type: "step-start" } satisfies UIMessage["parts"][number]);
  }

  parts.push({
    type: "text",
    text,
    ...(providerOptions ? { providerMetadata: providerOptions } : {}),
  } satisfies TextUIPart);
}

function findExistingToolPart(parts: UIMessage["parts"], toolCallId: string) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i] as ToolUIPart | undefined;
    if (
      part &&
      typeof part.type === "string" &&
      part.type.startsWith("tool-") &&
      part.toolCallId === toolCallId
    ) {
      return part;
    }
  }
  return undefined;
}

function findToolPartByApprovalId(parts: UIMessage["parts"], approvalId: string) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i] as ToolUIPart | undefined;
    const approval = (part as any)?.approval as { id?: string } | undefined;
    if (approval?.id === approvalId) {
      return part;
    }
  }
  return undefined;
}

function applyApprovalRequestToToolPart(toolPart: ToolUIPart, approvalId: string) {
  const currentState = (toolPart as any).state as string | undefined;
  (toolPart as any).approval = { id: approvalId };
  if (
    currentState !== "output-available" &&
    currentState !== "output-error" &&
    currentState !== "output-denied"
  ) {
    (toolPart as any).state = "approval-requested";
  }
}

function applyApprovalResponseToToolPart(
  toolPart: ToolUIPart,
  approval: { id: string; approved: boolean; reason?: string },
) {
  const currentState = (toolPart as any).state as string | undefined;
  (toolPart as any).approval = approval;
  if (
    currentState !== "output-available" &&
    currentState !== "output-error" &&
    currentState !== "output-denied"
  ) {
    (toolPart as any).state = "approval-responded";
  }
}

/**
 * Convert input ModelMessages (AI SDK) to UIMessage array used by VoltAgent.
 * - Preserves roles (user/assistant/system). Tool messages are represented as
 *   assistant messages with tool parts, matching AI SDK UI message semantics.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: conversion mirrors AI SDK logic
export function convertModelMessagesToUIMessages(messages: ModelMessage[]): UIMessage[] {
  const uiMessages: UIMessage[] = [];
  const toolPartsById = new Map<string, ToolUIPart>();
  const approvalIdToToolCallId = new Map<string, string>();
  const pendingApprovalByToolCallId = new Map<string, string>();

  const assignToolResult = (
    toolCallId: string,
    output: unknown,
    providerExecuted: boolean,
    partsToSearch?: UIMessage["parts"],
  ) => {
    const existing = toolPartsById.get(toolCallId);
    if (existing) {
      existing.state = "output-available";
      existing.output = output;
      existing.providerExecuted = providerExecuted;
      return true;
    }

    if (partsToSearch) {
      const fallback = findExistingToolPart(partsToSearch, toolCallId);
      if (fallback) {
        fallback.state = "output-available";
        fallback.output = output;
        fallback.providerExecuted = providerExecuted;
        toolPartsById.set(toolCallId, fallback);
        return true;
      }
    }

    const globalFallback = findExistingToolPart(
      uiMessages.flatMap((msg) => msg.parts),
      toolCallId,
    );
    if (globalFallback) {
      globalFallback.state = "output-available";
      globalFallback.output = output;
      globalFallback.providerExecuted = providerExecuted;
      toolPartsById.set(toolCallId, globalFallback);
      return true;
    }

    return false;
  };

  for (const message of messages) {
    // Handle tool role separately by translating to assistant tool parts
    if (message.role === "tool") {
      // Tool messages contain results; map each result to an assistant tool part message
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === "tool-result") {
            const merged = assignToolResult(part.toolCallId, part.output, false);
            if (merged) {
              continue;
            }

            const toolMessage: UIMessage = {
              id: randomUUID(),
              role: "assistant",
              parts: [
                {
                  type: `tool-${part.toolName}` as const,
                  toolCallId: part.toolCallId,
                  state: "output-available" as const,
                  input: {},
                  output: part.output,
                  providerExecuted: false,
                } satisfies ToolUIPart,
              ],
            };
            uiMessages.push(toolMessage);
            toolPartsById.set(part.toolCallId, toolMessage.parts[0] as ToolUIPart);
          } else if (part.type === "tool-approval-response") {
            const toolCallId = approvalIdToToolCallId.get(part.approvalId);
            const existing =
              (toolCallId ? toolPartsById.get(toolCallId) : undefined) ||
              (toolCallId
                ? findExistingToolPart(
                    uiMessages.flatMap((msg) => msg.parts),
                    toolCallId,
                  )
                : undefined) ||
              findToolPartByApprovalId(
                uiMessages.flatMap((msg) => msg.parts),
                part.approvalId,
              );

            if (existing) {
              applyApprovalResponseToToolPart(existing, {
                id: part.approvalId,
                approved: part.approved,
                ...(part.reason ? { reason: part.reason } : {}),
              });
            }
          }
        }
      }
      continue;
    }

    const ui: UIMessage = {
      id: randomUUID(),
      role: message.role as any,
      parts: [],
    };

    // String content becomes a single text part
    if (typeof message.content === "string") {
      if (message.content.trim().length > 0) {
        ui.parts.push({
          type: "text",
          text: message.content,
          ...(message.providerOptions ? { providerMetadata: message.providerOptions as any } : {}),
        } satisfies TextUIPart);
      }
      uiMessages.push(ui);
      continue;
    }

    // Structured content: map known part types
    for (const contentPart of message.content || []) {
      switch (contentPart.type) {
        case "text": {
          if (contentPart.text && contentPart.text.length > 0) {
            ui.parts.push({
              type: "text",
              text: contentPart.text,
              ...(contentPart.providerOptions
                ? { providerMetadata: contentPart.providerOptions }
                : {}),
            } satisfies TextUIPart);
          }
          break;
        }
        case "reasoning": {
          const reasoningText = typeof contentPart.text === "string" ? contentPart.text : "";
          const hasReasoningId =
            typeof (contentPart as any).id === "string" &&
            (contentPart as any).id.trim().length > 0;
          const shouldKeep =
            reasoningText.length > 0 ||
            hasReasoningId ||
            hasOpenAIReasoningProviderOptions(contentPart.providerOptions);

          if (shouldKeep) {
            ui.parts.push({
              type: "reasoning",
              text: reasoningText,
              ...(contentPart.providerOptions
                ? { providerMetadata: contentPart.providerOptions as any }
                : {}),
              ...((contentPart as any).id ? { reasoningId: (contentPart as any).id } : {}),
              ...((contentPart as any).confidence
                ? { reasoningConfidence: (contentPart as any).confidence }
                : {}),
            } satisfies ReasoningUIPart);
          }
          break;
        }
        case "tool-call": {
          const toolPart = {
            type: `tool-${contentPart.toolName}` as const,
            toolCallId: contentPart.toolCallId,
            state: "input-available" as const,
            input: contentPart.input || {},
            ...(contentPart.providerOptions
              ? { callProviderMetadata: contentPart.providerOptions as any }
              : {}),
            ...(contentPart.providerExecuted != null
              ? { providerExecuted: contentPart.providerExecuted }
              : {}),
          } satisfies ToolUIPart;

          const approvalId = pendingApprovalByToolCallId.get(contentPart.toolCallId);
          if (approvalId) {
            applyApprovalRequestToToolPart(toolPart, approvalId);
            approvalIdToToolCallId.set(approvalId, contentPart.toolCallId);
            pendingApprovalByToolCallId.delete(contentPart.toolCallId);
          }

          ui.parts.push(toolPart);
          toolPartsById.set(contentPart.toolCallId, toolPart);
          break;
        }
        case "tool-approval-request": {
          pendingApprovalByToolCallId.set(contentPart.toolCallId, contentPart.approvalId);
          approvalIdToToolCallId.set(contentPart.approvalId, contentPart.toolCallId);

          const existing =
            toolPartsById.get(contentPart.toolCallId) ||
            findExistingToolPart(ui.parts, contentPart.toolCallId);

          if (existing) {
            applyApprovalRequestToToolPart(existing, contentPart.approvalId);
          }
          break;
        }
        case "tool-result": {
          const merged = assignToolResult(
            contentPart.toolCallId,
            contentPart.output,
            true,
            ui.parts,
          );

          if (!merged) {
            const resultPart = {
              type: `tool-${contentPart.toolName}` as const,
              toolCallId: contentPart.toolCallId,
              state: "output-available" as const,
              input: {},
              output: contentPart.output,
              providerExecuted: true,
            } satisfies ToolUIPart;
            ui.parts.push(resultPart);
            toolPartsById.set(contentPart.toolCallId, resultPart);
          }
          break;
        }
        case "image": {
          let url: string;
          // contentPart.image may be URL | string | Uint8Array
          const mediaType = (contentPart as any).mediaType || "image/png";
          const img: any = (contentPart as any).image;
          if (img instanceof URL) {
            url = img.toString();
          } else if (typeof img === "string") {
            // If it's a full URL or data URI, use as is; otherwise treat as base64 payload
            if (/^(https?:\/\/|data:)/i.test(img)) {
              url = img;
            } else {
              url = `data:${mediaType};base64,${img}`;
            }
          } else {
            // Assume binary (Uint8Array or ArrayBufferView)
            const uint8 = img as Uint8Array;
            const base64 = bytesToBase64(uint8);
            url = `data:${mediaType};base64,${base64}`;
          }
          ui.parts.push({
            type: "file",
            mediaType,
            url,
            ...(contentPart.providerOptions
              ? { providerMetadata: contentPart.providerOptions }
              : {}),
          } satisfies FileUIPart);
          break;
        }
        case "file": {
          let url: string;
          if (contentPart.data instanceof URL) {
            url = contentPart.data.toString();
          } else if (typeof contentPart.data === "string") {
            // If it's a full URL or data URI, use as is; otherwise treat as base64 payload
            if (/^(https?:\/\/|data:)/i.test(contentPart.data)) {
              url = contentPart.data;
            } else {
              url = `data:${contentPart.mediaType};base64,${contentPart.data}`;
            }
          } else {
            const base64 = bytesToBase64(contentPart.data as Uint8Array);
            url = `data:${contentPart.mediaType};base64,${base64}`;
          }
          ui.parts.push({
            type: "file",
            mediaType: contentPart.mediaType,
            url,
            ...(contentPart.providerOptions
              ? { providerMetadata: contentPart.providerOptions }
              : {}),
          } satisfies FileUIPart);
          break;
        }
        default:
          // Ignore unknown parts to keep converter resilient
          break;
      }
    }

    uiMessages.push(ui);
  }

  return uiMessages;
}
