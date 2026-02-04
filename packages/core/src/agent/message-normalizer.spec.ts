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

  it("unwraps json-style tool outputs before converting to model messages", () => {
    const message = baseMessage([
      {
        type: "tool-weather_lookup",
        toolCallId: "call-2",
        state: "output-available",
        output: { type: "json", value: { feelsLike: 24, unit: "C" } },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const part = (sanitized as UIMessage).parts[0] as any;
    expect(part.output).toEqual({ feelsLike: 24, unit: "C" });
    // Original message remains wrapped
    expect((message.parts[0] as any).output).toEqual({
      type: "json",
      value: { feelsLike: 24, unit: "C" },
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

  it("derives reasoning id from provider metadata and keeps the OpenAI item id", () => {
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
    expect(part.providerMetadata).toEqual({ openai: { itemId: "rs_123" } });
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

  it("preserves tool approval metadata for approval flows", () => {
    const message = baseMessage([
      {
        type: "tool-run_command",
        toolCallId: "call-approve",
        state: "approval-responded",
        input: { command: "ls" },
        approval: {
          id: "approval-123",
          approved: true,
          reason: "User confirmed",
        },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const part = (sanitized as UIMessage).parts[0] as any;
    expect(part.approval).toEqual({
      id: "approval-123",
      approved: true,
      reason: "User confirmed",
    });
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
        providerMetadata: { openai: { itemId: "rs_123" }, other: { keep: true } },
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
        providerMetadata: { openai: { itemId: "rs_123" } },
      } as any,
    ]);
    sanitized = sanitizeMessageForModel(message);
    part = (sanitized as UIMessage).parts[0];
    expect(part).toEqual({
      type: "text",
      text: "final answer",
    });
  });

  it("keeps non-reasoning OpenAI itemIds when no reasoning parts exist", () => {
    const message = baseMessage([
      {
        type: "text",
        text: "final answer",
        providerMetadata: { openai: { itemId: "msg_123" } },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const part = (sanitized as UIMessage).parts[0];
    expect(part).toEqual({
      type: "text",
      text: "final answer",
      providerMetadata: { openai: { itemId: "msg_123" } },
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

  it("keeps non-reasoning OpenAI metadata on tool parts when reasoning is absent", () => {
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
    expect(part.callProviderMetadata).toEqual({
      openai: { itemId: "fc_123" },
      other: { keep: true },
    });
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

  it("retains reasoning parts when reasoning id exists only in provider metadata (OpenAI)", () => {
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
    expect((parts[0] as any).providerMetadata).toEqual({ openai: { itemId: "rs_meta" } });
  });

  it("keeps OpenAI tool metadata when reasoning is derived from OpenAI itemId", () => {
    const message = baseMessage([
      {
        type: "reasoning",
        text: "",
        providerMetadata: { openai: { itemId: "rs_openai" } },
      } as any,
      {
        type: "tool-weather_lookup",
        toolCallId: "call-openai",
        state: "input-available",
        input: { location: "NYC" },
        providerExecuted: false,
        callProviderMetadata: { openai: { itemId: "fc_openai" } },
      } as any,
    ]);

    const sanitized = sanitizeMessageForModel(message);
    expect(sanitized).not.toBeNull();
    const parts = (sanitized as UIMessage).parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({
      type: "reasoning",
      reasoningId: "rs_openai",
      text: "",
    });
    expect((parts[0] as any).providerMetadata).toEqual({ openai: { itemId: "rs_openai" } });

    const toolPart = parts.find((part: any) => part.type === "tool-weather_lookup") as any;
    expect(toolPart.callProviderMetadata).toEqual({ openai: { itemId: "fc_openai" } });
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

  it("filters incomplete tool calls when preparing model messages", () => {
    const messages: UIMessage[] = [
      baseMessage([
        {
          type: "tool-search",
          toolCallId: "call-123",
          state: "input-available",
          input: { query: "hello" },
        } as any,
      ]),
      baseMessage([{ type: "text", text: "follow up" } as any], "user"),
    ];

    const sanitized = sanitizeMessagesForModel(messages);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].role).toBe("user");
  });

  it("preserves approval responses on the last assistant message", () => {
    const messages: UIMessage[] = [
      baseMessage([
        {
          type: "tool-run_command",
          toolCallId: "call-approve",
          state: "approval-responded",
          input: { command: "ls" },
          approval: {
            id: "approval-123",
            approved: true,
          },
        } as any,
      ]),
    ];

    const sanitized = sanitizeMessagesForModel(messages);

    expect(sanitized).toHaveLength(1);
    expect((sanitized[0].parts[0] as any).state).toBe("approval-responded");
    expect((sanitized[0].parts[0] as any).approval).toEqual({
      id: "approval-123",
      approved: true,
    });
  });

  it("inserts step-start between tool outputs and text parts", () => {
    const messages: UIMessage[] = [
      baseMessage([
        {
          type: "tool-weather",
          toolCallId: "call-9",
          state: "output-available",
          output: { temp: 20 },
        } as any,
        { type: "text", text: "done" } as any,
      ]),
    ];

    const sanitized = sanitizeMessagesForModel(messages);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].parts).toHaveLength(3);
    expect(sanitized[0].parts[1]).toEqual({ type: "step-start" });
  });
});
