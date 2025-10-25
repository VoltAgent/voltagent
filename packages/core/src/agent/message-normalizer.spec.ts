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

  it("preserves tool provider metadata for provider round-tripping", () => {
    const message = baseMessage([
      {
        type: "reasoning",
        text: "calling weather lookup",
        reasoningId: "rs_123",
      } as any,
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
    const parts = (sanitized as UIMessage).parts;
    expect(parts.some((p: any) => p.type === "reasoning")).toBe(true);
    const part = parts.find((p: any) => p.type === "tool-weather_lookup") as any;
    expect(part).toBeDefined();

    expect(part).toMatchObject({
      type: "tool-weather_lookup",
      toolCallId: "call-1",
      state: "output-available",
      input: { location: "NYC" },
      output: { temperature: 22 },
      providerExecuted: true,
      callProviderMetadata: { internal: true },
      providerMetadata: { responseTime: 123 },
    });
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

  it("derives reasoning id from provider metadata without retaining the metadata", () => {
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
    expect(part).toMatchObject({
      type: "reasoning",
      text: "step",
      reasoningId: "rs_123",
    });
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

  it("removes OpenAI metadata that references reasoning when reasoning is absent", () => {
    let message = baseMessage([
      {
        type: "text",
        text: "final answer",
        providerMetadata: { openai: { itemId: "msg_123" }, other: { keep: true } },
      } as any,
    ]);

    let sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    let part = (sanitized as UIMessage).parts[0];
    expect(part).toEqual({
      type: "text",
      text: "final answer",
      providerMetadata: { other: { keep: true } },
    });

    message = baseMessage([
      {
        type: "text",
        text: "final answer",
        providerMetadata: { openai: { itemId: "msg_123" } },
      } as any,
    ]);
    sanitized = sanitizeMessageForModel(message);
    part = (sanitized as UIMessage).parts[0];
    expect(part).toEqual({
      type: "text",
      text: "final answer",
    });
  });

  it("removes provider-executed tool parts when reasoning is missing", () => {
    const message = baseMessage([
      {
        type: "tool-web_search",
        toolCallId: "ws_123",
        state: "input-available",
        input: {},
        providerExecuted: true,
      } as any,
      {
        type: "tool-web_search",
        toolCallId: "ws_123",
        state: "output-available",
        input: {},
        output: { type: "json", value: { result: "data" } },
        providerExecuted: true,
      } as any,
      { type: "text", text: "summary" } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const parts = (sanitized as UIMessage).parts;
    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual({ type: "text", text: "summary" });
  });

  it("removes OpenAI metadata from tool parts when reasoning is absent", () => {
    const message = baseMessage([
      {
        type: "tool-weather_lookup",
        toolCallId: "call-1",
        state: "input-available",
        input: { location: "NYC" },
        providerExecuted: false,
        callProviderMetadata: { openai: { itemId: "fc_123" }, other: { keep: true } },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const part = (sanitized as UIMessage).parts[0] as any;
    expect(part.callProviderMetadata).toEqual({ other: { keep: true } });
  });

  it("keeps OpenAI metadata on tool parts when reasoning is present", () => {
    const message = baseMessage([
      {
        type: "reasoning",
        text: "thinking",
        reasoningId: "rs_123",
      } as any,
      {
        type: "tool-weather_lookup",
        toolCallId: "call-1",
        state: "input-available",
        input: { location: "NYC" },
        providerExecuted: false,
        callProviderMetadata: { openai: { itemId: "fc_123" }, other: { keep: true } },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const parts = (sanitized as UIMessage).parts;
    const toolPart = parts.find((p: any) => p.type === "tool-weather_lookup") as any;
    expect(toolPart.callProviderMetadata).toEqual({
      openai: { itemId: "fc_123" },
      other: { keep: true },
    });
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

  it("retains empty reasoning parts when a reasoning id is present", () => {
    const message = baseMessage([
      { type: "reasoning", text: "   ", reasoningId: "rs_123" } as any,
      { type: "tool-weather", toolCallId: "ws_456", state: "input-available", input: {} } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const parts = (sanitized as UIMessage).parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ type: "reasoning", reasoningId: "rs_123", text: "   " });
  });

  it("retains reasoning parts when reasoning id exists only in provider metadata", () => {
    const message = baseMessage([
      {
        type: "reasoning",
        text: "",
        providerMetadata: { openai: { reasoning: { id: "rs_meta" } } },
      } as any,
      { type: "tool-weather", toolCallId: "ws_meta", state: "input-available", input: {} } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const parts = (sanitized as UIMessage).parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      type: "reasoning",
      reasoningId: "rs_meta",
      text: "",
    });
    expect((parts[0] as any).providerMetadata).toBeUndefined();
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
