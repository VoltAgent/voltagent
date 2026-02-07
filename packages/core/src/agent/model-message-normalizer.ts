import type { ModelMessage } from "@ai-sdk/provider-utils";

import {
  hasOpenAIItemId,
  hasOpenAIItemIdForPart as hasOpenAIItemIdForPartBase,
  isObject,
  isOpenAIReasoningId,
  stripDanglingOpenAIReasoningFromParts,
} from "./openai-reasoning-utils";

const isOpenAIReasoningPart = (part: unknown): boolean => {
  if (!isObject(part)) {
    return false;
  }
  if ((part as { type?: unknown }).type !== "reasoning") {
    return false;
  }

  const providerOptions = (part as { providerOptions?: unknown }).providerOptions;
  if (hasOpenAIItemId(providerOptions)) {
    const openai = (providerOptions as { openai?: unknown }).openai as { itemId?: unknown };
    const itemId = typeof openai?.itemId === "string" ? openai.itemId.trim() : "";
    if (itemId && isOpenAIReasoningId(itemId)) {
      return true;
    }
  }

  const reasoningId =
    typeof (part as { id?: unknown }).id === "string" ? (part as any).id.trim() : "";
  return Boolean(reasoningId && isOpenAIReasoningId(reasoningId));
};

const hasOpenAIItemIdForPart = (part: unknown): boolean => {
  if (!isObject(part)) {
    return false;
  }
  return hasOpenAIItemIdForPartBase(part, {
    getProviderMetadata: (value) => (value as { providerOptions?: unknown }).providerOptions,
  });
};

export const stripDanglingOpenAIReasoningFromModelMessages = (
  messages: ModelMessage[],
): ModelMessage[] => {
  let changed = false;

  const sanitized = messages
    .map((message) => {
      if (message.role !== "assistant" || !Array.isArray(message.content)) {
        return message;
      }

      const content = message.content as unknown[];
      const { parts, changed: partsChanged } = stripDanglingOpenAIReasoningFromParts(content, {
        isReasoningPart: isOpenAIReasoningPart,
        hasOpenAIItemIdForPart,
        getNextPart: (parts, index) => parts[index + 1],
      });

      if (!partsChanged) {
        return message;
      }

      changed = true;

      if (parts.length === 0) {
        return null;
      }

      const assistantMessage = message as Extract<ModelMessage, { role: "assistant" }>;

      return {
        ...assistantMessage,
        content: parts as typeof assistantMessage.content,
      } satisfies ModelMessage;
    })
    .filter((message): message is ModelMessage => Boolean(message));

  return changed ? sanitized : messages;
};
