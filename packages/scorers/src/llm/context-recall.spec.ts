import { describe, expect, it } from "vitest";

import {
  type ContextRecallEntry,
  type ContextRecallParams,
  type ContextRecallPayload,
  createContextRecallScorer,
} from "./context-recall";

const BASE_CONTEXT = {
  payload: {
    input: "Who discovered penicillin?",
    expected: "Alexander Fleming discovered penicillin.",
    context: "Alexander Fleming discovered penicillin in 1928 while researching bacteria.",
  } satisfies ContextRecallPayload,
  params: {} as ContextRecallParams,
};

describe("createContextRecallScorer", () => {
  it("averages attributed values", async () => {
    const scorer = createContextRecallScorer({
      model: {} as any,
      evaluateWith: async () => [
        {
          statement: "statement-1",
          attributed: 1,
          reason: "reason-1",
        } satisfies ContextRecallEntry,
        { statement: "statement-2", attributed: 0, reason: "reason-2" },
        { statement: "statement-3", attributed: 1, reason: "reason-3" },
      ],
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.status).toBe("success");
    expect(result.score).toBeCloseTo(2 / 3, 5);
    expect(result.metadata).toMatchObject({
      statements: [
        { statement: "statement-1", attributed: 1 },
        { statement: "statement-2", attributed: 0 },
        { statement: "statement-3", attributed: 1 },
      ],
    });
  });

  it("handles empty classification", async () => {
    const scorer = createContextRecallScorer({
      model: {} as any,
      evaluateWith: async () => [],
    });

    const result = await scorer.scorer(BASE_CONTEXT);

    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ statements: [] });
  });
});
