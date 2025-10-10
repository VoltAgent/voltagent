import { describe, expect, it } from "vitest";

import {
  type ContextPrecisionMetadata,
  type ContextPrecisionParams,
  type ContextPrecisionPayload,
  createContextPrecisionScorer,
} from "./context-precision";

const BASE_CONTEXT = {
  payload: {
    input: "Who discovered penicillin?",
    expected: "Penicillin was discovered by Alexander Fleming.",
    context: "Alexander Fleming discovered penicillin in 1928 while studying bacteria.",
  } satisfies ContextPrecisionPayload,
  params: {} as ContextPrecisionParams,
};

describe("createContextPrecisionScorer", () => {
  it("returns score from override", async () => {
    const scorer = createContextPrecisionScorer({
      model: {} as any,
      evaluateWith: async () =>
        ({
          reason: "Context contained the discovery details.",
          verdict: 1,
        }) satisfies ContextPrecisionMetadata,
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({
      reason: "Context contained the discovery details.",
      verdict: 1,
    });
  });

  it("clamps invalid verdict values", async () => {
    const scorer = createContextPrecisionScorer({
      model: {} as any,
      evaluateWith: async () => ({
        reason: "Reason",
        verdict: 5,
      }),
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ verdict: 1 });
  });
});
