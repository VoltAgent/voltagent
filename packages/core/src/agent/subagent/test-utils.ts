/**
 * Test utilities for SubAgent testing
 * Provides proper mocks that implement the Agent interface correctly
 */

import type { ModelMessage } from "@ai-sdk/provider-utils";
import { type Logger, safeStringify } from "@voltagent/internal";
import type { FinishReason, LanguageModel, LanguageModelUsage, UIMessage } from "ai";
import { MockLanguageModelV2, simulateReadableStream } from "ai/test";
import { vi } from "vitest";
import { z } from "zod";
import type { BaseRetriever } from "../../retriever/retriever";
import { type Tool, type Toolkit, createTool } from "../../tool";
import type { Voice } from "../../voice";
import type { VoltOpsClient } from "../../voltops/client";
import { Agent } from "../agent";
import type {
  AgentHooks,
  GenerateObjectOptions,
  GenerateObjectResultWithContext,
  GenerateTextOptions,
  GenerateTextResultWithContext,
  StreamObjectOptions,
  StreamObjectResultWithContext,
  StreamTextOptions,
  StreamTextResultWithContext,
} from "../agent";
import type { ToolSchema } from "../providers/base/types";
import type { SupervisorConfig } from "../types";
import type { SubAgentConfig } from "./types";

/**
 * Creates a mock language model using AI SDK's test utilities
 */
export function createMockLanguageModel(_name = "mock-model"): LanguageModel {
  return new MockLanguageModelV2({
    doGenerate: async () => ({
      finishReason: "stop",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      content: [{ type: "text", text: "Mock response" }],
      warnings: [],
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Mock ", text: "Mock " },
          { type: "text-delta", id: "text-1", delta: "stream ", text: "stream " },
          { type: "text-delta", id: "text-1", delta: "response", text: "response" },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          },
        ],
      }),
    }),
  }) as LanguageModel;
}

/**
 * Options for creating a mock agent
 */
export interface CreateMockAgentOptions {
  id?: string;
  name?: string;
  instructions?: string;
  model?: LanguageModel;
  tools?: (Tool<ToolSchema, ToolSchema | undefined> | Toolkit)[];
  voice?: Voice;
  retriever?: BaseRetriever;
  subAgents?: SubAgentConfig[];
  supervisorConfig?: SupervisorConfig;
  hooks?: AgentHooks;
  temperature?: number;
  maxSteps?: number;
  markdown?: boolean;
  logger?: Logger;
  voltOpsClient?: VoltOpsClient;
  context?: Map<string | symbol, unknown>;
}

/**
 * Creates a properly typed mock agent for testing
 */
export function createMockAgent(options: CreateMockAgentOptions = {}): Agent {
  const {
    id = "mock-agent-id",
    name = "Mock Agent",
    instructions = "You are a mock agent for testing",
    model = createMockLanguageModel(),
    tools = [],
    voice,
    retriever,
    subAgents = [],
    supervisorConfig,
    hooks = {},
    temperature,
    maxSteps = 5,
    markdown = false,
    logger,
    voltOpsClient,
    context,
  } = options;

  return new Agent({
    id,
    name,
    instructions,
    model,
    tools,
    voice,
    retriever,
    subAgents,
    supervisorConfig,
    hooks,
    temperature,
    maxSteps,
    markdown,
    logger,
    voltOpsClient,
    context,
  });
}

/**
 * Creates proper usage object for mocking
 */
function createMockUsage(): LanguageModelUsage {
  return {
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
  };
}

/**
 * Creates a mock agent with AI SDK's MockLanguageModelV2
 * This creates a real agent with predictable model responses
 */
