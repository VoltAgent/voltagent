import type {
  BaseTool,
  MessageRole,
  StepWithContent,
  StreamPart,
  ToolErrorInfo,
  VoltAgentError,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import { type Tool as AiTool, type TextStreamPart, tool as createTool, generateId } from "ai";
import { P, match } from "ts-pattern";

/**
 * Convert VoltAgent tools to Vercel AI SDK format
 * @param tools Array of agent tools
 * @returns Object mapping tool names to their SDK implementations or undefined if no tools
 */
export function convertToolsForSDK(tools: BaseTool[]): Record<string, AiTool> | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }
  return tools.reduce<Record<string, AiTool>>((acc, tool) => {
    acc[tool.name] = createTool({
      description: tool.description,
      inputSchema: tool.parameters,
      outputSchema: tool.outputSchema,
      execute: tool.execute,
    });
    return acc;
  }, {});
}

/**
 * Create a step from a chunk
 * @param chunk - The chunk to create a step from
 * @returns The step or null if the chunk is not supported
 */
export function createStepFromChunk(chunk: {
  type: string;
  [key: string]: any;
}): StepWithContent | null {
  return match(chunk)
    .returnType<StepWithContent | null>()
    .when(
      (c) => c.type === "text" && c.text,
      (c) => ({
        id: generateId(),
        type: "text",
        content: c.text,
        role: "assistant" as MessageRole,
        usage: c.usage || undefined,
      }),
    )
    .with({ type: P.union("tool-call", "tool_call") }, (c) => ({
      id: c.toolCallId,
      type: "tool_call",
      name: c.toolName,
      arguments: c.input,
      content: safeStringify([
        {
          type: "tool-call",
          toolCallId: c.toolCallId,
          toolName: c.toolName,
          args: c.input,
        },
      ]),
      role: "assistant" as MessageRole,
      usage: c.usage || undefined,
    }))
    .with({ type: P.union("tool-result", "tool_result") }, (c) => ({
      id: c.toolCallId,
      type: "tool_result",
      name: c.toolName,
      result: c.output,
      content: safeStringify([
        {
          type: "tool-result",
          toolCallId: c.toolCallId,
          toolName: c.toolName,
          result: c.output,
        },
      ]),
      role: "assistant" as MessageRole,
      usage: c.usage || undefined,
    }))
    .otherwise(() => null);
}

export interface AISDKError extends Error {
  toolCallId?: string;
  toolName?: string;
  input?: Record<string, any>;
  code?: string;
}

/**
 * Creates a standardized VoltAgentError from a raw Vercel SDK error object.
 */
export function createVoltagentErrorFromSdkError(
  sdkError: unknown,
  errorStage:
    | "llm_stream"
    | "object_stream"
    | "llm_generate"
    | "object_generate"
    | "tool_execution" = "llm_stream",
): VoltAgentError {
  const originalError = match(sdkError)
    .returnType<AISDKError>()
    .with({ error: P.not(P.nullish) }, (e) => e.error as AISDKError)
    .with(P.instanceOf(Error), (e) => e)
    .otherwise(
      () =>
        new Error(`An unknown error occurred during Vercel AI operation (stage: ${errorStage})`),
    );

  return match(originalError)
    .returnType<VoltAgentError>()
    .with({ toolCallId: P.not(P.nullish), toolName: P.not(P.nullish) }, (e) => ({
      message: `Error during Vercel SDK operation (tool '${e.toolName}'): ${e instanceof Error ? originalError.message : "Unknown tool error"}`,
      originalError: e,
      toolError: {
        toolCallId: e.toolCallId,
        toolName: e.toolName,
        toolArguments: e.input,
        toolExecutionError: e,
      } satisfies ToolErrorInfo,
      stage: "tool_execution",
      code: e.code,
    }))
    .otherwise((e) => ({
      message: e.message,
      originalError: e,
      toolError: undefined,
      stage: errorStage,
      code: e.code,
    }));
}

/**
 * Map Vercel AI TextStreamPart to our standard StreamPart
 * @param part - The part to map
 * @returns The mapped part or null if the part is not supported
 */
export function mapToStreamPart(part: TextStreamPart<Record<string, any>>): StreamPart | null {
  return match(part)
    .returnType<StreamPart | null>()
    .with({ type: "text-delta" }, (p) => ({
      type: "text-delta",
      textDelta: p.text,
    }))
    .with({ type: "reasoning-delta" }, (p) => ({
      type: "reasoning",
      reasoning: p.text,
    }))
    .with({ type: "source", sourceType: "url" }, (p) => ({
      type: "source",
      source: p.url || "",
    }))
    .with({ type: "tool-call" }, (p) => ({
      type: "tool-call",
      toolCallId: p.toolCallId,
      toolName: p.toolName,
      args: p.input as Record<string, any>,
    }))
    .with({ type: "tool-result" }, (p) => ({
      type: "tool-result",
      toolCallId: p.toolCallId,
      toolName: p.toolName,
      result: p.output,
    }))
    .with({ type: "finish" }, (p) => ({
      type: "finish",
      finishReason: p.finishReason,
      usage: match(p)
        .with(
          {
            totalUsage: {
              inputTokens: P.number,
              outputTokens: P.number,
              totalTokens: P.number,
            },
          },
          (p) => ({
            promptTokens: p.totalUsage.inputTokens,
            completionTokens: p.totalUsage.outputTokens,
            totalTokens: p.totalUsage.totalTokens,
          }),
        )
        .otherwise(() => undefined),
    }))
    .with({ type: "error" }, (p) => ({
      type: "error",
      error: p.error as Error,
    }))
    .otherwise(() => null);
}

/**
 * Create mapped fullStream that converts Vercel AI parts to our standard parts
 * @param originalStream - The original stream of parts from the Vercel AI SDK
 * @returns A new stream of parts that are converted to our standard parts
 */
export function createMappedFullStream(
  originalStream: AsyncIterable<TextStreamPart<Record<string, any>>>,
): AsyncIterable<StreamPart> {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const part of originalStream) {
        const mappedPart = mapToStreamPart(part);
        if (mappedPart !== null) {
          yield mappedPart;
        }
      }
    },
  };
}
