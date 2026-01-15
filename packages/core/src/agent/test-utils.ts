/**
 * Test utilities for Agent tests using AI SDK test helpers
 */

import { ReadableStream as WebReadableStream } from "node:stream/web";
import type { FinishReason, LanguageModel, LanguageModelUsage, StepResult } from "ai";
import { MockLanguageModelV3, mockId } from "ai/test";
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
    inputTokenDetails: {
      noCacheTokens: 10,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokenDetails: {
      textTokens: 5,
      reasoningTokens: 0,
    },
    cachedInputTokens: 0,
    reasoningTokens: 0,
    raw: undefined,
  } as LanguageModelUsage,
  warnings: [],
};

const finishReasonValues: FinishReason[] = [
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
];

const finishReasonSet = new Set<FinishReason>(finishReasonValues);

type ProviderFinishReason = {
  unified: FinishReason;
  raw: string | undefined;
};

type ProviderUsage = {
  inputTokens: {
    total: number | undefined;
    noCache: number | undefined;
    cacheRead: number | undefined;
    cacheWrite: number | undefined;
  };
  outputTokens: {
    total: number | undefined;
    text: number | undefined;
    reasoning: number | undefined;
  };
  raw?: Record<string, unknown>;
};

const defaultProviderUsage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: 0,
    cacheWrite: 0,
  },
  outputTokens: {
    total: 5,
    text: 5,
    reasoning: 0,
  },
};

const defaultProviderFinishReason: ProviderFinishReason = {
  unified: "stop",
  raw: "stop",
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  return (
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    "then" in (value as Record<string, unknown>) &&
    typeof (value as { then?: unknown }).then === "function"
  );
};

const isProviderUsage = (usage: unknown): usage is ProviderUsage => {
  if (!usage || typeof usage !== "object") return false;
  const candidate = usage as ProviderUsage;
  return (
    typeof candidate.inputTokens === "object" &&
    candidate.inputTokens !== null &&
    "total" in candidate.inputTokens &&
    typeof candidate.outputTokens === "object" &&
    candidate.outputTokens !== null &&
    "total" in candidate.outputTokens
  );
};

const normalizeFinishReason = (finishReason: unknown): ProviderFinishReason => {
  if (finishReason && typeof finishReason === "object" && "unified" in finishReason) {
    const unifiedValue = (finishReason as ProviderFinishReason).unified;
    const rawValue = (finishReason as ProviderFinishReason).raw;
    return {
      unified: finishReasonSet.has(unifiedValue) ? unifiedValue : "other",
      raw:
        typeof rawValue === "string" ? rawValue : rawValue == null ? undefined : String(rawValue),
    };
  }

  if (typeof finishReason === "string") {
    return {
      unified: finishReasonSet.has(finishReason as FinishReason)
        ? (finishReason as FinishReason)
        : "other",
      raw: finishReason,
    };
  }

  return defaultProviderFinishReason;
};

const normalizeProviderUsage = (
  usage: LanguageModelUsage | ProviderUsage | undefined,
): ProviderUsage | undefined => {
  if (!usage) return undefined;
  if (isPromiseLike(usage)) return undefined;
  if (isProviderUsage(usage)) return usage;

  const inputTokens = usage.inputTokens ?? usage.inputTokenDetails?.noCacheTokens;
  const outputTokens = usage.outputTokens ?? usage.outputTokenDetails?.textTokens;
  const hasInput = inputTokens != null || usage.inputTokenDetails != null;
  const hasOutput = outputTokens != null || usage.outputTokenDetails != null;

  return {
    inputTokens: {
      total: typeof inputTokens === "number" ? inputTokens : undefined,
      noCache: usage.inputTokenDetails?.noCacheTokens ?? inputTokens,
      cacheRead: usage.inputTokenDetails?.cacheReadTokens ?? (hasInput ? 0 : undefined),
      cacheWrite: usage.inputTokenDetails?.cacheWriteTokens ?? (hasInput ? 0 : undefined),
    },
    outputTokens: {
      total: typeof outputTokens === "number" ? outputTokens : undefined,
      text: usage.outputTokenDetails?.textTokens ?? outputTokens,
      reasoning: usage.outputTokenDetails?.reasoningTokens ?? (hasOutput ? 0 : undefined),
    },
    raw: usage.raw as Record<string, unknown> | undefined,
  };
};

