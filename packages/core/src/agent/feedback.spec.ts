import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import {
  createFeedbackHandle,
  findFeedbackMessageId,
  isFeedbackProvided,
  isMessageFeedbackProvided,
  markFeedbackProvided,
} from "./feedback";
import type { AgentFeedbackMetadata } from "./types";

describe("feedback helpers", () => {
  it("detects provided feedback metadata", () => {
    expect(
      isFeedbackProvided({
        traceId: "trace-1",
        key: "satisfaction",
        url: "https://example.com/fb",
      }),
    ).toBe(false);

    expect(
      isFeedbackProvided({
        traceId: "trace-1",
        key: "satisfaction",
        url: "https://example.com/fb",
        provided: true,
      }),
    ).toBe(true);

    expect(
      isFeedbackProvided({
        traceId: "trace-1",
        key: "satisfaction",
        url: "https://example.com/fb",
        providedAt: "2026-02-12T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("detects provided feedback from message metadata", () => {
    const message: UIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [{ type: "text", text: "hello" }],
      metadata: {
        feedback: {
          traceId: "trace-1",
          key: "satisfaction",
          url: "https://example.com/fb",
          provided: true,
        },
      },
    };

    expect(isMessageFeedbackProvided(message)).toBe(true);
  });

  it("finds feedback message id by token id and by fallback fields", () => {
    const byToken: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "a" }],
        metadata: {
          feedback: {
            traceId: "trace-1",
            key: "satisfaction",
            url: "https://example.com/fb",
            tokenId: "token-1",
          },
        },
      },
    ];

    const feedbackWithToken: AgentFeedbackMetadata = {
      traceId: "trace-1",
      key: "satisfaction",
      url: "https://example.com/fb",
      tokenId: "token-1",
    };
    expect(findFeedbackMessageId(byToken, feedbackWithToken)).toBe("assistant-1");

    const byFields: UIMessage[] = [
      {
        id: "assistant-2",
        role: "assistant",
        parts: [{ type: "text", text: "b" }],
        metadata: {
          feedback: {
            traceId: "trace-2",
            key: "quality",
            url: "https://example.com/fb-2",
          },
        },
      },
    ];
    const feedbackByFields: AgentFeedbackMetadata = {
      traceId: "trace-2",
      key: "quality",
      url: "https://example.com/fb-2",
    };
    expect(findFeedbackMessageId(byFields, feedbackByFields)).toBe("assistant-2");
  });

  it("does not throw when fallback feedback fields are not strings", () => {
    const messages: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "a" }],
        metadata: {
          feedback: {
            traceId: "trace-1",
            key: "satisfaction",
            url: "https://example.com/fb",
          },
        },
      },
    ];

    const malformedFeedback = {
      traceId: undefined,
      key: null,
      url: 42,
    } as unknown as AgentFeedbackMetadata;

    expect(() => findFeedbackMessageId(messages, malformedFeedback)).not.toThrow();
    expect(findFeedbackMessageId(messages, malformedFeedback)).toBeUndefined();
  });

  it("marks feedback provided and persists in memory", async () => {
    const memory = new Memory({
      storage: new InMemoryStorageAdapter(),
    });

    const userId = "user-1";
    const conversationId = "conv-feedback";
    const messageId = "assistant-msg-1";

    await memory.createConversation({
      id: conversationId,
      userId,
      resourceId: "agent-1",
      title: "Feedback test",
      metadata: {},
    });

    await memory.addMessage(
      {
        id: messageId,
        role: "assistant",
        parts: [{ type: "text", text: "hello" }],
        metadata: {
          feedback: {
            traceId: "trace-1",
            key: "satisfaction",
            url: "https://example.com/fb",
            tokenId: "token-1",
          },
        },
      } as UIMessage,
      userId,
      conversationId,
    );

    const updated = await markFeedbackProvided({
      memory,
      input: {
        userId,
        conversationId,
        messageId,
        feedbackId: "feedback-1",
        providedAt: "2026-02-12T00:00:00.000Z",
      },
    });

    expect(updated?.provided).toBe(true);
    expect(updated?.providedAt).toBe("2026-02-12T00:00:00.000Z");
    expect(updated?.feedbackId).toBe("feedback-1");

    const storedMessages = await memory.getMessages(userId, conversationId);
    const stored = storedMessages.find((message) => message.id === messageId);
    const storedMetadata =
      stored && typeof stored.metadata === "object" && stored.metadata !== null
        ? (stored.metadata as Record<string, unknown>)
        : undefined;
    const storedFeedback =
      storedMetadata &&
      typeof storedMetadata.feedback === "object" &&
      storedMetadata.feedback !== null
        ? (storedMetadata.feedback as Record<string, unknown>)
        : undefined;

    expect(storedFeedback?.provided).toBe(true);
    expect(storedFeedback?.feedbackId).toBe("feedback-1");
  });

  it("preserves existing providedAt when re-marking without an explicit timestamp", async () => {
    const memory = new Memory({
      storage: new InMemoryStorageAdapter(),
    });

    const userId = "user-1";
    const conversationId = "conv-feedback";
    const messageId = "assistant-msg-1";
    const initialProvidedAt = "2026-02-12T00:00:00.000Z";

    await memory.createConversation({
      id: conversationId,
      userId,
      resourceId: "agent-1",
      title: "Feedback test",
      metadata: {},
    });

    await memory.addMessage(
      {
        id: messageId,
        role: "assistant",
        parts: [{ type: "text", text: "hello" }],
        metadata: {
          feedback: {
            traceId: "trace-1",
            key: "satisfaction",
            url: "https://example.com/fb",
            tokenId: "token-1",
          },
        },
      } as UIMessage,
      userId,
      conversationId,
    );

    const first = await markFeedbackProvided({
      memory,
      input: {
        userId,
        conversationId,
        messageId,
        providedAt: initialProvidedAt,
      },
    });

    expect(first?.providedAt).toBe(initialProvidedAt);

    const second = await markFeedbackProvided({
      memory,
      input: {
        userId,
        conversationId,
        messageId,
      },
    });

    expect(second?.providedAt).toBe(initialProvidedAt);
  });

  it("creates feedback handle with mark helper and updates local state", async () => {
    const mark = vi.fn(async () => ({
      traceId: "trace-1",
      key: "satisfaction",
      url: "https://example.com/fb",
      tokenId: "token-1",
      provided: true,
      providedAt: "2026-02-12T00:00:00.000Z",
      feedbackId: "feedback-2",
    }));

    const handle = createFeedbackHandle({
      metadata: {
        traceId: "trace-1",
        key: "satisfaction",
        url: "https://example.com/fb",
        tokenId: "token-1",
      },
      defaultUserId: "user-1",
      defaultConversationId: "conv-1",
      resolveMessageId: () => "msg-1",
      markFeedbackProvided: mark,
    });

    expect(handle.isProvided()).toBe(false);

    const updated = await handle.markFeedbackProvided({ feedbackId: "feedback-2" });
    expect(updated?.provided).toBe(true);
    expect(handle.isProvided()).toBe(true);

    expect(mark).toHaveBeenCalledWith({
      userId: "user-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      providedAt: undefined,
      feedbackId: "feedback-2",
    });
  });

  it("throws when feedback handle cannot resolve required values", async () => {
    const handle = createFeedbackHandle({
      metadata: {
        traceId: "trace-1",
        key: "satisfaction",
        url: "https://example.com/fb",
      },
      markFeedbackProvided: async () => null,
    });

    await expect(handle.markFeedbackProvided()).rejects.toThrow(
      "feedback.markFeedbackProvided is missing required values",
    );
  });
});
