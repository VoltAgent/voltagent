/**
 * Unit tests for message-converter utility functions
 */

import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "@ai-sdk/provider-utils";
import { type UIMessage, convertToModelMessages } from "ai";
import { describe, expect, it } from "vitest";
import {
  convertModelMessagesToUIMessages,
  convertResponseMessagesToUIMessages,
} from "./message-converter";

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

  it("should map tool approval requests to tool parts", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-approve",
            toolName: "getWeather",
            input: { location: "Rome" },
          },
          {
            type: "tool-approval-request",
            approvalId: "approval-1",
            toolCallId: "call-approve",
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "tool-getWeather",
      toolCallId: "call-approve",
      state: "approval-requested",
      input: { location: "Rome" },
      approval: { id: "approval-1" },
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
      providerExecuted: false,
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
      providerExecuted: true,
    });
  });

  it("merges provider-executed tool call + result from same assistant message", async () => {
    const messages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-789",
            toolName: "search",
            input: { query: "news" },
            providerExecuted: true,
          },
          {
            type: "tool-result",
            toolCallId: "call-789",
            toolName: "search",
            output: { results: ["link"] },
          },
        ],
      },
    ];

    const result = await convertResponseMessagesToUIMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts[0]).toEqual({
      type: "tool-search",
      toolCallId: "call-789",
      state: "output-available",
      input: { query: "news" },
      output: { results: ["link"] },
      providerExecuted: true,
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

    expect(result).toHaveLength(1);

    // First assistant message with text and tool
    expect(result[0].role).toBe("assistant");
    expect(result[0].parts).toHaveLength(4);
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
      providerExecuted: false,
    });
    expect(result[0].parts[2]).toEqual({ type: "step-start" });
    // Text from second assistant message
    expect(result[0].parts[3]).toEqual({
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
      providerExecuted: false,
    });

    expect(result[0].parts[1]).toEqual({
      type: "tool-calculator",
      toolCallId: "call-2",
      state: "output-available",
      input: { operation: "add", a: 10, b: 20 },
      output: { result: 30 },
      providerExecuted: false,
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

    expect(result).toHaveLength(1);
  });
});

