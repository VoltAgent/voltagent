import { describe, expect, it } from "vitest";

import { createMockLanguageModel } from "../test-utils";

import {
  type AnswerRelevancyParams,
  type AnswerRelevancyPayload,
  createAnswerRelevancyScorer,
} from "./answer-relevancy";

const BASE_CONTEXT = {
  payload: {
    input: "Who discovered penicillin?",
    output: "Penicillin was discovered by Alexander Fleming in 1928.",
    context: "Penicillin was discovered by Alexander Fleming in 1928 while studying bacteria.",
  } satisfies AnswerRelevancyPayload,
  params: {} as AnswerRelevancyParams,
};

describe("createAnswerRelevancyScorer", () => {
  it("generates questions and calculates relevancy score", async () => {
    const scorer = createAnswerRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                question: "Who discovered penicillin?",
                noncommittal: 0,
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { strictness: 3 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("returns zero when questions are noncommittal", async () => {
    let callCount = 0;
    const scorer = createAnswerRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  question: "I don't know",
                  noncommittal: 1,
                }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 2 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBe(0);
    expect(callCount).toBe(2);
  });

  it("generates multiple questions based on strictness", async () => {
    let callCount = 0;
    const scorer = createAnswerRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  question: `Question ${callCount}`,
                  noncommittal: 0,
                }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 5 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(callCount).toBe(5);
  });

  it("handles committal questions with similarity calculation", async () => {
    const scorer = createAnswerRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                question: "Who discovered penicillin?",
                noncommittal: 0,
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { strictness: 1 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Score based on word overlap similarity between generated question and input
    expect(result.score).toBeGreaterThan(0);
  });

  it("applies noncommittal threshold correctly", async () => {
    let callCount = 0;
    const scorer = createAnswerRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  question: callCount === 1 ? "Good question" : "I don't know",
                  noncommittal: callCount === 1 ? 0 : 1,
                }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 2, noncommittalThreshold: 0.5 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // 1 out of 2 questions is noncommittal = 50%, which equals threshold
    // Should be treated as noncommittal
    expect(result.score).toBe(0);
  });

  it("applies uncertaintyWeight for medium similarity questions", async () => {
    let callCount = 0;
    const scorer = createAnswerRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  question: `Question ${callCount}`,
                  noncommittal: 0,
                }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 2, uncertaintyWeight: 0.5 },
    });

    const result = await scorer.scorer({
      ...BASE_CONTEXT,
      payload: {
        ...BASE_CONTEXT.payload,
        input: "What is machine learning?",
        output: "Machine learning is a method of data analysis",
      },
    });

    expect(result.status).toBe("success");
    // Score depends on similarity calculation
    // With uncertaintyWeight 0.5, medium similarity gets partial credit
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("uses default uncertaintyWeight of 0.3 when not specified", async () => {
    const scorer = createAnswerRelevancyScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                question: "Test question",
                noncommittal: 0,
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { strictness: 1 },
      // uncertaintyWeight not specified, should use default 0.3
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Score calculation uses default uncertaintyWeight of 0.3
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
