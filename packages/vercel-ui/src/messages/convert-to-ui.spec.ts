import type { BaseMessage, OperationContext, StepWithContent } from "@voltagent/core";
import { describe, expect, it } from "vitest";
import { convertToUIMessages } from "./convert-to-ui";

describe("convertToUIMessages", () => {
  it("should convert string input to UI messages", () => {
    const ctx = createFauxContext("Hello!");
    const result = convertToUIMessages(ctx);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Hello!");
  });

  it("should convert array of messages to UI messages", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello!" },
      { role: "assistant", content: "Hi there!" },
    ];
    const ctx = createFauxContext(messages);
    const result = convertToUIMessages(ctx);
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe("Hello!");
    expect(result[1].content).toBe("Hi there!");
  });

  it("should convert a single message to UI messages", () => {
    const message: Message = {
      role: "user",
      content: "Hello!",
    };
    // @ts-expect-error - we're testing the edge case of a single message
    const ctx = createFauxContext(message);
    const result = convertToUIMessages(ctx);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Hello!");
  });

  it("should handle a non-allowed input type", () => {
    // @ts-expect-error - we're testing the edge case of a non-allowed input type
    const ctx = createFauxContext(123);
    const result = convertToUIMessages(ctx);
    expect(result).toEqual([]);
  });

  it("should default to exclude non-tool related steps for sub-agents", () => {
    const message: Message = {
      role: "user",
      content: "Hello!",
    };
    const ctx = createFauxContext(
      [message],
      [
        {
          type: "text",
          id: "text-1",
          content: "Hello!",
          role: "assistant",
        },
        {
          type: "tool_call",
          id: "tool-1",
          name: "test-tool",
          arguments: { foo: "bar" },
          content: "",
          role: "assistant",
          subAgentId: "sub-agent-1",
          subAgentName: "Sub Agent 1",
        },
        {
          type: "text",
          id: "text-2",
          content: "Hello I'm a sub-agent!",
          role: "assistant",
          subAgentId: "sub-agent-1",
          subAgentName: "Sub Agent 1",
        },
        {
          type: "tool_result",
          id: "tool-1",
          name: "test-tool",
          result: "tool result",
          content: "",
          role: "assistant",
          subAgentId: "sub-agent-1",
          subAgentName: "Sub Agent 1",
        },
      ],
    );

    const result = convertToUIMessages(ctx);
    expect(result[1].parts).toEqual([
      { type: "step-start" },
      { type: "text", text: "Hello!", subAgent: false },
      { type: "step-start" },
      {
        type: "tool-invocation",
        toolInvocation: {
          toolCallId: "tool-1",
          toolName: "test-tool",
          state: "result",
          step: 1,
          args: { foo: "bar" },
          result: "tool result",
          subAgentId: "sub-agent-1",
          subAgentName: "Sub Agent 1",
          subAgent: true,
        },
      },
    ]);
  });

  it("should handle input message parts (text, image, file)", () => {
    const message: Message = {
      role: "user",
      content: [
        { type: "text", text: "Hello!" },
        { type: "image", image: Buffer.from("img"), mimeType: "image/png" },
        { type: "file", data: Buffer.from("file"), mimeType: "application/pdf" },
      ],
    };
    const ctx = createFauxContext([message]);
    const result = convertToUIMessages(ctx);
    expect(result[0].parts).toEqual([
      { type: "text", text: "Hello!" },
      { type: "file", data: Buffer.from("img").toString(), mimeType: "image/png" },
      { type: "file", data: Buffer.from("file").toString(), mimeType: "application/pdf" },
    ]);
  });

  it("should handle steps with text content", () => {
    const ctx = createFauxContext("Use the test tool", [
      {
        type: "text",
        id: "text-1",
        content: "Use the test tool",
        role: "assistant",
      },
    ]);
    const result = convertToUIMessages(ctx);
    expect(result).toHaveLength(2);
    expect(result[1].role).toEqual("assistant");
    expect(result[1].content).toEqual("Use the test tool");
  });

  it("should handle missing conversation steps", () => {
    const ctx = createFauxContext("Use the test tool");
    const result = convertToUIMessages({
      ...ctx,
      conversationSteps: undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual("user");
    expect(result[0].content).toEqual("Use the test tool");
  });

  it("should handle tool calls in steps", () => {
    const ctx = createFauxContext("Use the test tool", [
      {
        type: "tool_call",
        id: "tool-1",
        name: "test-tool",
        arguments: { foo: "bar" },
        content: "",
        role: "assistant",
      },
      {
        type: "tool_result",
        id: "tool-1",
        name: "test-tool",
        result: "tool result",
        content: "",
        role: "tool",
      },
    ]);
    const result = convertToUIMessages(ctx);
    const toolCallMessage = result.find(
      (msg) =>
        msg.role === "assistant" && msg.parts.some((part) => part.type === "tool-invocation"),
    );
    const toolCallPart = toolCallMessage?.parts.find((part) => part.type === "tool-invocation");
    expect(toolCallPart).toBeDefined();
    expect(toolCallPart).toEqual(
      expect.objectContaining({
        type: "tool-invocation",
        toolInvocation: {
          toolCallId: "tool-1",
          toolName: "test-tool",
          state: "result",
          step: expect.any(Number),
          args: { foo: "bar" },
          result: "tool result",
          subAgent: false,
        },
      }),
    );
  });

  it("should throw error for v5 version", () => {
    const ctx = createFauxContext("Hello!");
    expect(() => convertToUIMessages(ctx, { version: "v5" })).toThrow("V5 is not supported yet");
  });

  it("should generate IDs for messages without IDs", () => {
    const ctx = createFauxContext("Hello!");
    const result = convertToUIMessages(ctx);
    expect(result[0].id).toBeDefined();
    expect(typeof result[0].id).toBe("string");
  });

  it("should preserve existing message IDs", () => {
    const message: Message = {
      id: "custom-id",
      role: "user",
      content: "Hello!",
    };
    const ctx = createFauxContext([message]);
    const result = convertToUIMessages(ctx);
    expect(result[0].id).toBe("custom-id");
  });

  it("should add createdAt timestamp if not present", () => {
    const ctx = createFauxContext("Hello!");
    const result = convertToUIMessages(ctx);
    expect(result[0].createdAt?.getSeconds()).toEqual(expect.any(Number));
  });

  it("should preserve existing createdAt timestamp", () => {
    const customDate = new Date("2024-01-01");
    const message: Message = {
      role: "user",
      content: "Hello!",
      createdAt: customDate,
    };
    const ctx = createFauxContext([message]);
    const result = convertToUIMessages(ctx);
    expect(result[0].createdAt).toEqual(customDate);
  });

  it("should generate ID when message has no id property", () => {
    const message: Message = {
      role: "user",
      content: "Hello!",
    };
    const ctx = createFauxContext([message]);
    const result = convertToUIMessages(ctx);
    expect(result[0].id).toBeDefined();
    expect(typeof result[0].id).toBe("string");
    expect(result[0].id.length).toBeGreaterThan(0);
  });

  it("should generate ID when message has empty string id", () => {
    const message: Message = {
      id: "",
      role: "user",
      content: "Hello!",
    };
    const ctx = createFauxContext([message]);
    const result = convertToUIMessages(ctx);
    expect(result[0].id).toBeDefined();
    expect(typeof result[0].id).toBe("string");
    expect(result[0].id.length).toBeGreaterThan(0);
    expect(result[0].id).not.toBe("");
  });

  it("should handle file part with data property in message content", () => {
    const message: Message = {
      role: "user",
      content: [{ type: "file", data: Buffer.from("filedata"), mimeType: "application/pdf" }],
    };
    const ctx = createFauxContext([message]);
    const result = convertToUIMessages(ctx);
    expect(result[0].parts).toEqual([
      { type: "file", data: Buffer.from("filedata").toString(), mimeType: "application/pdf" },
    ]);
  });

  it("should fallback to new Date() if createdAt is not a Date instance", () => {
    const message: Message = {
      role: "user",
      content: "Hello!",
      createdAt: "not-a-date",
    };
    const ctx = createFauxContext([message]);
    const result = convertToUIMessages(ctx);
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });
});

type Message = BaseMessage & {
  [key: string]: any;
};

function createFauxContext(
  input: string | Message[],
  steps: StepWithContent[] = [],
): OperationContext {
  return {
    operationId: "test-op",
    userContext: new Map(),
    historyEntry: {
      id: "test-history",
      startTime: new Date(),
      status: "completed",
      input,
      output: "",
    },
    isActive: true,
    conversationSteps: steps,
  };
}
