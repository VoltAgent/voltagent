import type { ModelMessage } from "@ai-sdk/provider-utils";

const OPENAI_REASONING_ID_PREFIX = "rs_";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasOpenAIItemId = (providerOptions: unknown): boolean => {
  if (!isObject(providerOptions)) {
    return false;
  }

  const openai = (providerOptions as { openai?: unknown }).openai;
  if (!isObject(openai)) {
    return false;
  }

  const itemId = typeof openai.itemId === "string" ? openai.itemId.trim() : "";
  return itemId.length > 0;
};

const isOpenAIReasoningId = (value: string): boolean =>
  value.trim().startsWith(OPENAI_REASONING_ID_PREFIX);

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
  const providerOptions = (part as { providerOptions?: unknown }).providerOptions;
  return hasOpenAIItemId(providerOptions);
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

      const parts = [];
      const content = message.content as unknown[];

      for (let index = 0; index < content.length; index += 1) {
        const part = content[index];
        if (!isOpenAIReasoningPart(part)) {
          parts.push(part);
          continue;
        }

        const next = content[index + 1];

        if (!next) {
          changed = true;
          continue;
        }
        if (isOpenAIReasoningPart(next)) {
          changed = true;
          continue;
        }
        if (!hasOpenAIItemIdForPart(next)) {
          changed = true;
          continue;
        }

        parts.push(part);
      }

      if (parts.length === content.length) {
        return message;
      }

      changed = true;

      if (parts.length === 0) {
        return null;
      }

      return {
        ...message,
        content: parts as ModelMessage["content"],
      } satisfies ModelMessage;
    })
    .filter((message): message is ModelMessage => Boolean(message));

  return changed ? sanitized : messages;
};
