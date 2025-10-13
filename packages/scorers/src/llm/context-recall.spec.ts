import { describe, expect, it } from "vitest";

import { createMockLanguageModel } from "../test-utils";

import {
  type ContextRecallParams,
  type ContextRecallPayload,
  createContextRecallScorer,
} from "./context-recall";

const BASE_CONTEXT = {
  payload: {
    input: "Who discovered penicillin?",
    expected: "Alexander Fleming discovered penicillin in 1928.",
    context: "Alexander Fleming discovered penicillin in 1928 while researching bacteria.",
  } satisfies ContextRecallPayload,
  params: {} as ContextRecallParams,
};

describe("createContextRecallScorer", () => {
  it("extracts statements and calculates attribution ratio", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            // First call: extract statements
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: [
                      "Alexander Fleming discovered penicillin",
                      "The discovery was in 1928",
                    ],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 2) {
            // Second call: verify first statement
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    verdict: 1,
                    reasoning: "Context clearly states Alexander Fleming discovered penicillin.",
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          // Third call: verify second statement
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  verdict: 1,
                  reasoning: "Context mentions 1928 as the discovery year.",
                }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBe(1); // Both statements attributed
    expect(callCount).toBe(3); // 1 extract + 2 verify calls
  });

  it("returns partial score when some statements are not attributed", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: ["Statement 1", "Statement 2", "Statement 3"],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 2) {
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                { type: "text", text: JSON.stringify({ verdict: 1, reasoning: "Supported" }) },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 3) {
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                { type: "text", text: JSON.stringify({ verdict: 0, reasoning: "Not supported" }) },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              { type: "text", text: JSON.stringify({ verdict: 1, reasoning: "Supported" }) },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 0 }, // Disable penalty for simple math test
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // 2 out of 3 statements attributed (simple math, no penalty)
    expect(result.score).toBeCloseTo(2 / 3, 4);
  });

  it("returns 0 when no statements are extracted", async () => {
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: {
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                statements: [],
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

  it("returns 0 when no statements are attributed", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: ["Wrong statement 1", "Wrong statement 2"],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({ verdict: 0, reasoning: "Not supported by context" }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBe(0);
  });

  it("handles array context", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: ["Statement from context"],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({ verdict: 1, reasoning: "Found in context" }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
    });

    const result = await scorer.scorer({
      ...BASE_CONTEXT,
      payload: {
        ...BASE_CONTEXT.payload,
        context: ["Context part 1", "Context part 2"],
      },
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
  });

  it("applies strictness penalty when score below threshold", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            // Extract 3 statements
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: ["Statement 1", "Statement 2", "Statement 3"],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 2) {
            // Statement 1: supported
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                { type: "text", text: JSON.stringify({ verdict: 1, reasoning: "Supported" }) },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 3) {
            // Statement 2: not supported
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                { type: "text", text: JSON.stringify({ verdict: 0, reasoning: "Not supported" }) },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          // Statement 3: supported
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              { type: "text", text: JSON.stringify({ verdict: 1, reasoning: "Supported" }) },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 0.7 }, // Default strictness
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // 2/3 = 0.6666... < 0.7 → penalty applied
    // adjustedScore = 0.6666 * (0.6666 / 0.7) = 0.6349...
    expect(result.score).toBeCloseTo(0.6349, 4);
  });

  it("does not apply penalty when score above strictness threshold", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            // Extract 3 statements
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: ["Statement 1", "Statement 2", "Statement 3"],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 2) {
            // Statement 1: supported
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                { type: "text", text: JSON.stringify({ verdict: 1, reasoning: "Supported" }) },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 3) {
            // Statement 2: not supported
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                { type: "text", text: JSON.stringify({ verdict: 0, reasoning: "Not supported" }) },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          // Statement 3: supported
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              { type: "text", text: JSON.stringify({ verdict: 1, reasoning: "Supported" }) },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 0.5 }, // Lower strictness
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // 2/3 = 0.6666... > 0.5 → no penalty
    expect(result.score).toBeCloseTo(2 / 3, 4);
  });

  it("gives partial credit when enabled", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            // Extract 2 statements
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: ["Statement 1", "Statement 2"],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          if (callCount === 2) {
            // Statement 1: fully supported
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ verdict: 1, reasoning: "Fully supported" }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          // Statement 2: partially supported
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              {
                type: "text",
                text: JSON.stringify({ verdict: 0, reasoning: "Partial support from context" }),
              },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { partialCredit: true, strictness: 0 }, // Enable partial credit, disable penalty
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // 1 full + 0.5 partial = 1.5 / 2 = 0.75
    expect(result.score).toBeCloseTo(0.75, 4);
  });

  it("strictness at boundary (0.5) disables penalty", async () => {
    let callCount = 0;
    const scorer = createContextRecallScorer({
      model: createMockLanguageModel({
        doGenerate: async () => {
          callCount++;
          if (callCount === 1) {
            // Extract 3 statements
            return {
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    statements: ["Statement 1", "Statement 2", "Statement 3"],
                  }),
                },
              ],
              warnings: [],
              rawPrompt: null,
              rawSettings: {},
            };
          }
          // All supported
          return {
            finishReason: "stop",
            usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
            content: [
              { type: "text", text: JSON.stringify({ verdict: 1, reasoning: "Supported" }) },
            ],
            warnings: [],
            rawPrompt: null,
            rawSettings: {},
          };
        },
      }),
      options: { strictness: 0.5 }, // Boundary: penalty disabled when strictness <= 0.5
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    // strictness = 0.5, not > 0.5, so penalty logic is skipped
    expect(result.score).toBe(1);
  });
});
