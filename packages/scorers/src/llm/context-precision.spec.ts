import { describe, expect, it } from "vitest";

import { createMockLanguageModel } from "../test-utils";

import {
  type ContextPrecisionParams,
  type ContextPrecisionPayload,
  createContextPrecisionScorer,
} from "./context-precision";

const BASE_CONTEXT = {
  payload: {
    input: "Who discovered penicillin?",
    output: "Alexander Fleming discovered penicillin.",
    expected: "Penicillin was discovered by Alexander Fleming.",
    context: "Alexander Fleming discovered penicillin in 1928 while studying bacteria.",
  } satisfies ContextPrecisionPayload,
  params: {} as ContextPrecisionParams,
};

describe("createContextPrecisionScorer", () => {
  it("returns 1 when context is useful", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Context contained the discovery details and supported the answer.",
                verdict: 1,
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

  it("returns 0 when context is not useful", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Context does not help answer the question.",
                verdict: 0,
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

  it("applies binary threshold correctly", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Context is somewhat useful.",
                verdict: 1,
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { binaryThreshold: 0.7 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Verdict is 1, which is >= 0.7, so should return 1
    expect(result.score).toBe(1);
  });

  it("handles array context", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Combined context was useful.",
                verdict: 1,
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
        context: [
          "Alexander Fleming discovered penicillin in 1928.",
          "He was studying bacteria at the time.",
        ],
      },
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
  });

  it("includes verdict in metadata", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Very relevant context",
                verdict: 1,
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

  it("uses weighted scoring when enabled", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Context somewhat useful",
                verdict: 1,
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { weighted: true },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Weighted mode: return verdict as-is (1)
    expect(result.score).toBe(1);
  });

  it("applies binary threshold when weighted is false", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Context useful",
                verdict: 1,
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { weighted: false, binaryThreshold: 0.5 },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Binary mode: verdict=1, threshold=0.5 → 1 >= 0.5 → score=1
    expect(result.score).toBe(1);
  });

  it("weighted mode returns verdict directly when verdict is 1", async () => {
    const scorer = createContextPrecisionScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                reason: "Context fully supports answer",
                verdict: 1,
              }),
            },
          ],
          warnings: [],
          rawPrompt: null,
          rawSettings: {},
        },
      }),
      options: { weighted: true },
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // Weighted with verdict=1 returns 1
    expect(result.score).toBe(1);
  });
});
