/**
 * Test utilities for Agent tests using AI SDK test helpers
 */

import type { LanguageModel, LanguageModelUsage, StepResult } from "ai";
import { MockLanguageModelV2, mockId } from "ai/test";
import { vi } from "vitest";
import { z } from "zod";
import type { ToolSchema } from "../agent/providers/base/types";
import { Tool } from "../tool";
import { Agent } from "./agent";
import type { AgentOptions } from "./types";

/**
 * Convert array to async iterable stream for testing
 */
export function convertArrayToAsyncIterable<T>(array: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of array) {
        yield item;
      }
    },
  };
}

/**
 * Convert array to ReadableStream for testing
 */
export function convertArrayToReadableStream<T>(array: T[]): ReadableStream<T> {
  return new ReadableStream({
    start(controller) {
      for (const item of array) {
        controller.enqueue(item);
      }
      controller.close();
    },
  });
}

/**
 * Default mock response values
 */
export const defaultMockResponse = {
  finishReason: "stop" as const,
  usage: {
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
  } as LanguageModelUsage,
  warnings: [],
};

/**
 * Create a mock LanguageModel with customizable responses
 */
export function createMockLanguageModel(config?: {
  modelId?: string;
  doGenerate?: any;
  doStream?: any;
}): LanguageModel {
  const mockModel = new MockLanguageModelV2({
    modelId: config?.modelId || "test-model",
    doGenerate: config?.doGenerate || {
      ...defaultMockResponse,
      content: [{ type: "text", text: "Mock response" }],
    },
    doStream: config?.doStream || {
      stream: convertArrayToReadableStream([
        { type: "text-delta" as const, id: "text-1", delta: "Mock ", text: "Mock " },
        { type: "text-delta" as const, id: "text-1", delta: "stream", text: "stream" },
        {
          type: "finish",
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        },
      ]),
      rawCall: { rawPrompt: null, rawSettings: {} },
      usage: Promise.resolve(defaultMockResponse.usage),
      warnings: [],
    },
  });

  // Cast to LanguageModel to match AI SDK types
  return mockModel as unknown as LanguageModel;
}

/**
 * Create a test agent with default configuration
 */
export function createTestAgent(options?: Partial<AgentOptions>): Agent {
  const defaultOptions: AgentOptions = {
    name: options?.name || "TestAgent",
    instructions: options?.instructions || "Test instructions",
    model: options?.model || createMockLanguageModel(),
    maxSteps: options?.maxSteps || 5,
    markdown: options?.markdown ?? false,
  };

  return new Agent({
    ...defaultOptions,
    ...options,
  });
}

/**
 * Create a mock tool for testing with VoltAgent Tool format
 */
export function createMockTool(
  name: string,
  execute?: (params: any, options?: any) => Promise<any> | any,
  options?: {
    description?: string;
    parameters?: ToolSchema;
    outputSchema?: ToolSchema;
  },
): Tool<any, any> {
  const defaultSchema = z.object({ input: z.string().optional() });
  return new Tool({
    name,
    description: options?.description || `Mock ${name} tool`,
    parameters: options?.parameters || defaultSchema,
    outputSchema: options?.outputSchema,
    execute: execute || (async () => `Result from ${name}`),
  });
}

/**
 * Create mock tool calls for testing
 */
export function createMockToolCall(toolName: string, args: any, result?: any) {
  return {
    toolCallId: mockId(),
    toolName,
    args,
    result: result || { output: `Result from ${toolName}` },
  };
}

/**
 * Create mock step result for testing
 */
export function createMockStepResult(options?: Partial<StepResult<any>>): StepResult<any> {
  return {
    text: options?.text || "",
    content: options?.content || [],
    reasoning: options?.reasoning || [],
    reasoningText: options?.reasoningText,
    sources: options?.sources || [],
    dynamicToolCalls: options?.dynamicToolCalls || [],
    dynamicToolResults: options?.dynamicToolResults || [],
    providerMetadata: options?.providerMetadata,
    request: options?.request || {},
    response: options?.response || {
      id: "test-response-id",
      modelId: "test-model",
      timestamp: new Date(),
      messages: [],
    },
    staticToolCalls: options?.staticToolCalls || [],
    staticToolResults: options?.staticToolResults || [],
    files: options?.files || [],
    toolCalls: options?.toolCalls || [],
    toolResults: options?.toolResults || [],
    finishReason: options?.finishReason || "stop",
    usage: options?.usage || defaultMockResponse.usage,
    warnings: options?.warnings || [],
    ...options,
  };
}

