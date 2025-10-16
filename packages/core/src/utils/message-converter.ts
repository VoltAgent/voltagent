/**
 * Message converter utility functions for converting between AI SDK message types
 */

import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "@ai-sdk/provider-utils";
import type { UIMessage } from "ai";
import { bytesToBase64 } from "./base64";
import { randomUUID } from "./id";

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
            if (contentPart.text && contentPart.text.length > 0) {
              uiMessage.parts.push({
                type: "reasoning",
                text: contentPart.text,
                ...(contentPart.providerOptions
                  ? { providerMetadata: contentPart.providerOptions as any }
                  : {}),
                ...((contentPart as any).id ? { reasoningId: (contentPart as any).id } : {}),
                ...((contentPart as any).confidence
                  ? { reasoningConfidence: (contentPart as any).confidence }
                  : {}),
              });
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
            };
            uiMessage.parts.push(toolPart as any);
            toolPartsById.set(contentPart.toolCallId, toolPart);
            break;
          }
          case "tool-result": {
            const existing = toolPartsById.get(contentPart.toolCallId);
            if (existing) {
              existing.state = "output-available";
              existing.output = contentPart.output;
              // providerExecuted is true for provider-executed results
              existing.providerExecuted = true;
            } else {
              const resultPart = {
                type: `tool-${contentPart.toolName}` as const,
                toolCallId: contentPart.toolCallId,
                state: "output-available" as const,
                input: {},
                output: contentPart.output,
                providerExecuted: true,
              };
              uiMessage.parts.push(resultPart as any);
              toolPartsById.set(contentPart.toolCallId, resultPart);
            }
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
            });
            break;
          }
        }
      }
    } else if (message.role === "tool" && message.content) {
      for (const toolResult of message.content) {
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
          };
          uiMessage.parts.push(resultPart as any);
          toolPartsById.set(toolResult.toolCallId, resultPart);
        }
      }
    }
  }

  return uiMessage.parts.length > 0 ? [uiMessage] : [];
}

function pushTextPart(
  parts: UIMessage["parts"],
  text: string,
  providerOptions?: Record<string, unknown>,
) {
  const prev = parts.at(-1) as any;
  if (
    prev &&
    typeof prev?.type === "string" &&
    prev.type.startsWith("tool-") &&
    prev.state === "output-available"
  ) {
    parts.push({ type: "step-start" } as any);
  }

  parts.push({
    type: "text",
    text,
    ...(providerOptions ? { providerMetadata: providerOptions as any } : {}),
  });
}

/**
 * Convert input ModelMessages (AI SDK) to UIMessage array used by VoltAgent.
 * - Preserves roles (user/assistant/system). Tool messages are represented as
 *   assistant messages with tool parts, matching AI SDK UI message semantics.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: conversion mirrors AI SDK logic
export function convertModelMessagesToUIMessages(messages: ModelMessage[]): UIMessage[] {
  const uiMessages: UIMessage[] = [];

  for (const message of messages) {
    // Handle tool role separately by translating to assistant tool parts
    if (message.role === "tool") {
      // Tool messages contain results; map each result to an assistant tool part message
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === "tool-result") {
            uiMessages.push({
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
                } as any,
              ],
            });
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
        });
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
                ? { providerMetadata: contentPart.providerOptions as any }
                : {}),
            });
          }
          break;
        }
        case "reasoning": {
          if (contentPart.text && contentPart.text.length > 0) {
            ui.parts.push({
              type: "reasoning",
              text: contentPart.text,
              ...(contentPart.providerOptions
                ? { providerMetadata: contentPart.providerOptions as any }
                : {}),
              ...((contentPart as any).id ? { reasoningId: (contentPart as any).id } : {}),
              ...((contentPart as any).confidence
                ? { reasoningConfidence: (contentPart as any).confidence }
                : {}),
            });
          }
          break;
        }
        case "tool-call": {
          ui.parts.push({
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
          } as any);
          break;
        }
        case "tool-result": {
          ui.parts.push({
            type: `tool-${contentPart.toolName}` as const,
            toolCallId: contentPart.toolCallId,
            state: "output-available" as const,
            input: {},
            output: contentPart.output,
            // tool-result in assistant message content indicates provider execution
            providerExecuted: true,
          } as any);
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
              ? { providerMetadata: contentPart.providerOptions as any }
              : {}),
          });
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
              ? { providerMetadata: contentPart.providerOptions as any }
              : {}),
          });
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
