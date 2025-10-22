import { describe, expect, it } from "vitest";

import { createMockLanguageModel } from "../test-utils";

import {
  type ContextRelevancyParams,
  type ContextRelevancyPayload,
  createContextRelevancyScorer,
} from "./context-relevancy";

const BASE_CONTEXT = {
  payload: {
    input: "What is penicillin?",
    context: "Alexander Fleming discovered penicillin in 1928 while researching bacteria.",
  } satisfies ContextRelevancyPayload,
  params: {} as ContextRelevancyParams,
};

describe("createContextRelevancyScorer", () => {
  it("evaluates relevance levels and calculates weighted score", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "Alexander Fleming discovered penicillin",
                    relevanceLevel: "high",
                    reasoning: "Directly mentions penicillin",
                  },
                  {
                    contextPart: "in 1928",
                    relevanceLevel: "medium",
                    reasoning: "Provides historical context",
                  },
                  {
                    contextPart: "while researching bacteria",
                    relevanceLevel: "low",
                    reasoning: "Background information",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("returns perfect score when all context is highly relevant", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "Penicillin is an antibiotic",
                    relevanceLevel: "high",
                    reasoning: "Directly answers the question",
                  },
                  {
                    contextPart: "It was discovered by Fleming",
                    relevanceLevel: "high",
                    reasoning: "Important context about penicillin",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // All high relevance should give high score
    expect(result.score).toBeGreaterThan(0.8);
  });

  it("returns low score when context is mostly irrelevant", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "The weather was sunny",
                    relevanceLevel: "none",
                    reasoning: "Unrelated to penicillin",
                  },
                  {
                    contextPart: "People enjoyed their lunch",
                    relevanceLevel: "none",
                    reasoning: "Completely irrelevant",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeLessThan(0.3);
  });

  it("returns 0 when no context parts are provided", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBe(0);
  });

  it("applies custom relevance weights", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "Context 1",
                    relevanceLevel: "medium",
                    reasoning: "Somewhat relevant",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: {
        relevanceWeights: {
          high: 1.0,
          medium: 0.5,
          low: 0.2,
          none: 0.0,
        },
      },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // With medium weight of 0.5, score should reflect that
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0.7);
  });

  it("handles array context", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "Context from array part 1",
                    relevanceLevel: "high",
                    reasoning: "Relevant",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
    });

    const result = await scorer.scorer({
      ...BASE_CONTEXT,
      payload: {
        ...BASE_CONTEXT.payload,
        context: ["Array item 1", "Array item 2"],
      },
    });

    expect(result.status).toBe("success");
    expect(result.score).toBeGreaterThan(0);
  });

  it("filters context parts by minimumRelevance threshold", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "High relevance part",
                    relevanceLevel: "high",
                    reasoning: "Directly answers question",
                  },
                  {
                    contextPart: "Medium relevance part",
                    relevanceLevel: "medium",
                    reasoning: "Somewhat related",
                  },
                  {
                    contextPart: "Low relevance part",
                    relevanceLevel: "low",
                    reasoning: "Barely related",
                  },
                  {
                    contextPart: "No relevance part",
                    relevanceLevel: "none",
                    reasoning: "Not related",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { minimumRelevance: "medium" },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // With minimumRelevance "medium": high and medium count as relevant
    // Coverage ratio = 2/4 = 0.5
    // Weighted score includes all parts but coverage only counts medium+
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it("uses minimumRelevance 'high' to be strict", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "High relevance",
                    relevanceLevel: "high",
                    reasoning: "Perfect match",
                  },
                  {
                    contextPart: "Medium relevance",
                    relevanceLevel: "medium",
                    reasoning: "Partial match",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { minimumRelevance: "high" },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Only "high" counts as relevant
    // Coverage ratio = 1/2 = 0.5
    expect(result.score).toBeGreaterThan(0);
  });

  it("uses default minimumRelevance of 'low' when not specified", async () => {
    const scorer = createContextRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                evaluations: [
                  {
                    contextPart: "Low relevance",
                    relevanceLevel: "low",
                    reasoning: "Minimal connection",
                  },
                  {
                    contextPart: "No relevance",
                    relevanceLevel: "none",
                    reasoning: "Unrelated",
                  },
                ],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      // minimumRelevance not specified, should use default "low"
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Default "low": low and above count as relevant
    // Coverage ratio = 1/2 = 0.5
    expect(result.score).toBeGreaterThan(0);
  });
});
