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
      output: { condition: "sunny" },
      providerExecuted: false,
    });
    expect(stepPart).toEqual({ type: "step-start" });
    expect(textPart).toMatchObject({ type: "text", text: "Hava güneşli görünüyor." });
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
});