export function createMockAgentWithStubs(options: CreateMockAgentOptions = {}) {
  // Create agent with a properly configured mock model
  const mockModel = new MockLanguageModelV2({
    doGenerate: async () => ({
      finishReason: "stop",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      content: [{ type: "text", text: `Response from ${options.name || "Mock Agent"}` }],
      warnings: [],
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Hello from ", text: "Hello from " },
          {
            type: "text-delta",
            id: "text-1",
            delta: options.name || "Mock Agent",
            text: options.name || "Mock Agent",
          },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          },
        ],
      }),
    }),
  });

  const agent = createMockAgent({
    ...options,
    model: mockModel as LanguageModel,
  });

  // Optionally stub individual methods if needed for specific test cases
  vi.spyOn(agent, "streamText").mockImplementation(
    async (
      _input: string | ModelMessage[] | UIMessage[],
      _options?: StreamTextOptions,
    ): Promise<StreamTextResultWithContext> => {
      const textContent = `Hello from ${agent.name}`;
      const stream = simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Hello ", text: "Hello " },
          { type: "text-delta", id: "text-1", delta: "from ", text: "from " },
          { type: "text-delta", id: "text-1", delta: agent.name, text: agent.name },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          },
        ],
      });

      // Create async iterable for text stream
      const textStream = Object.assign(stream, {
        [Symbol.asyncIterator]: async function* () {
          yield "Hello ";
          yield "from ";
          yield agent.name;
        },
      });

      const result: StreamTextResultWithContext = {
        fullStream: stream as any,
        textStream: textStream as any,
        text: Promise.resolve(textContent),
        usage: Promise.resolve(createMockUsage()),
        finishReason: Promise.resolve("stop"),
        context: new Map(),
        experimental_partialOutputStream: undefined,
        toUIMessageStream: vi.fn(),
        toUIMessageStreamResponse: vi.fn(),
        pipeUIMessageStreamToResponse: vi.fn(),
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
      };

      return result;
    },
  );

  // Stub generateText method with proper signature
  vi.spyOn(agent, "generateText").mockImplementation(
    async (
      _input: string | ModelMessage[] | UIMessage[],
      _options?: GenerateTextOptions,
    ): Promise<GenerateTextResultWithContext> => {
      // Use a minimal mock that satisfies the interface
      const result = {
        text: `Response from ${agent.name}`,
        content: [],
        reasoning: [],
        reasoningText: "",
        files: [],
        sources: [],
        toolCalls: [],
        staticToolCalls: [],
        dynamicToolCalls: [],
        toolResults: [],
        staticToolResults: [],
        dynamicToolResults: [],
        usage: createMockUsage(),
        totalUsage: createMockUsage(),
        warnings: [],
        finishReason: "stop" as const,
        steps: [],
        experimental_output: undefined,
        response: {
          id: "mock-response-id",
          modelId: "mock-model",
          timestamp: new Date(),
          messages: [], // Add messages array for compatibility
        },
        context: new Map(),
        request: {
          body: {},
        },
        providerMetadata: undefined,
        experimental_providerMetadata: undefined,
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
        toDataStream: vi.fn(),
        toDataStreamResponse: vi.fn(),
        pipeDataStreamToResponse: vi.fn(),
      } as GenerateTextResultWithContext;

      return result;
    },
  );

  // Stub streamObject method using AI SDK test utilities
  vi.spyOn(agent, "streamObject").mockImplementation(
    async <T extends z.ZodTypeAny>(
      _input: string | ModelMessage[] | UIMessage[],
      _schema: T,
      _options?: StreamObjectOptions,
    ): Promise<StreamObjectResultWithContext<z.infer<T>>> => {
      const mockObject = { result: `Object from ${agent.name}` } as z.infer<T>;
      const objectJson = safeStringify(mockObject);

      const stream = simulateReadableStream({
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: objectJson, text: objectJson },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            totalUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          },
        ],
      });

      const partialObjectStream = new ReadableStream<Partial<z.infer<T>>>({
        async start(controller) {
          controller.enqueue(mockObject);
          controller.close();
        },
      });

      const textStream = Object.assign(stream, {
        [Symbol.asyncIterator]: async function* () {
          yield "Generating object...";
        },
      });

      const result: StreamObjectResultWithContext<z.infer<T>> = {
        object: Promise.resolve(mockObject),
        partialObjectStream,
        textStream: textStream as any,
        warnings: Promise.resolve(undefined),
        usage: Promise.resolve(createMockUsage()),
        finishReason: Promise.resolve("stop"),
        context: new Map(),
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
      };

      return result;
    },
  );

  // Stub generateObject method with proper signature
  vi.spyOn(agent, "generateObject").mockImplementation(
    async <T extends z.ZodTypeAny>(
      _input: string | ModelMessage[] | UIMessage[],
      _schema: T,
      _options?: GenerateObjectOptions,
    ): Promise<GenerateObjectResultWithContext<z.infer<T>>> => {
      const result = {
        object: { result: `Object from ${agent.name}` } as z.infer<T>,
        usage: createMockUsage(),
        warnings: [],
        finishReason: "stop" as const,
        response: {
          id: "mock-response-id",
          modelId: "mock-model",
          timestamp: new Date(),
          messages: [], // Add messages array for compatibility
        },
        context: new Map(),
        request: {
          body: {},
        },
        reasoning: "<REASONING>",
        providerMetadata: undefined,
        toJsonResponse: vi.fn(),
      } as GenerateObjectResultWithContext<z.infer<T>>;

      return result;
    },
  );

  return agent;
}

