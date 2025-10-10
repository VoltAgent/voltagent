import {
  type SamplingPolicy,
  buildSamplingMetadata,
  normalizeScorerResult,
  runLocalScorers,
  shouldSample,
} from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";

describe("runLocalScorers", () => {
  it("executes scorers and merges metadata", async () => {
    const scorer = vi.fn(async ({ params }: { params: { input: string } }) => ({
      status: "success",
      score: 0.8,
      metadata: { echoed: params.input },
    }));

    const result = await runLocalScorers({
      payload: { input: "What is VoltAgent?", output: "A framework" },
      baseArgs: (payload) => ({
        input: payload.input,
        output: payload.output,
      }),
      scorers: [
        {
          id: "correctness",
          name: "Answer Correctness",
          scorer,
          metadata: { threshold: 0.7 },
        },
      ],
    });

    expect(scorer).toHaveBeenCalledTimes(1);
    expect(result.summary).toEqual({ successCount: 1, errorCount: 0, skippedCount: 0 });
    expect(result.results[0]).toMatchObject({
      id: "correctness",
      name: "Answer Correctness",
      status: "success",
      score: 0.8,
      metadata: { echoed: "What is VoltAgent?", threshold: 0.7 },
    });
  });

  it("respects sampling policies", async () => {
    const scorer = vi.fn();

    const result = await runLocalScorers({
      payload: {},
      scorers: [
        {
          id: "moderation",
          name: "Moderation",
          scorer,
          sampling: { type: "never" },
        },
      ],
    });

    expect(scorer).not.toHaveBeenCalled();
    expect(result.results[0]).toMatchObject({ status: "skipped", score: null, durationMs: 0 });
  });

  it("captures scorer errors", async () => {
    const error = new Error("LLM timeout");

    const result = await runLocalScorers({
      payload: { input: "Explain" },
      baseArgs: { input: "Explain" },
      scorers: [
        {
          id: "failing",
          name: "Failing",
          scorer: () => {
            throw error;
          },
        },
      ],
    });

    expect(result.summary).toEqual({ successCount: 0, errorCount: 1, skippedCount: 0 });
    expect(result.results[0]).toMatchObject({ status: "error", error });
  });
});

describe("utility helpers", () => {
  it("shouldSample respects ratio bounds", () => {
    const policy: SamplingPolicy = { type: "ratio", rate: 0.5 };
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.4);
    expect(shouldSample(policy)).toBe(true);
    spy.mockReturnValue(0.9);
    expect(shouldSample(policy)).toBe(false);
    spy.mockRestore();
  });

  it("buildSamplingMetadata maps policies", () => {
    expect(buildSamplingMetadata({ type: "always" })).toEqual({ strategy: "always" });
    expect(buildSamplingMetadata({ type: "never" })).toEqual({ strategy: "never" });
    expect(buildSamplingMetadata({ type: "ratio", rate: 0.2 })).toEqual({
      strategy: "ratio",
      rate: 0.2,
    });
  });

  it("normalizeScorerResult handles primitive scores", () => {
    expect(normalizeScorerResult(0.6)).toEqual({ score: 0.6, metadata: null });
  });
});
