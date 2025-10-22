import { describe, expect, it } from "vitest";

import { createMockLanguageModel } from "../../core/src/agent/test-utils";

const {
  createFactualityScorer,
  createSummaryScorer,
  createTranslationScorer,
  createHumorScorer,
  createPossibleScorer,
} = await import("./llm/classifiers");

describe("LLM choice-based scorers", () => {
  it("scores factuality choices", async () => {
    const scorer = createFactualityScorer({
      model: createMockLanguageModel({
        doGenerate: {
          rawPrompt: null,
          rawSettings: {},
          content: [{ type: "text", text: '{"choice":"C","reason":"Matches"}' }],
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          warnings: [],
        },
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "Question", expected: "Expert", output: "Submission" },
      params: {},
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
    expect(result.metadata?.moderation).toBeUndefined();
    expect(result.metadata?.choice).toBe("C");
  });

  it("scores summary choices", async () => {
    const scorer = createSummaryScorer({
      model: createMockLanguageModel({
        doGenerate: {
          rawPrompt: null,
          rawSettings: {},
          content: [{ type: "text", text: '{"choice":"B"}' }],
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          warnings: [],
        },
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "Text", expected: "Summary A", output: "Summary B" },
      params: {},
    });

    expect(result.score).toBe(1);
    expect(result.metadata?.choice).toBe("B");
  });

  it("scores translation choices", async () => {
    const scorer = createTranslationScorer({
      model: createMockLanguageModel({
        doGenerate: {
          rawPrompt: null,
          rawSettings: {},
          content: [{ type: "text", text: '{"choice":"Y"}' }],
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          warnings: [],
        },
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "Hola", expected: "Hello", output: "Hello" },
      params: { language: "Spanish" },
    });

    expect(result.score).toBe(1);
    expect(result.metadata?.choice).toBe("Y");
  });

  it("scores humor judgments", async () => {
    const scorer = createHumorScorer({
      model: createMockLanguageModel({
        doGenerate: {
          rawPrompt: null,
          rawSettings: {},
          content: [{ type: "text", text: '{"choice":"YES","reason":"Playful tone."}' }],
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          warnings: [],
        },
      }),
    });

    const result = await scorer.scorer({
      payload: { output: "This joke is hilarious!" },
      params: {},
    });

    expect(result.score).toBe(1);
    expect(result.metadata?.choice).toBe("YES");
    expect(result.metadata?.reason).toContain("Playful");
  });

  it("scores possibility judgments", async () => {
    const scorer = createPossibleScorer({
      model: createMockLanguageModel({
        doGenerate: {
          rawPrompt: null,
          rawSettings: {},
          content: [{ type: "text", text: '{"choice":"A","reason":"States it cannot be done."}' }],
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          warnings: [],
        },
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "Bake a cake", output: "It cannot be done." },
      params: {},
    });

    expect(result.score).toBe(0);
    expect(result.metadata?.choice).toBe("A");
  });
});
