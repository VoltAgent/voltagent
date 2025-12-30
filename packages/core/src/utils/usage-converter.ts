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

  const resolveTokenTotal = (value: number | { total?: number } | undefined): number => {
    if (typeof value === "number") return value;
    if (value && typeof value.total === "number") return value.total;
    return 0;
  };

  const inputTokens = resolveTokenTotal(
    usage.inputTokens as number | { total?: number } | undefined,
  );
  const outputTokens = resolveTokenTotal(
    usage.outputTokens as number | { total?: number } | undefined,
  );
  const totalTokens =
    typeof usage.totalTokens === "number" ? usage.totalTokens : inputTokens + outputTokens;

  const cachedInputTokens =
    usage.cachedInputTokens ??
    (usage as any).inputTokenDetails?.cacheReadTokens ??
    (typeof usage.inputTokens === "object"
      ? ((usage.inputTokens as any)?.cacheRead ?? (usage.inputTokens as any)?.cacheReadTokens)
      : undefined) ??
    0;

  const reasoningTokens =
    usage.reasoningTokens ??
    (usage as any).outputTokenDetails?.reasoningTokens ??
    (typeof usage.outputTokens === "object"
      ? ((usage.outputTokens as any)?.reasoning ?? (usage.outputTokens as any)?.reasoningTokens)
      : undefined) ??
    0;

  return {
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens,
    cachedInputTokens,
    reasoningTokens,
  };
}