/**
 * Creates test messages in the proper UIMessage format
 */
export function createTestMessage(
  content: string,
  role: "user" | "assistant" | "system" = "user",
): UIMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    role,
    parts: [{ type: "text", text: content }],
  };
}

/**
 * Creates a batch of test messages
 */
export function createTestMessages(
  ...contents: Array<{ content: string; role?: "user" | "assistant" | "system" }>
): UIMessage[] {
  return contents.map(({ content, role = "user" }) => createTestMessage(content, role));
}

/**
 * Mock stream event types
 */
interface MockStreamEvents {
  textDelta: (
    text: string,
    id?: string,
  ) => { type: "text-delta"; id: string; delta: string; text: string };
  toolCall: (
    id: string,
    name: string,
    input: unknown,
  ) => { type: "tool-call"; toolCallId: string; toolName: string; input: unknown };
  toolResult: (
    id: string,
    name: string,
    output: unknown,
    input?: unknown,
  ) => {
    type: "tool-result";
    toolCallId: string;
    toolName: string;
    input: unknown;
    output: unknown;
  };
  finish: (reason?: FinishReason) => {
    type: "finish";
    finishReason: FinishReason;
    totalUsage: LanguageModelUsage;
  };
  error: (error: unknown) => { type: "error"; error: unknown };
}

/**
 * Mock stream events for testing event forwarding
 */
export const mockStreamEvents: MockStreamEvents = {
  textDelta: (text: string, id = "text-1") => ({
    type: "text-delta" as const,
    id,
    delta: text,
    text,
  }),
  toolCall: (id: string, name: string, input: unknown) => ({
    type: "tool-call" as const,
    toolCallId: id,
    toolName: name,
    input,
  }),
  toolResult: (id: string, name: string, output: unknown, input?: unknown) => ({
    type: "tool-result" as const,
    toolCallId: id,
    toolName: name,
    input: input ?? undefined,
    output,
  }),
  finish: (reason: FinishReason = "stop") => ({
    type: "finish" as const,
    finishReason: reason,
    totalUsage: createMockUsage(),
  }),
  error: (error: unknown) => ({
    type: "error" as const,
    error,
  }),
};

/**
 * Creates an async generator for testing streams
 */
export async function* createMockStream<T>(events: T[]): AsyncGenerator<T, void, unknown> {
  for (const event of events) {
    yield event;
  }
}

/**
 * Test fixture for SubAgent configurations
 */
export const subAgentFixtures = {
  streamText: (agent: Agent) => ({
    agent,
    method: "streamText" as const,
    options: {},
  }),
  generateText: (agent: Agent) => ({
    agent,
    method: "generateText" as const,
    options: {},
  }),
  streamObject: (agent: Agent, schema: z.ZodTypeAny) => ({
    agent,
    method: "streamObject" as const,
    schema,
    options: {},
  }),
  generateObject: (agent: Agent, schema: z.ZodTypeAny) => ({
    agent,
    method: "generateObject" as const,
    schema,
    options: {},
  }),
};

/**
 * Waits for all promises in an async iterator
 */
export async function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of stream) {
    results.push(item);
  }
  return results;
}

/**
 * Creates a mock tool for testing
 */
export function createMockTool(name = "mock_tool"): Tool<ToolSchema, undefined> {
  const schema: ToolSchema = z.object({});
  return createTool({
    id: `tool-${name}`,
    name,
    description: `Mock tool ${name}`,
    parameters: schema,
    execute: vi.fn().mockResolvedValue({ result: `Result from ${name}` }),
  });
}

/**
 * Creates a mock toolkit for testing
 */
export function createMockToolkit(name = "mock_toolkit"): Toolkit {
  return {
    name,
    description: `Mock toolkit ${name}`,
    tools: [createMockTool(`${name}_tool_1`), createMockTool(`${name}_tool_2`)],
  };
}
