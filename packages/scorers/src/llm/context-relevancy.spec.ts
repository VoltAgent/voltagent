import { describe, expect, it } from "vitest";

import {
  type ContextRelevancyEntry,
  type ContextRelevancyParams,
  type ContextRelevancyPayload,
  createContextRelevancyScorer,
} from "./context-relevancy";

const BASE_CONTEXT = {
  payload: {
    input: "Describe penicillin" as unknown,
    context:
      "Alexander Fleming discovered penicillin in 1928 while researching bacteria." as unknown,
  } satisfies ContextRelevancyPayload,
  params: {} as ContextRelevancyParams,
};

describe("createContextRelevancyScorer", () => {
  it("computes coverage ratio", async () => {
    const scorer = createContextRelevancyScorer({
      model: {} as any,
      evaluateWith: async () => [
        {
          sentence: "Alexander Fleming discovered penicillin in 1928.",
          reasons: ["mentions discovery"],
        } satisfies ContextRelevancyEntry,
        { sentence: "He was researching bacteria.", reasons: ["matches context"] },
      ],
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeGreaterThan(0);
    expect(result.metadata).toMatchObject({
      sentences: expect.arrayContaining([
        expect.objectContaining({ sentence: expect.stringContaining("penicillin") }),
      ]),
      coverageRatio: result.score,
    });
  });

  it("returns zero when there are no sentences", async () => {
    const scorer = createContextRelevancyScorer({
      model: {} as any,
      evaluateWith: async () => [],
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ sentences: [], coverageRatio: 0 });
  });
});
