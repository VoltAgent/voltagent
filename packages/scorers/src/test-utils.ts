/**
 * Test utilities for Scorers package
 */

import type { FinishReason, LanguageModel, LanguageModelUsage } from "ai";

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

const defaultProviderUsage: ProviderUsage = {
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
    const candidate = finishReason as ProviderFinishReason;
    return {
      unified: finishReasonSet.has(candidate.unified) ? candidate.unified : "other",
      raw:
        typeof candidate.raw === "string"
          ? candidate.raw
          : candidate.raw == null
            ? undefined
            : String(candidate.raw),
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

/**
 * Simple MockLanguageModelV3 implementation
 * Based on AI SDK's MockLanguageModelV3 but without MSW dependency
 */
class MockLanguageModelV3 {
  specificationVersion = "v3";
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
        return normalizeGenerateResult(await doGenerate(options));
      }
      if (Array.isArray(doGenerate)) {
        return normalizeGenerateResult(doGenerate[this.doGenerateCalls.length - 1]);
      }
      return normalizeGenerateResult(doGenerate);
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
  const mockModel = new MockLanguageModelV3({
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
