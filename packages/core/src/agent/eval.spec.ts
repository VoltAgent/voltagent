import { describe, expect, it } from "vitest";
import { buildEvalPayload } from "./eval";
import type { OperationContext } from "./types";

function createOperationContext(overrides?: Partial<OperationContext>): OperationContext {
  const rootSpan = {
    spanContext: () => ({
      traceId: "trace-123",
      spanId: "span-456",
    }),
  };

  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => logger,
  } as unknown as OperationContext["logger"];

  return {
    operationId: "op-1",
    context: new Map(),
    systemContext: new Map(),
    isActive: true,
    logger,
    conversationSteps: [],
    abortController: new AbortController(),
    traceContext: {
      getRootSpan: () => rootSpan,
    } as unknown as OperationContext["traceContext"],
    startTime: new Date("2026-01-01T00:00:00.000Z"),
    input: "hello",
    output: undefined,
    ...overrides,
  };
}

describe("buildEvalPayload", () => {
  it("includes message chain and derives tool calls/results from conversation steps", () => {
    const oc = createOperationContext({
      input: "What is the weather in SF?",
      conversationSteps: [
        {
          id: "text-1",
          type: "text",
          role: "assistant",
          content: "Let me check that for you.",
        },
        {
          id: "call-1",
          type: "tool_call",
          role: "assistant",
          name: "weather-tool",
          content: '{"location":"San Francisco"}',
          arguments: { location: "San Francisco" },
        },
        {
          id: "call-1",
          type: "tool_result",
          role: "assistant",
          name: "weather-tool",
          content: '{"temp":68}',
          result: { temp: 68, condition: "sunny" },
        },
      ],
    });

    const payload = buildEvalPayload(oc, "It is 68F and sunny.", "generateText", {
      finishReason: "stop",
    });

    expect(payload).toBeDefined();
    expect(payload?.messages).toBeDefined();
    expect(payload?.messages?.[0]).toMatchObject({
      role: "user",
      type: "text",
      content: "What is the weather in SF?",
    });
    expect(payload?.messages?.find((step) => step.type === "tool_call")).toMatchObject({
      id: "call-1",
      name: "weather-tool",
      arguments: { location: "San Francisco" },
    });
    expect(payload?.toolCalls).toHaveLength(1);
    expect(payload?.toolCalls?.[0]).toMatchObject({
      toolCallId: "call-1",
      toolName: "weather-tool",
      arguments: { location: "San Francisco" },
    });
    expect(payload?.toolResults).toHaveLength(1);
    expect(payload?.toolResults?.[0]).toMatchObject({
      toolCallId: "call-1",
      toolName: "weather-tool",
      result: { temp: 68, condition: "sunny" },
    });
  });

  it("uses metadata-provided messages and tool arrays when supplied", () => {
    const oc = createOperationContext({
      input: "hello",
      conversationSteps: [
        {
          id: "call-ignored",
          type: "tool_call",
          role: "assistant",
          name: "ignored-tool",
          content: "{}",
          arguments: {},
        },
      ],
    });

    const payload = buildEvalPayload(oc, "ok", "streamText", {
      messages: [
        {
          id: "msg-1",
          type: "text",
          role: "user",
          content: "from-metadata",
        },
      ],
      toolCalls: [{ toolName: "metadata-tool", toolCallId: "meta-call-1" }],
      toolResults: [{ toolName: "metadata-tool", toolCallId: "meta-call-1", result: "done" }],
    });

    expect(payload?.messages).toHaveLength(1);
    expect(payload?.messages?.[0]).toMatchObject({
      id: "msg-1",
      role: "user",
      content: "from-metadata",
    });
    expect(payload?.toolCalls).toEqual([{ toolName: "metadata-tool", toolCallId: "meta-call-1" }]);
    expect(payload?.toolResults).toEqual([
      { toolName: "metadata-tool", toolCallId: "meta-call-1", result: "done" },
    ]);
  });

  it("preserves metadata message types and derives tool arrays from metadata messages", () => {
    const oc = createOperationContext({
      input: "hello",
      conversationSteps: [],
    });

    const payload = buildEvalPayload(oc, "ok", "streamText", {
      messages: [
        {
          id: "meta-call-1",
          type: "tool_call",
          role: "assistant",
          name: "metadata-tool",
          content: '{"q":"value"}',
          arguments: { q: "value" },
        },
        {
          id: "meta-call-1",
          type: "tool_result",
          role: "assistant",
          name: "metadata-tool",
          content: '{"done":true}',
          result: { done: true },
        },
      ],
    });

    expect(payload?.messages).toHaveLength(2);
    expect(payload?.messages?.[0]).toMatchObject({
      id: "meta-call-1",
      type: "tool_call",
      name: "metadata-tool",
      arguments: { q: "value" },
    });
    expect(payload?.messages?.[1]).toMatchObject({
      id: "meta-call-1",
      type: "tool_result",
      name: "metadata-tool",
      result: { done: true },
    });
    expect(payload?.toolCalls).toEqual([
      {
        toolCallId: "meta-call-1",
        toolName: "metadata-tool",
        arguments: { q: "value" },
        content: '{"q":"value"}',
        stepIndex: 0,
        usage: null,
        subAgentId: undefined,
        subAgentName: undefined,
      },
    ]);
    expect(payload?.toolResults).toEqual([
      {
        toolCallId: "meta-call-1",
        toolName: "metadata-tool",
        result: { done: true },
        content: '{"done":true}',
        stepIndex: 1,
        usage: null,
        subAgentId: undefined,
        subAgentName: undefined,
      },
    ]);
  });

  it("returns undefined when trace/span IDs are missing", () => {
    const oc = createOperationContext({
      traceContext: {
        getRootSpan: () => ({
          spanContext: () => ({
            traceId: "",
            spanId: "",
          }),
        }),
      } as unknown as OperationContext["traceContext"],
    });

    const payload = buildEvalPayload(oc, "output", "generateText");
    expect(payload).toBeUndefined();
  });
});
