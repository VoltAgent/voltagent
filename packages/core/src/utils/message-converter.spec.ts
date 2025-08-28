/**
 * Unit tests for message-converter utility functions
 */

import type { AssistantModelMessage, ToolModelMessage } from "@ai-sdk/provider-utils";
import { describe, expect, it } from "vitest";
import { convertResponseMessagesToUIMessages } from "./message-converter";

describe("convertResponseMessagesToUIMessages", () => {
  it("should convert simple text assistant message", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: "Hello, world!",
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("assistant");
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "text",
      text: "Hello, world!",
    });
  });

  it("should skip empty text content", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: "   ",
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(0);
  });

  it("should handle assistant message with multiple content parts", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "First part" },
          { type: "text", text: "Second part" },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(2);
    expect(result[0].parts[0]).toEqual({
      type: "text",
      text: "First part",
    });
    expect(result[0].parts[1]).toEqual({
      type: "text",
      text: "Second part",
    });
  });

  it("should handle reasoning content", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "reasoning", text: "Let me think about this..." },
          { type: "text", text: "Here's the answer" },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(2);
    expect(result[0].parts[0]).toEqual({
      type: "reasoning",
      text: "Let me think about this...",
    });
    expect(result[0].parts[1]).toEqual({
      type: "text",
      text: "Here's the answer",
    });
  });

  it("should handle tool calls", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-123",
            toolName: "calculator",
            input: { operation: "add", a: 1, b: 2 },
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "tool-calculator",
      toolCallId: "call-123",
      state: "input-available",
      input: { operation: "add", a: 1, b: 2 },
    });
  });

  it("should merge tool results with tool calls", async () => {
    const messages: (AssistantModelMessage | ToolModelMessage)[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-123",
            toolName: "calculator",
            input: { operation: "add", a: 1, b: 2 },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-123",
            toolName: "calculator",
            output: { result: 3 },
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "tool-calculator",
      toolCallId: "call-123",
      state: "output-available",
      input: { operation: "add", a: 1, b: 2 },
      output: { result: 3 },
    });
  });

  it("should handle provider-executed tool results", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-456",
            toolName: "search",
            output: { results: ["item1", "item2"] },
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "tool-search",
      toolCallId: "call-456",
      state: "output-available",
      input: {},
      output: { results: ["item1", "item2"] },
    });
  });

  it("should handle file attachments with URL", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "file",
            mediaType: "image/png",
            data: new URL("https://example.com/image.png"),
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "file",
      mediaType: "image/png",
      url: "https://example.com/image.png",
    });
  });

  it("should handle file attachments with base64 string", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "file",
            mediaType: "text/plain",
            data: "SGVsbG8gV29ybGQ=",
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "file",
      mediaType: "text/plain",
      url: "data:text/plain;base64,SGVsbG8gV29ybGQ=",
    });
  });

  it("should handle file attachments with Uint8Array", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "file",
            mediaType: "application/octet-stream",
            data: new Uint8Array([72, 101, 108, 108, 111]),
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0].type).toBe("file");
    expect(result[0].parts[0].mediaType).toBe("application/octet-stream");
    expect(result[0].parts[0].url).toMatch(/^data:application\/octet-stream;base64,/);
  });

  it("should handle complex message with mixed content", async () => {
    const messages: (AssistantModelMessage | ToolModelMessage)[] = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Let me calculate that for you." },
          {
            type: "tool-call",
            toolCallId: "calc-1",
            toolName: "calculator",
            input: { operation: "multiply", a: 5, b: 7 },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "calc-1",
            toolName: "calculator",
            output: { result: 35 },
          },
        ],
      },
      {
        role: "assistant",
        content: "The result is 35.",
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(2);

    // First assistant message with text and tool
    expect(result[0].role).toBe("assistant");
    expect(result[0].parts).toHaveLength(2);
    expect(result[0].parts[0]).toEqual({
      type: "text",
      text: "Let me calculate that for you.",
    });
    expect(result[0].parts[1]).toEqual({
      type: "tool-calculator",
      toolCallId: "calc-1",
      state: "output-available",
      input: { operation: "multiply", a: 5, b: 7 },
      output: { result: 35 },
    });

    // Second assistant message with just text
    expect(result[1].role).toBe("assistant");
    expect(result[1].parts).toHaveLength(1);
    expect(result[1].parts[0]).toEqual({
      type: "text",
      text: "The result is 35.",
    });
  });

  it("should handle multiple tool calls and results", async () => {
    const messages: (AssistantModelMessage | ToolModelMessage)[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            input: { query: "weather" },
          },
          {
            type: "tool-call",
            toolCallId: "call-2",
            toolName: "calculator",
            input: { operation: "add", a: 10, b: 20 },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "search",
            output: { results: ["sunny", "warm"] },
          },
          {
            type: "tool-result",
            toolCallId: "call-2",
            toolName: "calculator",
            output: { result: 30 },
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(2);

    expect(result[0].parts[0]).toEqual({
      type: "tool-search",
      toolCallId: "call-1",
      state: "output-available",
      input: { query: "weather" },
      output: { results: ["sunny", "warm"] },
    });

    expect(result[0].parts[1]).toEqual({
      type: "tool-calculator",
      toolCallId: "call-2",
      state: "output-available",
      input: { operation: "add", a: 10, b: 20 },
      output: { result: 30 },
    });
  });

  it("should handle empty message array", async () => {
    const messages: AssistantModelMessage[] = [];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(0);
  });

  it("should skip tool results without matching tool calls", async () => {
    const messages: ToolModelMessage[] = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "orphan-call",
            toolName: "unknown",
            output: { data: "orphaned" },
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(0);
  });
});
