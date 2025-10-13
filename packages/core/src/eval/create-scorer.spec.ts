import { describe, expect, it } from "vitest";

import { type ScorerPipelineContext, createScorer, weightedBlend } from "./create-scorer";

interface TestPayload {
  input: string;
  output: string;
}

describe("createScorer", () => {
  it("executes pipeline steps and returns score", async () => {
    const scorer = createScorer<TestPayload, { keyword: string }>({
      id: "keyword",
      preprocess: ({ payload }) => payload.output.toLowerCase(),
      analyze: ({ results, params }) => results.preprocess?.includes(params.keyword.toLowerCase()),
      generateScore: ({ results }) => (results.analyze ? 1 : 0),
      generateReason: ({ results }) => (results.analyze ? "Keyword present." : "Keyword missing."),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent is great" },
      params: { keyword: "VoltAgent" },
    });

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ reason: "Keyword present." });
  });

  it("merges metadata returned from score and reason", async () => {
    const scorer = createScorer<TestPayload, { threshold: number }>({
      id: "threshold",
      metadata: { base: true },
      generateScore: ({ params }) => ({
        score: 0.4,
        metadata: { threshold: params.threshold },
      }),
      generateReason: () => ({
        reason: "Below threshold",
        metadata: { severity: "warn" },
      }),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "" },
      params: { threshold: 0.5 },
    });

    expect(result.metadata).toMatchObject({
      base: true,
      threshold: 0.5,
      severity: "warn",
      reason: "Below threshold",
    });
  });

  it("returns error metadata when a step throws with metadata", async () => {
    class MetadataError extends Error {
      metadata?: Record<string, unknown>;
      constructor(message: string) {
        super(message);
        this.metadata = { details: "step failed" };
      }
    }

    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "failing",
      analyze: () => {
        throw new MetadataError("failure");
      },
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "" },
      params: {},
    });

    expect(result.status).toBe("error");
    expect(result.error).toBeInstanceOf(MetadataError);
    expect(result.metadata).toMatchObject({ details: "step failed" });
  });

  it("supports async pipeline steps", async () => {
    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "async",
      preprocess: async ({ payload }) => payload.output,
      analyze: async ({ results }) => results.preprocess,
      generateScore: async ({ results }) => (results.analyze ? 0.9 : 0.1),
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "test" },
      params: {},
    });

    expect(result.score).toBeCloseTo(0.9);
  });

  it("blends component scores using weights", async () => {
    const scorer = createScorer<TestPayload, Record<string, never>>({
      id: "blend",
      generateScore: weightedBlend(
        [
          {
            id: "model",
            weight: 0.7,
            step: ({ payload }) => ({
              score: payload.output.includes("Volt") ? 0.9 : 0.1,
              metadata: { label: "model" },
            }),
          },
          {
            id: "embedding",
            weight: 0.3,
            step: () => ({ score: 0.5, metadata: { label: "embedding" } }),
          },
        ],
        { metadataKey: "components" },
      ),
      generateReason: ({ results }) => {
        const modelResult = results.model as { score?: number } | undefined;
        return `Model:${modelResult?.score ?? "-"}`;
      },
    });

    const result = await scorer.scorer({
      payload: { input: "", output: "VoltAgent" },
      params: {},
    });

    expect(result.score).toBeCloseTo(0.78);
    expect(result.metadata).toMatchObject({
      components: {
        components: expect.any(Array),
        totalWeight: expect.any(Number),
      },
    });
  });
});
