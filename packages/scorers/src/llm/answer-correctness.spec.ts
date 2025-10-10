import { describe, expect, it } from "vitest";

import {
  type AnswerCorrectnessParams,
  type AnswerCorrectnessPayload,
  createAnswerCorrectnessScorer,
} from "./answer-correctness";

const BASE_CONTEXT = {
  payload: {
    input: "question",
    output: "answer",
    expected: "reference",
  } satisfies AnswerCorrectnessPayload,
  params: {} as AnswerCorrectnessParams,
};

function createClassificationResult(tp: number, fp: number, fn: number) {
  const tpArr = Array.from({ length: tp }, (_, idx) => `tp-${idx}`);
  const fpArr = Array.from({ length: fp }, (_, idx) => `fp-${idx}`);
  const fnArr = Array.from({ length: fn }, (_, idx) => `fn-${idx}`);
  const denominator = tp + 0.5 * (fp + fn);
  const f1Score = denominator === 0 ? 0 : tp / denominator;
  return {
    TP: tpArr,
    FP: fpArr,
    FN: fnArr,
    f1Score,
  };
}

describe("createAnswerCorrectnessScorer", () => {
  it("calculates blended score with default weights", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: {} as any,
      embeddingModel: {} as any,
      classifyWith: async () => createClassificationResult(2, 1, 1),
      similarityWith: async () => ({ score: 0.9, rawScore: 0.8, usage: 42 }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeGreaterThan(0);
    expect(result.metadata).toMatchObject({
      factuality: {
        truePositive: ["tp-0", "tp-1"],
        falsePositive: ["fp-0"],
        falseNegative: ["fn-0"],
      },
      similarity: {
        score: 0.9,
        rawScore: 0.8,
        usage: 42,
      },
    });
  });

  it("respects custom weights and skips similarity when weight is zero", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: {} as any,
      embeddingModel: {} as any,
      classifyWith: async () => createClassificationResult(3, 0, 0),
    });

    const result = await scorer.scorer({
      ...BASE_CONTEXT,
      params: {
        factualityWeight: 1,
        answerSimilarityWeight: 0,
      },
    });

    expect(result.status).toBe("success");
    expect(result.metadata?.similarity).toBeNull();
    expect(result.score).toBeCloseTo(1);
  });

  it("signals error when both weights are zero", async () => {
    const scorer = createAnswerCorrectnessScorer({
      model: {} as any,
      embeddingModel: {} as any,
      classifyWith: async () => createClassificationResult(1, 0, 0),
    });

    const result = await scorer.scorer({
      ...BASE_CONTEXT,
      params: { factualityWeight: 0, answerSimilarityWeight: 0 },
    });

    expect(result.status).toBe("error");
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(/At least one/);
  });
});
