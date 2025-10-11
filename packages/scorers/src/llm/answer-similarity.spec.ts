import { describe, expect, it } from "vitest";

import {
  type AnswerSimilarityMetadata,
  type AnswerSimilarityParams,
  type AnswerSimilarityPayload,
  createAnswerSimilarityScorer,
} from "./answer-similarity";

const BASE_CONTEXT = {
  payload: {
    output: "Alexander Fleming discovered penicillin.",
    expected: "Penicillin was discovered by Alexander Fleming.",
  } satisfies AnswerSimilarityPayload,
  params: {} as AnswerSimilarityParams,
};

describe("createAnswerSimilarityScorer", () => {
  it("returns similarity score via override", async () => {
    const scorer = createAnswerSimilarityScorer({
      embeddingModel: {} as any,
      similarityWith: async () =>
        ({ score: 0.8, rawScore: 0.75, usage: 12 }) satisfies AnswerSimilarityMetadata,
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(0.8);
    expect(result.metadata).toMatchObject({
      similarity: {
        score: 0.8,
        rawScore: 0.75,
        usage: 12,
      },
    });
  });

  it("uses params to override embedding configuration", async () => {
    let capturedExpectedMin: number | undefined;
    let capturedPrefix: string | undefined;

    const scorer = createAnswerSimilarityScorer({
      embeddingModel: {} as any,
      similarityWith: async (context) => {
        capturedExpectedMin =
          typeof context.params.embeddingExpectedMin === "number"
            ? context.params.embeddingExpectedMin
            : undefined;
        capturedPrefix =
          typeof context.params.embeddingPrefix === "string"
            ? context.params.embeddingPrefix
            : undefined;
        return { score: 0.9, rawScore: 0.85, usage: 5 } satisfies AnswerSimilarityMetadata;
      },
    });

    const result = await scorer.scorer({
      ...BASE_CONTEXT,
      params: {
        embeddingExpectedMin: 0.6,
        embeddingPrefix: "Q: ",
      },
    });

    expect(result.score).toBeCloseTo(0.9);
    expect(capturedExpectedMin).toBe(0.6);
    expect(capturedPrefix).toBe("Q: ");
  });
});
