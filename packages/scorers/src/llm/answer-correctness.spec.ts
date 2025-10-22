import { describe, expect, it } from "vitest";

import { createMockLanguageModel } from "../test-utils";
import {
  type AnswerCorrectnessParams,
  type AnswerCorrectnessPayload,
  createAnswerCorrectnessScorer,
} from "./answer-correctness";

const BASE_CONTEXT = {
  payload: {
    input: "What is 2+2?",
    output: "2+2 equals 4. It is a basic arithmetic operation.",
    expected: "2+2 equals 4.",
  } satisfies AnswerCorrectnessPayload,
  params: {} as AnswerCorrectnessParams,
};

describe("createAnswerCorrectnessScorer", () => {
  it("calculates F1 score from classification", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: ["2+2 equals 4"],
                FP: ["It is a basic arithmetic operation"],
                FN: [],
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

  it("returns 0 for completely incorrect answer", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: [],
                FP: ["Wrong statement 1", "Wrong statement 2"],
                FN: ["Correct statement 1"],
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

  it("returns perfect score when TP only, no FP or FN", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: ["Statement 1", "Statement 2"],
                FP: [],
                FN: [],
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
    expect(result.score).toBe(1);
  });

  it("correctly calculates F1 score with known TP/FP/FN values", async () => {
    // F1 = 2 * (precision * recall) / (precision + recall)
    // precision = TP / (TP + FP) = 2 / (2 + 1) = 0.666...
    // recall = TP / (TP + FN) = 2 / (2 + 1) = 0.666...
    // F1 = 2 * (0.666... * 0.666...) / (0.666... + 0.666...) = 0.666...
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: ["True 1", "True 2"],
                FP: ["False positive"],
                FN: ["False negative"],
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
    expect(result.score).toBeCloseTo(0.6667, 3);
  });

  it("handles empty classification gracefully", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: [],
                FP: [],
                FN: [],
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

  it("applies factualityWeight to F1 score", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: ["Statement 1", "Statement 2"],
                FP: ["False positive"],
                FN: [],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { factualityWeight: 0.5 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // F1 = 2*2/(2+2+1) = 0.8
    // With weight 0.5: 0.8 * 0.5 = 0.4
    expect(result.score).toBeCloseTo(0.4, 4);
  });

  it("factualityWeight greater than 1 amplifies score", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: ["Statement 1"],
                FP: ["False positive"],
                FN: [],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { factualityWeight: 1.5 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // F1 = 2*1/(1+1+1) = 0.6666...
    // With weight 1.5: 0.6666 * 1.5 = 1.0
    expect(result.score).toBeCloseTo(1.0, 4);
  });

  it("uses default factualityWeight of 1.0 when not specified", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                TP: ["Statement 1", "Statement 2"],
                FP: [],
                FN: [],
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      // No options specified, should use default weight 1.0
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // F1 = 1.0, weight = 1.0 → score = 1.0
    expect(result.score).toBe(1.0);
  });
});
