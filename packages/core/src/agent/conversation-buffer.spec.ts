import type { ModelMessage } from "@ai-sdk/provider-utils";
import { describe, expect, it } from "vitest";

import type { UIMessage } from "ai";

import { ConversationBuffer } from "./conversation-buffer";

const assistantToolCall: ModelMessage = {
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "getWeather",
      input: { location: "Berlin" },
      providerExecuted: false,
    },
  ],
};

const toolResult: ModelMessage = {
  role: "tool",
  content: [
    {
      type: "tool-result",
      toolCallId: "call-1",
      toolName: "getWeather",
      output: { condition: "sunny" },
    },
  ],
};

const assistantText: ModelMessage = {
  role: "assistant",
  content: [
    {
      type: "text",
      text: "Hava güneşli görünüyor.",
    },
  ],
};

describe("ConversationBuffer", () => {
  it("merges tool call, result and text into a single assistant message", () => {
    const buffer = new ConversationBuffer();
    buffer.addModelMessages([assistantToolCall], "response");
    buffer.addModelMessages([toolResult], "response");
    buffer.addModelMessages([assistantText], "response");

    const pending = buffer.drainPendingMessages();
    expect(pending).toHaveLength(1);

    const message = pending[0];
    expect(message.role).toBe("assistant");
    expect(message.parts).toHaveLength(3);

    const [toolPart, stepPart, textPart] = message.parts;
    expect(toolPart).toMatchObject({
      type: "tool-getWeather",
      toolCallId: "call-1",
      state: "output-available",
      input: { location: "Berlin" },
      output: { condition: "sunny" },
      providerExecuted: false,
    });
    expect(stepPart).toEqual({ type: "step-start" });
    expect(textPart).toMatchObject({ type: "text", text: "Hava güneşli görünüyor." });
  });

  it("keeps distinct OpenAI reasoning parts when itemIds differ", () => {
    const buffer = new ConversationBuffer();

    const reasoningOne: ModelMessage = {
      role: "assistant",
      content: [
        {
          type: "reasoning",
          text: "",
          providerOptions: { openai: { itemId: "rs_ONE" } },
        } as any,
      ],
    };

    const reasoningTwo: ModelMessage = {
      role: "assistant",
      content: [
        {
          type: "reasoning",
          text: "",
          providerOptions: { openai: { itemId: "rs_TWO" } },
        } as any,
      ],
    };

    buffer.addModelMessages([reasoningOne], "response");
    buffer.addModelMessages([reasoningTwo], "response");

    const pending = buffer.drainPendingMessages();
    expect(pending).toHaveLength(1);
    const message = pending[0];
    const reasoningParts = message.parts.filter((part) => part.type === "reasoning") as any[];
    expect(reasoningParts).toHaveLength(2);
    expect(reasoningParts[0]?.providerMetadata).toEqual({ openai: { itemId: "rs_ONE" } });
    expect(reasoningParts[1]?.providerMetadata).toEqual({ openai: { itemId: "rs_TWO" } });
  });

  it("preserves preloaded memory messages without marking them pending", () => {
    const existing: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Merhaba!",
          },
        ],
      },
    ];

    const buffer = new ConversationBuffer(existing);
    const pending = buffer.drainPendingMessages();
    expect(pending).toHaveLength(0);

    buffer.addModelMessages([assistantToolCall], "response");
    expect(buffer.drainPendingMessages()).toHaveLength(1);
  });

  it("adds metadata only to pending assistant messages when requirePending is true", () => {
    const existing: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Merhaba!" }],
        metadata: { feedback: { traceId: "old-trace" } },
      },
    ];

    const buffer = new ConversationBuffer(existing);
    buffer.addModelMessages([assistantText], "response");

    const applied = buffer.addMetadataToLastAssistantMessage(
      { feedback: { traceId: "new-trace" } },
      { requirePending: true },
    );

    expect(applied).toBe(true);

    const pending = buffer.drainPendingMessages();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.metadata).toMatchObject({
      feedback: { traceId: "new-trace" },
    });

    const all = buffer.getAllMessages();
    const historyMessage = all.find((message) => message.id === "assistant-1");
    expect(historyMessage?.metadata).toMatchObject({
      feedback: { traceId: "old-trace" },
    });
  });

  it("does not attach metadata when no pending assistant exists and requirePending is true", () => {
    const existing: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Merhaba!" }],
      },
    ];

    const buffer = new ConversationBuffer(existing);
    const applied = buffer.addMetadataToLastAssistantMessage(
      { feedback: { traceId: "new-trace" } },
      { requirePending: true },
    );

    expect(applied).toBe(false);
    expect(buffer.drainPendingMessages()).toHaveLength(0);

    const all = buffer.getAllMessages();
    const historyMessage = all.find((message) => message.id === "assistant-1");
    expect(historyMessage?.metadata).toBeUndefined();
  });
});
