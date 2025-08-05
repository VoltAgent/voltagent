import type { BaseMessage } from "@voltagent/core";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import type { VercelAIProvider } from "./provider";

/**
 * Creates a mock model that can be used to test the provider.
 * @param output - The output to return from the model.
 * @returns A mock model that can be used to test the provider.
 */
export function createMockModel(
  output: Error | BaseMessage[] | Record<string, any>,
): ProviderModel {
  const text = Array.isArray(output) ? convertMessagesToText(output) : JSON.stringify(output);
  const chunks = Array.isArray(output)
    ? covertMessagesToChunks(output)
    : convertObjectToChunks(output);

  return new MockLanguageModelV2({
    modelId: "mock-model",
    doGenerate: async () => {
      if (output instanceof Error) {
        throw output;
      }

      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        warnings: [],
      };
    },
    doStream: async () => {
      if (output instanceof Error) {
        throw output;
      }

      const streamChunks = [
        { type: "text-start" as const, id: "text-1" },
        ...chunks.map((chunk) => ({
          type: "text-delta" as const,
          id: "text-1",
          delta: chunk.textDelta,
        })),
        { type: "text-end" as const, id: "text-1" },
        {
          type: "finish" as const,
          finishReason: "stop" as const,
          usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
        },
      ];

      return {
        stream: simulateReadableStream({ chunks: streamChunks }),
      };
    },
  });
}

type ProviderModel = Parameters<VercelAIProvider["generateText"]>[0]["model"];

function convertMessagesToText(messages: Array<BaseMessage>) {
  return messages.map((m) => m.content).join("\n");
}

function covertMessagesToChunks(messages: Array<BaseMessage>) {
  return convertMessagesToText(messages)
    .split("\n")
    .map((chunk) => ({ type: "text-delta", textDelta: chunk }) as const);
}

function convertObjectToChunks(object: Record<string, any>) {
  return JSON.stringify(object, null, 2)
    .split("\n")
    .map((chunk) => ({ type: "text-delta", textDelta: chunk }) as const);
}
