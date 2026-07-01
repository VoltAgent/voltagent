import type { LanguageModelUsage } from "ai";

type FinishUsageInput = {
  providerMetadata?: unknown;
  usage?: LanguageModelUsage;
  totalUsage?: LanguageModelUsage;
};

type StreamPartWithUsage = {
  type: string;
  usage?: LanguageModelUsage;
  totalUsage?: LanguageModelUsage;
  providerMetadata?: unknown;
};

export const resolveFinishUsage = (input: FinishUsageInput): LanguageModelUsage | undefined => {
  const { usage, totalUsage } = input;
  if (!usage && !totalUsage) {
    return undefined;
  }

  return totalUsage ?? usage;
};

export async function* normalizeFinishUsageStream<T extends StreamPartWithUsage>(
  baseStream: AsyncIterable<T>,
): AsyncIterable<T> {
  for await (const part of baseStream) {
    yield part;
  }
}