describe("convertModelMessagesToUIMessages (AI SDK v5)", () => {
  it("converts simple text user/assistant messages", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
      { role: "assistant", content: [{ type: "text", text: "Hi there" }] },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(2);
    expect(ui[0].role).toBe("user");
    expect(ui[0].parts[0]).toEqual({ type: "text", text: "Hello" });
    expect(ui[1].role).toBe("assistant");
    expect(ui[1].parts[0]).toEqual({ type: "text", text: "Hi there" });
  });

  it("inserts step-start between tool-result and following text for assistant", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-result",
            toolCallId: "t1",
            toolName: "calc",
            output: { result: 42 },
          },
          { type: "text", text: "Done." },
        ],
      },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(1);
    expect(ui[0].parts).toHaveLength(2);
    expect(ui[0].parts[0]).toMatchObject({
      type: "tool-calc",
      state: "output-available",
      toolCallId: "t1",
      output: { result: 42 },
    });
    expect(ui[0].parts[1]).toEqual({ type: "text", text: "Done." });
  });

  it("maps reasoning and file parts", () => {
    const fileData = new Uint8Array([1, 2, 3]);
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "reasoning", text: "Thinking..." },
          { type: "file", mediaType: "application/octet-stream", data: fileData },
        ],
      },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(1);
    expect(ui[0].parts[0]).toEqual({ type: "reasoning", text: "Thinking..." });
    expect(ui[0].parts[1].type).toBe("file");
    expect(ui[0].parts[1].mediaType).toBe("application/octet-stream");
    expect(typeof (ui[0].parts[1] as any).url).toBe("string");
  });

  it("maps image parts to UI file parts (url)", () => {
    const messages: ModelMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: "https://example.com/image.jpg",
            mediaType: "image/jpeg",
          } as any,
          { type: "text", text: "What is in this image?" },
        ],
      },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(1);
    expect(ui[0].parts[0]).toEqual({
      type: "file",
      url: "https://example.com/image.jpg",
      mediaType: "image/jpeg",
    });
    expect(ui[0].parts[1]).toEqual({ type: "text", text: "What is in this image?" });
  });

  it("detects file string URL vs base64 and carries providerOptions", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "file",
            mediaType: "image/png",
            data: "https://example.com/img.png",
            providerOptions: { source: "cdn" },
          } as any,
          {
            type: "file",
            mediaType: "text/plain",
            data: "SGVsbG8=", // base64 should become data URI
            providerOptions: { source: "inline" },
          } as any,
        ],
      },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(1);
    expect(ui[0].parts[0]).toEqual({
      type: "file",
      mediaType: "image/png",
      url: "https://example.com/img.png",
      providerMetadata: { source: "cdn" },
    });
    expect(ui[0].parts[1]).toMatchObject({
      type: "file",
      mediaType: "text/plain",
      providerMetadata: { source: "inline" },
    });
    expect((ui[0].parts[1] as any).url).toMatch(/^data:text\/plain;base64,SGVsbG8=/);
  });

  it("flattens tool role messages to assistant with tool-result parts", () => {
    const messages: ModelMessage[] = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tool-1",
            toolName: "search",
            output: { hits: ["a", "b"] },
          },
        ],
      },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(1);
    expect(ui[0].role).toBe("assistant");
    expect(ui[0].parts[0]).toMatchObject({
      type: "tool-search",
      toolCallId: "tool-1",
      state: "output-available",
      output: { hits: ["a", "b"] },
    });
  });

  it("merges provider-executed tool result within a single assistant message", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-provider",
            toolName: "web_search",
            input: { query: "news" },
            providerExecuted: true,
          },
          {
            type: "tool-result",
            toolCallId: "call-provider",
            toolName: "web_search",
            output: { results: ["item"] },
          },
        ],
      },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(1);
    expect(ui[0].parts).toHaveLength(1);
    expect(ui[0].parts[0]).toEqual({
      type: "tool-web_search",
      toolCallId: "call-provider",
      state: "output-available",
      input: { query: "news" },
      output: { results: ["item"] },
      providerExecuted: true,
    });
  });

  it("applies tool approval responses to existing tool parts", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-approval",
            toolName: "getWeather",
            input: { location: "Rome" },
          },
          {
            type: "tool-approval-request",
            approvalId: "approval-1",
            toolCallId: "call-approval",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-approval-response",
            approvalId: "approval-1",
            approved: true,
          },
        ],
      },
    ];

    const ui = convertModelMessagesToUIMessages(messages);
    expect(ui).toHaveLength(1);
    expect(ui[0].parts).toHaveLength(1);
    expect(ui[0].parts[0]).toEqual({
      type: "tool-getWeather",
      toolCallId: "call-approval",
      state: "approval-responded",
      input: { location: "Rome" },
      approval: { id: "approval-1", approved: true },
    });
  });

  it("should correctly handle tool messages for AI SDK convertToModelMessages", async () => {
    // Simulate the response messages from an LLM that called a tool
    const responseMessages: (AssistantModelMessage | ToolModelMessage)[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call_O3d8BaZVIEkb2C2DQ7H3KB7M",
            toolName: "getWeather",
            input: { location: "New York" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call_O3d8BaZVIEkb2C2DQ7H3KB7M",
            toolName: "getWeather",
            output: {
              temperature: "34°C",
              condition: "partly cloudy",
              humidity: "30%",
              windSpeed: "27 km/h",
            },
          },
        ],
      },
      {
        role: "assistant",
        content:
          "The current weather in New York is 34°C, partly cloudy, with a humidity level of 30% and a wind speed of 27 km/h.",
      },
    ];

    // Convert to UI messages (as done when saving to memory)
    const uiMessages = await convertResponseMessagesToUIMessages(responseMessages);

    // Verify the tool part has providerExecuted: false for client-executed tools
    expect(uiMessages).toHaveLength(1);
    expect(uiMessages[0].role).toBe("assistant");

    // The UI message should contain the tool call, tool result, and text in parts
    const toolCallPart = uiMessages[0].parts.find(
      (part: any) =>
        part.type === "tool-getWeather" && part.toolCallId === "call_O3d8BaZVIEkb2C2DQ7H3KB7M",
    ) as any;

    expect(toolCallPart).toBeDefined();
    expect(toolCallPart.state).toBe("output-available");
    expect(toolCallPart.providerExecuted).toBe(false); // Tool role messages reflect client execution

    // Now simulate loading these messages from memory and converting for the next API call
    const conversationHistory: UIMessage[] = [
      {
        id: "system-1",
        role: "system",
        parts: [
          {
            type: "text",
            text: "You are WeatherAgent. A helpful assistant that can check weather or help with various tasks.",
          },
        ],
      },
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "New york" }],
      },
      ...uiMessages, // The saved assistant message with tool call and result
      {
        id: "user-2",
        role: "user",
        parts: [{ type: "text", text: "london" }],
      },
    ];

    // Convert to model messages for the next API call
    const modelMessages = await convertToModelMessages(conversationHistory);

    // The structure depends on how convertResponseMessagesToUIMessages consolidates messages
    // Check that we have the expected roles in order
    const roles = modelMessages.map((m) => m.role);

    // Should have: system, user, assistant (with tool call), tool, assistant (with text), user
    // Or: system, user, assistant (with tool call), tool, user (if text is in same message)
    expect(roles[0]).toBe("system");
    expect(roles[1]).toBe("user");
    expect(roles[2]).toBe("assistant"); // Assistant message with tool call

    // Find the tool message
    const toolMessageIndex = roles.indexOf("tool");
    expect(toolMessageIndex).toBeGreaterThan(2); // Tool message comes after assistant

    const toolMessage = modelMessages[toolMessageIndex];
    expect(toolMessage.content).toBeDefined();
    expect(Array.isArray(toolMessage.content)).toBe(true);

    const toolResult = (toolMessage.content as any)[0];
    expect(toolResult.type).toBe("tool-result");
    expect(toolResult.toolCallId).toBe("call_O3d8BaZVIEkb2C2DQ7H3KB7M");

    // Last message should be the user query for "london"
    expect(roles[roles.length - 1]).toBe("user");
  });

  it("should handle provider-executed tools with providerExecuted: true", async () => {
    // When the provider itself executes the tool (e.g., OpenAI's built-in tools)
    const responseMessages: AssistantModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-provider-123",
            toolName: "search",
            input: { query: "weather" },
            providerExecuted: true, // Provider will execute this
          },
          {
            type: "tool-result",
            toolCallId: "call-provider-123",
            toolName: "search",
            output: { results: ["sunny", "warm"] },
          },
          {
            type: "text",
            text: "The weather looks sunny and warm.",
          },
        ],
      },
    ];

    const uiMessages = await convertResponseMessagesToUIMessages(responseMessages);

    // Provider-executed tools should keep providerExecuted: true
    const toolPart = uiMessages[0].parts.find(
      (part: any) => part.type === "tool-search" && part.state === "output-available",
    ) as any;

    expect(toolPart).toBeDefined();
    expect(toolPart.providerExecuted).toBe(true); // Provider-executed stays true
  });
});