/**
 * Collect all chunks from an async iterable stream
 */
export async function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const chunks: T[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * Collect text from a text stream
 */
export async function collectTextStream(stream: AsyncIterable<string>): Promise<string> {
  const chunks = await collectStream(stream);
  return chunks.join("");
}

/**
 * Create a mock UIMessage for testing
 */
export function createMockUIMessage(role: "user" | "assistant" | "system", content: string) {
  return {
    id: mockId(),
    role,
    content: [{ type: "text" as const, text: content }],
  };
}

/**
 * Create a mock conversation with multiple messages
 */
export function createMockConversation() {
  return [
    createMockUIMessage("user", "Hello"),
    createMockUIMessage("assistant", "Hi there! How can I help you?"),
    createMockUIMessage("user", "What's the weather like?"),
    createMockUIMessage("assistant", "I don't have access to real-time weather data."),
  ];
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Timeout waiting for condition");
}

/**
 * Create a mock abort controller with auto-abort after delay
 */
export function createAutoAbortController(delay: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), delay);
  return controller;
}

/**
 * Create mock StreamTextResult for testing
 */
export function createMockStreamTextResult(overrides?: any) {
  const textContent = overrides?.text || "Mock streamed text";
  return {
    text: Promise.resolve(textContent),
    textStream: convertArrayToAsyncIterable(textContent.split(" ")),
    fullStream: convertArrayToAsyncIterable([
      { type: "text-delta" as const, id: "text-1", delta: "Mock ", text: "Mock " },
      { type: "text-delta" as const, id: "text-1", delta: "streamed ", text: "streamed " },
      { type: "text-delta" as const, id: "text-1", delta: "text", text: "text" },
      {
        type: "finish" as const,
        finishReason: "stop",
        usage: overrides?.usage || defaultMockResponse.usage,
        totalUsage: overrides?.totalUsage || defaultMockResponse.usage,
      },
    ]),
    usage: Promise.resolve(overrides?.usage || defaultMockResponse.usage),
    finishReason: Promise.resolve(overrides?.finishReason || "stop"),
    rawResponse: overrides?.rawResponse,
    warnings: overrides?.warnings || [],

    // Include the onFinish callback if provided
    onFinish: overrides?.onFinish ? Promise.resolve().then(overrides.onFinish) : undefined,

    // Include any other overrides
    ...overrides,
  } as any;
}

/**
 * Create a properly formatted GenerateTextResult mock
 */
export function createMockGenerateTextResult(overrides?: Partial<any>) {
  return {
    text: overrides?.text || "Mock generated text",
    content: overrides?.content || [],
    reasoning: overrides?.reasoning || [],
    reasoningText: overrides?.reasoningText || undefined,
    files: overrides?.files || [],
    sources: overrides?.sources || [],
    toolCalls: overrides?.toolCalls || [],
    staticToolCalls: overrides?.staticToolCalls || [],
    dynamicToolCalls: overrides?.dynamicToolCalls || [],
    toolResults: overrides?.toolResults || [],
    staticToolResults: overrides?.staticToolResults || [],
    dynamicToolResults: overrides?.dynamicToolResults || [],
    finishReason: overrides?.finishReason || "stop",
    usage: overrides?.usage || defaultMockResponse.usage,
    totalUsage: overrides?.totalUsage || defaultMockResponse.usage,
    warnings: overrides?.warnings || undefined,
    request: overrides?.request || {},
    response: overrides?.response || {
      id: "test-response-id",
      modelId: "test-model",
      timestamp: new Date(),
      messages: [],
    },
    providerMetadata: overrides?.providerMetadata || undefined,
    steps: overrides?.steps || [],
    experimental_output: overrides?.experimental_output || undefined,
  } as any;
}

/**
 * Mock the AI SDK functions for testing
 */
export function mockAISDKFunctions() {
  return {
    generateText: vi.fn(),
    streamText: vi.fn(),
    generateObject: vi.fn(),
    streamObject: vi.fn(),
  };
}
