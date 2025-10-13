/**
 * Test utilities for Scorers package
 */

import type { LanguageModel } from "ai";

/**
 * Default mock response values
 */
export const defaultMockResponse = {
  finishReason: "stop" as const,
  usage: {
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
  },
  warnings: [],
  rawPrompt: null,
  rawSettings: {},
};

/**
 * Simple MockLanguageModelV2 implementation
 * Based on AI SDK's MockLanguageModelV2 but without MSW dependency
 */
class MockLanguageModelV2 {
  specificationVersion = "v2";
  provider: string;
  modelId: string;
  doGenerate: any;
  doStream: any;
  doGenerateCalls: any[] = [];
  doStreamCalls: any[] = [];

  constructor(config?: {
    provider?: string;
    modelId?: string;
    doGenerate?: any;
    doStream?: any;
  }) {
    this.provider = config?.provider || "mock-provider";
    this.modelId = config?.modelId || "mock-model-id";

    const doGenerate = config?.doGenerate;
    this.doGenerate = async (options: any) => {
      this.doGenerateCalls.push(options);
      if (typeof doGenerate === "function") {
        return doGenerate(options);
      }
      if (Array.isArray(doGenerate)) {
        return doGenerate[this.doGenerateCalls.length - 1];
      }
      return doGenerate;
    };

    const doStream = config?.doStream;
    this.doStream = async (options: any) => {
      this.doStreamCalls.push(options);
      if (typeof doStream === "function") {
        return doStream(options);
      }
      if (Array.isArray(doStream)) {
        return doStream[this.doStreamCalls.length - 1];
      }
      return doStream;
    };
  }
}

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
    doStream: config?.doStream,
  });

  // Cast to LanguageModel to match AI SDK types
  return mockModel as unknown as LanguageModel;
}
