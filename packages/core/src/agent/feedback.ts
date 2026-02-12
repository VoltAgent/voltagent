import type { UIMessage } from "ai";
import type { Memory } from "../memory";
import type {
  AgentFeedbackHandle,
  AgentFeedbackMarkProvidedInput,
  AgentFeedbackMetadata,
  AgentMarkFeedbackProvidedInput,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function isFeedbackProvided(feedback?: AgentFeedbackMetadata | null): boolean {
  if (!feedback) {
    return false;
  }

  if (feedback.provided === true) {
    return true;
  }

  if (typeof feedback.providedAt === "string" && feedback.providedAt.trim().length > 0) {
    return true;
  }

  if (typeof feedback.feedbackId === "string" && feedback.feedbackId.trim().length > 0) {
    return true;
  }

  return false;
}

export function isMessageFeedbackProvided(message?: UIMessage | null): boolean {
  if (!message || !isRecord(message.metadata)) {
    return false;
  }

  const rawFeedback = (message.metadata as Record<string, unknown>).feedback;
  if (!isRecord(rawFeedback)) {
    return false;
  }

  return isFeedbackProvided(rawFeedback as AgentFeedbackMetadata);
}

function resolveFeedbackProvidedAt(value?: Date | string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("markFeedbackProvided received an invalid Date value");
    }
    return value.toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return new Date().toISOString();
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("markFeedbackProvided received an invalid providedAt timestamp");
    }
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

export async function markFeedbackProvided(params: {
  memory?: Memory;
  input: AgentMarkFeedbackProvidedInput;
}): Promise<AgentFeedbackMetadata | null> {
  const { memory, input } = params;
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const conversationId =
    typeof input.conversationId === "string" ? input.conversationId.trim() : "";
  const messageId = typeof input.messageId === "string" ? input.messageId.trim() : "";

  if (!userId) {
    throw new Error("markFeedbackProvided requires a non-empty userId");
  }
  if (!conversationId) {
    throw new Error("markFeedbackProvided requires a non-empty conversationId");
  }
  if (!messageId) {
    throw new Error("markFeedbackProvided requires a non-empty messageId");
  }
  if (!memory) {
    throw new Error("Cannot mark feedback as provided because memory is not configured");
  }

  const messages = await memory.getMessages(userId, conversationId);
  const target = messages.find((message) => message.id === messageId);
  if (!target) {
    return null;
  }

  const messageMetadata =
    typeof target.metadata === "object" && target.metadata !== null
      ? (target.metadata as Record<string, unknown>)
      : {};
  const rawFeedback = messageMetadata.feedback;
  if (!isRecord(rawFeedback)) {
    return null;
  }

  const existingFeedback = rawFeedback as AgentFeedbackMetadata;
  const providedAt = resolveFeedbackProvidedAt(input.providedAt);
  const providedFeedbackId =
    typeof input.feedbackId === "string" && input.feedbackId.trim().length > 0
      ? input.feedbackId.trim()
      : existingFeedback.feedbackId;

  const updatedFeedback: AgentFeedbackMetadata = {
    ...existingFeedback,
    provided: true,
    providedAt,
    ...(providedFeedbackId ? { feedbackId: providedFeedbackId } : {}),
  };

  await memory.addMessage(
    {
      ...target,
      metadata: {
        ...messageMetadata,
        feedback: updatedFeedback,
      },
    },
    userId,
    conversationId,
  );

  return updatedFeedback;
}

export function findFeedbackMessageId(
  messages: ReadonlyArray<UIMessage>,
  feedback: AgentFeedbackMetadata,
): string | undefined {
  if (messages.length === 0) {
    return undefined;
  }

  const feedbackTokenId =
    typeof feedback.tokenId === "string" ? feedback.tokenId.trim() : undefined;
  const feedbackTraceId = feedback.traceId.trim();
  const feedbackKey = feedback.key.trim();
  const feedbackUrl = feedback.url.trim();

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }

    if (!hasNonEmptyString(message.id)) {
      continue;
    }

    if (!isRecord(message.metadata)) {
      continue;
    }

    const rawFeedback = (message.metadata as Record<string, unknown>).feedback;
    if (!isRecord(rawFeedback)) {
      continue;
    }

    const messageTokenId =
      typeof rawFeedback.tokenId === "string" ? rawFeedback.tokenId.trim() : undefined;
    if (feedbackTokenId && messageTokenId === feedbackTokenId) {
      return message.id;
    }

    const messageTraceId =
      typeof rawFeedback.traceId === "string" ? rawFeedback.traceId.trim() : "";
    const messageKey = typeof rawFeedback.key === "string" ? rawFeedback.key.trim() : "";
    const messageUrl = typeof rawFeedback.url === "string" ? rawFeedback.url.trim() : "";

    if (
      messageTraceId === feedbackTraceId &&
      messageKey === feedbackKey &&
      messageUrl === feedbackUrl
    ) {
      return message.id;
    }
  }

  return undefined;
}

export function createFeedbackHandle(params: {
  metadata: AgentFeedbackMetadata;
  defaultUserId?: string;
  defaultConversationId?: string;
  resolveMessageId?: () => string | undefined;
  markFeedbackProvided: (
    input: AgentMarkFeedbackProvidedInput,
  ) => Promise<AgentFeedbackMetadata | null>;
}): AgentFeedbackHandle {
  const { metadata, defaultUserId, defaultConversationId, resolveMessageId, markFeedbackProvided } =
    params;

  const feedbackHandle = {
    ...metadata,
  } as AgentFeedbackHandle;

  Object.defineProperty(feedbackHandle, "isProvided", {
    value: () => isFeedbackProvided(feedbackHandle),
    enumerable: false,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(feedbackHandle, "markFeedbackProvided", {
    value: async (input?: AgentFeedbackMarkProvidedInput) => {
      const userId = input?.userId?.trim() || defaultUserId?.trim() || "";
      const conversationId = input?.conversationId?.trim() || defaultConversationId?.trim() || "";
      const messageId = input?.messageId?.trim() || resolveMessageId?.() || "";

      if (!userId || !conversationId || !messageId) {
        const missing: string[] = [];
        if (!userId) missing.push("userId");
        if (!conversationId) missing.push("conversationId");
        if (!messageId) missing.push("messageId");
        throw new Error(
          `feedback.markFeedbackProvided is missing required values: ${missing.join(", ")}`,
        );
      }

      const updated = await markFeedbackProvided({
        userId,
        conversationId,
        messageId,
        providedAt: input?.providedAt,
        feedbackId: input?.feedbackId,
      });

      if (updated) {
        feedbackHandle.traceId = updated.traceId;
        feedbackHandle.key = updated.key;
        feedbackHandle.url = updated.url;
        feedbackHandle.tokenId = updated.tokenId;
        feedbackHandle.expiresAt = updated.expiresAt;
        feedbackHandle.feedbackConfig = updated.feedbackConfig;
        feedbackHandle.provided = updated.provided;
        feedbackHandle.providedAt = updated.providedAt;
        feedbackHandle.feedbackId = updated.feedbackId;
      }

      return updated;
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });

  return feedbackHandle;
}
