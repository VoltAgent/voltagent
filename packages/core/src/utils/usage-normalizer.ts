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

const shouldUseLastStepUsage = (providerMetadata: unknown, usage?: LanguageModelUsage): boolean => {
  if (providerMetadata && typeof providerMetadata === "object") {
    if (Object.prototype.hasOwnProperty.call(providerMetadata, "anthropic")) {
      return true;
    }
  }

  const raw = (usage as { raw?: Record<string, unknown> } | undefined)?.raw;
  if (raw && typeof raw === "object") {
    if (
      Object.prototype.hasOwnProperty.call(raw, "cache_creation_input_tokens") ||
      Object.prototype.hasOwnProperty.call(raw, "cache_read_input_tokens")
    ) {
      return true;
    }
  }

  return false;
};

export const resolveFinishUsage = (input: FinishUsageInput): LanguageModelUsage | undefined => {
  const { providerMetadata, usage, totalUsage } = input;
  if (!usage && !totalUsage) {
    return undefined;
  }

  if (shouldUseLastStepUsage(providerMetadata, usage ?? totalUsage)) {
    return usage ?? totalUsage;
  }

  return totalUsage ?? usage;
};

export async function* normalizeFinishUsageStream<T extends StreamPartWithUsage>(
  baseStream: AsyncIterable<T>,
): AsyncIterable<T> {
  let lastStepUsage: LanguageModelUsage | undefined;
  let useLastStepUsage = false;

  for await (const part of baseStream) {
    if (part.type === "finish-step") {
      lastStepUsage = part.usage;
      if (!useLastStepUsage) {
        useLastStepUsage = shouldUseLastStepUsage(part.providerMetadata, lastStepUsage);
      }
    }

    if (part.type === "finish" && !useLastStepUsage) {
      if (shouldUseLastStepUsage(part.providerMetadata, lastStepUsage)) {
        useLastStepUsage = true;
        if (part.usage) {
          lastStepUsage = part.usage;
        }
      }
    }

    if (part.type === "finish" && useLastStepUsage && lastStepUsage) {
      if (part.totalUsage !== undefined) {
        yield { ...part, totalUsage: lastStepUsage };
        continue;
      }
    }

    yield part;
  }
}