const normalizeGenerateResult = (result: any) => {
  if (!result || typeof result !== "object") return result;
  return {
    ...result,
    finishReason: normalizeFinishReason(result.finishReason),
    usage: normalizeProviderUsage(result.usage) ?? defaultProviderUsage,
  };
};

const normalizeStreamPart = (part: any) => {
  if (!part || typeof part !== "object") return part;
  if (part.type !== "finish") return part;

  return {
    ...part,
    finishReason: normalizeFinishReason(part.finishReason),
    usage: normalizeProviderUsage(part.usage) ?? defaultProviderUsage,
    totalUsage:
      normalizeProviderUsage(part.totalUsage as LanguageModelUsage | ProviderUsage | undefined) ??
      part.totalUsage,
  };
};

const mapReadableStream = <T, U>(
  stream: ReadableStream<T>,
  mapChunk: (chunk: T) => U,
): ReadableStream<U> => {
  let reader: ReadableStreamDefaultReader<T> | undefined;

  return new ReadableStream<U>({
    start() {
      reader = stream.getReader();
    },
    async pull(controller) {
      if (!reader) {
        controller.close();
        return;
      }

      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(mapChunk(value));
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader?.cancel(reason);
    },
  });
};

const asyncIterableToReadableStream = <T>(iterable: AsyncIterable<T>): ReadableStream<T> => {
  return WebReadableStream.from(iterable) as ReadableStream<T>;
};

const normalizeStream = (stream: unknown): ReadableStream<unknown> => {
  if (stream && typeof (stream as ReadableStream<unknown>).getReader === "function") {
    return mapReadableStream(stream as ReadableStream<unknown>, normalizeStreamPart);
  }

  if (stream && Symbol.asyncIterator in Object(stream)) {
    const mappedIterable = (async function* () {
      for await (const chunk of stream as AsyncIterable<unknown>) {
        yield normalizeStreamPart(chunk);
      }
    })();
    return asyncIterableToReadableStream(mappedIterable);
  }

  return stream as ReadableStream<unknown>;
};

const normalizeStreamResult = (result: any) => {
  if (!result || typeof result !== "object") return result;
  const usage = isPromiseLike(result.usage)
    ? result.usage
    : (normalizeProviderUsage(result.usage) ?? result.usage);
  const totalUsage = isPromiseLike(result.totalUsage)
    ? result.totalUsage
    : (normalizeProviderUsage(result.totalUsage) ?? result.totalUsage);
  return {
    ...result,
    stream: normalizeStream(result.stream),
    usage,
    totalUsage,
  };
};

/**
 * Create a mock LanguageModel with customizable responses
 */
export function createMockLanguageModel(config?: {
  modelId?: string;
  doGenerate?: any;
  doStream?: any;
}): LanguageModel {
  const normalizedDoGenerate =
    config?.doGenerate == null
      ? undefined
      : typeof config.doGenerate === "function"
        ? async (options: any) => normalizeGenerateResult(await config.doGenerate(options))
        : Array.isArray(config.doGenerate)
          ? config.doGenerate.map(normalizeGenerateResult)
          : normalizeGenerateResult(config.doGenerate);

  const normalizedDoStream =
    config?.doStream == null
      ? undefined
      : typeof config.doStream === "function"
        ? async (options: any) => normalizeStreamResult(await config.doStream(options))
        : Array.isArray(config.doStream)
          ? config.doStream.map(normalizeStreamResult)
          : normalizeStreamResult(config.doStream);

  const mockModel = new MockLanguageModelV3({
    modelId: config?.modelId || "test-model",
    doGenerate:
      normalizedDoGenerate ||
      ({
        finishReason: defaultProviderFinishReason,
        usage: defaultProviderUsage,
        content: [{ type: "text", text: "Mock response" }],
        warnings: [],
      } as any),
    doStream:
      normalizedDoStream ||
      ({
        stream: normalizeStream(
          convertArrayToReadableStream([
            { type: "text-start" as const, id: "text-1" },
            { type: "text-delta" as const, id: "text-1", delta: "Mock " },
            { type: "text-delta" as const, id: "text-1", delta: "stream" },
            { type: "text-end" as const, id: "text-1" },
            {
              type: "finish",
              finishReason: defaultProviderFinishReason,
              usage: defaultProviderUsage,
            },
          ]),
        ),
      } as any),
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
  execute?: (params: any, options?: any) => PromiseLike<any> | AsyncIterable<any> | any,
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
    rawFinishReason: options?.rawFinishReason,
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
    output: overrides?.output || undefined,
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
