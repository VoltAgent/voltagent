import type { LanguageModelUsage } from "ai";
import { describe, expect, it } from "vitest";
import { normalizeFinishUsageStream, resolveFinishUsage } from "./usage-normalizer";

const collectStream = async <T>(stream: AsyncIterable<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of stream) {
    items.push(item);
  }
  return items;
};

const toAsync = async function* <T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
};

describe("resolveFinishUsage", () => {
  it("prefers last-step usage when provider metadata indicates anthropic", () => {
    const lastStepUsage: LanguageModelUsage = {
      inputTokens: 5,
      outputTokens: 6,
      totalTokens: 11,
    };
    const totalUsage: LanguageModelUsage = {
      inputTokens: 50,
      outputTokens: 60,
      totalTokens: 110,
    };

    const resolved = resolveFinishUsage({
      providerMetadata: { anthropic: { model: "claude" } },
      usage: lastStepUsage,
      totalUsage,
    });

    expect(resolved).toBe(lastStepUsage);
  });

  it("prefers last-step usage when usage includes cache fields", () => {
    const lastStepUsage = {
      inputTokens: 5,
      outputTokens: 6,
      totalTokens: 11,
      raw: { cache_creation_input_tokens: 10 },
    } as LanguageModelUsage;
    const totalUsage: LanguageModelUsage = {
      inputTokens: 50,
      outputTokens: 60,
      totalTokens: 110,
    };

    const resolved = resolveFinishUsage({
      usage: lastStepUsage,
      totalUsage,
    });

    expect(resolved).toBe(lastStepUsage);
  });

  it("prefers total usage when provider is not anthropic", () => {
    const lastStepUsage: LanguageModelUsage = {
      inputTokens: 5,
      outputTokens: 6,
      totalTokens: 11,
    };
    const totalUsage: LanguageModelUsage = {
      inputTokens: 50,
      outputTokens: 60,
      totalTokens: 110,
    };

    const resolved = resolveFinishUsage({
      providerMetadata: { openai: { model: "gpt-4o" } },
      usage: lastStepUsage,
      totalUsage,
    });

    expect(resolved).toBe(totalUsage);
  });

  it("falls back to the available usage value", () => {
    const usageOnly: LanguageModelUsage = {
      inputTokens: 5,
      outputTokens: 6,
      totalTokens: 11,
    };
    const totalOnly: LanguageModelUsage = {
      inputTokens: 50,
      outputTokens: 60,
      totalTokens: 110,
    };

    expect(resolveFinishUsage({ usage: usageOnly })).toBe(usageOnly);
    expect(resolveFinishUsage({ totalUsage: totalOnly })).toBe(totalOnly);
  });
});

describe("normalizeFinishUsageStream", () => {
  it("overrides finish totalUsage with last-step usage for anthropic streams", async () => {
    const lastStepUsage: LanguageModelUsage = {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    };
    const totalUsage: LanguageModelUsage = {
      inputTokens: 40,
      outputTokens: 20,
      totalTokens: 60,
    };
    const parts = [
      { type: "text", text: "hello" },
      {
        type: "finish-step",
        usage: lastStepUsage,
        providerMetadata: { anthropic: { model: "claude" } },
      },
      { type: "finish", finishReason: "stop", totalUsage },
    ];

    const normalized = await collectStream(normalizeFinishUsageStream(toAsync(parts)));

    expect(normalized[2].totalUsage).toEqual(lastStepUsage);
  });

  it("uses finish metadata to override totalUsage when finish-step metadata is missing", async () => {
    const lastStepUsage: LanguageModelUsage = {
      inputTokens: 9,
      outputTokens: 4,
      totalTokens: 13,
    };
    const totalUsage: LanguageModelUsage = {
      inputTokens: 20,
      outputTokens: 10,
      totalTokens: 30,
    };
    const parts = [
      { type: "finish-step", usage: lastStepUsage },
      {
        type: "finish",
        finishReason: "stop",
        totalUsage,
        providerMetadata: { anthropic: { model: "claude" } },
      },
    ];

    const normalized = await collectStream(normalizeFinishUsageStream(toAsync(parts)));

    expect(normalized[1].totalUsage).toEqual(lastStepUsage);
  });

  it("overrides totalUsage when cache fields indicate anthropic usage", async () => {
    const lastStepUsage = {
      inputTokens: 8,
      outputTokens: 4,
      totalTokens: 12,
      raw: { cache_read_input_tokens: 2 },
    } as LanguageModelUsage;
    const totalUsage: LanguageModelUsage = {
      inputTokens: 30,
      outputTokens: 15,
      totalTokens: 45,
    };
    const parts = [
      { type: "finish-step", usage: lastStepUsage },
      { type: "finish", finishReason: "stop", totalUsage },
    ];

    const normalized = await collectStream(normalizeFinishUsageStream(toAsync(parts)));

    expect(normalized[1].totalUsage).toEqual(lastStepUsage);
  });

  it("keeps finish totalUsage unchanged for non-anthropic streams", async () => {
    const lastStepUsage: LanguageModelUsage = {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    };
    const totalUsage: LanguageModelUsage = {
      inputTokens: 40,
      outputTokens: 20,
      totalTokens: 60,
    };
    const parts = [
      {
        type: "finish-step",
        usage: lastStepUsage,
        providerMetadata: { openai: { model: "gpt-4o" } },
      },
      { type: "finish", finishReason: "stop", totalUsage },
    ];

    const normalized = await collectStream(normalizeFinishUsageStream(toAsync(parts)));

    expect(normalized[1].totalUsage).toEqual(totalUsage);
  });

  it("does not add totalUsage when finish part omits it", async () => {
    const lastStepUsage: LanguageModelUsage = {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    };
    const parts = [
      {
        type: "finish-step",
        usage: lastStepUsage,
        providerMetadata: { anthropic: { model: "claude" } },
      },
      { type: "finish", finishReason: "stop" },
    ];

    const normalized = await collectStream(normalizeFinishUsageStream(toAsync(parts)));

    expect(normalized[1].totalUsage).toBeUndefined();
  });
});
