import { describe, expect, it } from "vitest";

import {
  type AnswerRelevancyParams,
  type AnswerRelevancyPayload,
  type GeneratedQuestion,
  type QuestionSimilarityEntry,
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
  it("averages similarity scores when all questions are committal", async () => {
    const questions: GeneratedQuestion[] = [
      { question: "Who discovered penicillin?", noncommittal: false },
      { question: "When was penicillin discovered?", noncommittal: false },
      {
        question: "What was Alexander Fleming studying when he found penicillin?",
        noncommittal: false,
      },
    ];

    const similarities: QuestionSimilarityEntry[] = [
      { question: questions[0].question, score: 0.9, rawScore: 0.85, usage: 10 },
      { question: questions[1].question, score: 0.7, rawScore: 0.65, usage: 12 },
      { question: questions[2].question, score: 0.8, rawScore: 0.75, usage: 11 },
    ];

    const scorer = createAnswerRelevancyScorer({
      model: {} as any,
      embeddingModel: {} as any,
      strictness: questions.length,
      questionGenerator: async (_context, iteration) => questions[iteration],
      similarityCalculator: async ({ index }) => similarities[index],
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo((0.9 + 0.7 + 0.8) / 3, 5);
    expect(result.metadata).toMatchObject({
      questions,
      similarity: similarities,
      strictness: questions.length,
      noncommittal: false,
    });
  });

  it("returns zero when any generated question is noncommittal", async () => {
    const questions: GeneratedQuestion[] = [
      { question: "What was discovered?", noncommittal: true },
      { question: "Who discovered it?", noncommittal: false },
    ];

    const scorer = createAnswerRelevancyScorer({
      model: {} as any,
      embeddingModel: {} as any,
      strictness: questions.length,
      questionGenerator: async (_context, iteration) => questions[iteration],
      similarityCalculator: async () => ({
        question: "irrelevant",
        score: 0.9,
        rawScore: 0.9,
        usage: 5,
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({
      questions,
      noncommittal: true,
    });
  });

  it("uses params.strictness to override option strictness", async () => {
    let callCount = 0;
    const scorer = createAnswerRelevancyScorer({
      model: {} as any,
      embeddingModel: {} as any,
      strictness: 1,
      questionGenerator: async () => {
        callCount += 1;
        return { question: "Q", noncommittal: false } satisfies GeneratedQuestion;
      },
      similarityCalculator: async () => ({ question: "Q", score: 1, rawScore: 1, usage: 1 }),
    });

    const result = await scorer.scorer({
      ...BASE_CONTEXT,
      params: { strictness: 2 },
    });

    expect(result.status).toBe("success");
    expect(callCount).toBe(2);
    expect(result.metadata).toMatchObject({ strictness: 2 });
  });
});
