import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { sanitizeMessageForModel, sanitizeMessagesForModel } from "./message-normalizer";

const baseMessage = (
  parts: UIMessage["parts"],
  role: UIMessage["role"] = "assistant",
): UIMessage => ({
  id: "message-id",
  role,
  parts,
});

describe("message-normalizer", () => {
  it("removes working-memory tool calls and drops empty messages", () => {
    const message = baseMessage([
      {
        type: "tool-update_working_memory",
        toolCallId: "tool-1",
        state: "input-available",
        input: { content: "irrelevant" },
      } as any,
      {
        type: "text",
        text: "   ",
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);

    expect(sanitized).toBeNull();
    // Ensure the original message is untouched
    expect((message.parts[0] as any).input).toEqual({ content: "irrelevant" });
  });

  it("strips tool provider metadata but keeps inputs and outputs", () => {
    const message = baseMessage([
      {
        type: "tool-weather_lookup",
        toolCallId: "call-1",
        state: "output-available",
        input: { location: "NYC" },
        output: { temperature: 22 },
        providerExecuted: true,
        callProviderMetadata: { internal: true },
        providerMetadata: { responseTime: 123 },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const part = (sanitized as UIMessage).parts[0] as any;

    expect(part).toMatchObject({
      type: "tool-weather_lookup",
      toolCallId: "call-1",
      state: "output-available",
      input: { location: "NYC" },
      output: { temperature: 22 },
      providerExecuted: true,
    });
    expect(part.callProviderMetadata).toBeUndefined();
    expect(part.providerMetadata).toBeUndefined();
  });

  it("preserves provider metadata on text parts", () => {
    const message = baseMessage([
      {
        type: "text",
        text: "hello",
        providerMetadata: { internal: true },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    expect((sanitized as UIMessage).parts[0]).toEqual({
      type: "text",
      text: "hello",
      providerMetadata: { internal: true },
    });
  });

  it("strips provider metadata from reasoning parts to avoid GPT-5 regression", () => {
    const message = baseMessage([
      {
        type: "reasoning",
        text: "step",
        providerMetadata: { openai: { reasoning_trace_id: "rs_123" } },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const part = (sanitized as UIMessage).parts[0] as any;
    expect(part).toMatchObject({ type: "reasoning", text: "step" });
    expect(part.providerMetadata).toBeUndefined();
  });

  it("retains incomplete tool calls so follow-up results can merge later", () => {
    const message = baseMessage([
      {
        type: "tool-search",
        toolCallId: "call-123",
        state: "input-available",
        input: { query: "hello" },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    expect((sanitized as UIMessage).parts).toHaveLength(1);
    expect(((sanitized as UIMessage).parts[0] as any).state).toBe("input-available");
  });

  it("drops redundant step-start parts", () => {
    const message = baseMessage([
      { type: "step-start" } as any,
      { type: "step-start" } as any,
      { type: "text", text: "final" } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    expect((sanitized as UIMessage).parts).toEqual([{ type: "text", text: "final" }]);
  });

  it("trims reasoning noise and drops empty reasoning blocks", () => {
    const message = baseMessage([
      { type: "reasoning", text: "   " } as any,
      { type: "text", text: "Answer" } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    expect((sanitized as UIMessage).parts).toHaveLength(1);
    expect(((sanitized as UIMessage).parts[0] as any).type).toBe("text");
  });

  it("sanitizes collections while preserving message ordering", () => {
    const messages: UIMessage[] = [
      baseMessage([
        {
          type: "tool-update_working_memory",
          toolCallId: "tool-1",
          state: "input-available",
          input: { content: "secret" },
        } as any,
      ]),
      baseMessage([{ type: "text", text: "visible" } as any]),
    ];

    const sanitized = sanitizeMessagesForModel(messages);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].parts[0]).toEqual({ type: "text", text: "visible" });
  });
});
