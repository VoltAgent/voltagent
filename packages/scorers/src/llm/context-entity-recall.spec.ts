import { describe, expect, it } from "vitest";

import {
  type ContextEntityRecallMetadata,
  type ContextEntityRecallParams,
  type ContextEntityRecallPayload,
  createContextEntityRecallScorer,
} from "./context-entity-recall";

const BASE_CONTEXT = {
  payload: {
    expected: "Alexander Fleming discovered penicillin in 1928.",
    context: "Penicillin was discovered in 1928 by Alexander Fleming at St. Mary's Hospital.",
  } satisfies ContextEntityRecallPayload,
  params: {} as ContextEntityRecallParams,
};

describe("createContextEntityRecallScorer", () => {
  it("computes recall based on entity overlap", async () => {
    const scorer = createContextEntityRecallScorer({
      model: {} as any,
      extractEntities: async (text) =>
        text.includes("St. Mary's Hospital")
          ? ["Alexander Fleming", "1928", "St. Mary's Hospital"]
          : ["Alexander Fleming", "1928"],
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(1); // all expected entities were found in context
    const metadata = result.metadata as ContextEntityRecallMetadata;
    expect(metadata.expectedEntities).toEqual(["Alexander Fleming", "1928"]);
    expect(metadata.contextEntities).toEqual(["Alexander Fleming", "1928", "St. Mary's Hospital"]);
  });

  it("returns zero when no expected entities are present", async () => {
    const scorer = createContextEntityRecallScorer({
      model: {} as any,
      extractEntities: async () => [],
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.score).toBe(0);
    const metadata = result.metadata as ContextEntityRecallMetadata;
    expect(metadata.expectedEntities).toEqual([]);
    expect(metadata.contextEntities).toEqual([]);
  });
});
