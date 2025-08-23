/**
 * Utility for converting between different usage formats
 */

import type { LanguageModelUsage } from "ai";
import type { UsageInfo } from "../agent/providers/base/types";

/**
 * Convert AI SDK usage format to VoltAgent usage format
 * AI SDK uses: inputTokens, outputTokens, totalTokens
 * VoltAgent uses: promptTokens, completionTokens, totalTokens
 */
export function convertUsage(usage: LanguageModelUsage | undefined): UsageInfo | undefined {
  if (!usage) return undefined;

  return {
    promptTokens: usage.inputTokens || 0,
    completionTokens: usage.outputTokens || 0,
    totalTokens: usage.totalTokens || 0,
    cachedInputTokens: usage.cachedInputTokens || 0,
    reasoningTokens: usage.reasoningTokens || 0,
  };
}
