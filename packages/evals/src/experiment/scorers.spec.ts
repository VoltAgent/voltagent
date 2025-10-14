import { describe, expect, it, vi } from "vitest";

import type { LocalScorerDefinition } from "@voltagent/scorers";
import { resolveExperimentScorers } from "./scorers.js";
import type { ExperimentDatasetItem, ExperimentRuntimePayload } from "./types.js";

function createRuntimePayload(): ExperimentRuntimePayload<ExperimentDatasetItem> {
  return {
    input: "question",
    expected: "answer",
    output: "response",
    item: {
      id: "item-1",
      input: "question",
    },
    datasetId: "dataset-1",
    datasetVersionId: "dataset-version-1",
    datasetName: "demo-dataset",
  };
}

describe("resolveExperimentScorers", () => {
  it("adapts payload and params when buildPayload/buildParams are provided", async () => {
    const scorerSpy = vi.fn(async () => ({
      status: "success" as const,
      score: 1,
    }));

    const baseDefinition: LocalScorerDefinition<{ text: string }, { expected: string }> = {
      id: "custom",
      name: "Custom",
      params: async (payload) => ({
        fromDefinition: payload.text,
      }),
      scorer: async ({ payload, params }) => {
        scorerSpy({ payload, params });
        return {
          status: "success" as const,
          score: 1,
        };
      },
    };

    const bundles = resolveExperimentScorers([
      {
        scorer: baseDefinition,
        buildPayload: async (runtime) => ({
          text: String(runtime.input),
        }),
        buildParams: async (runtime) => ({
          expected: String(runtime.expected),
        }),
        params: (runtime) => ({
          fromConfig: runtime.item.id,
        }),
      },
    ]);

    expect(bundles).toHaveLength(1);

    const runtimePayload = createRuntimePayload();
    await bundles[0].definition.scorer({
      payload: runtimePayload,
      params: { base: "value" },
    });

    expect(scorerSpy).toHaveBeenCalledTimes(1);
    const [[call]] = scorerSpy.mock.calls as Array<
      [{ payload: Record<string, unknown>; params: Record<string, unknown> }]
    >;
    const { payload, params } = call;

    expect(payload).toMatchObject({
      text: "question",
      input: "question",
      expected: "answer",
      output: "response",
      item: runtimePayload.item,
    });

    expect(params).toMatchObject({
      base: "value",
      expected: "answer",
      fromConfig: "item-1",
      fromDefinition: "question",
    });
  });

  it("supports direct LocalScorerDefinition entries without additional configuration", async () => {
    const scorerSpy = vi.fn(async () => ({
      status: "success" as const,
      score: 0.5,
    }));

    const directDefinition: LocalScorerDefinition<
      ExperimentRuntimePayload<ExperimentDatasetItem>,
      Record<string, unknown>
    > = {
      id: "direct",
      name: "Direct",
      scorer: async (context) => {
        scorerSpy(context);
        return {
          status: "success" as const,
          score: 0.5,
        };
      },
    };

    const bundles = resolveExperimentScorers([directDefinition]);
    expect(bundles).toHaveLength(1);

    const runtimePayload = createRuntimePayload();
    await bundles[0].definition.scorer({
      payload: runtimePayload,
      params: {},
    });

    expect(scorerSpy).toHaveBeenCalledTimes(1);
    const [[call]] = scorerSpy.mock.calls as Array<[{ payload: Record<string, unknown> }]>;
    const { payload } = call;

    expect(payload).toMatchObject({
      input: "question",
      expected: "answer",
      output: "response",
      item: runtimePayload.item,
    });
  });

  it("merges static params when provided", async () => {
    const scorerSpy = vi.fn(async () => ({
      status: "success" as const,
      score: 1,
    }));

    const definition: LocalScorerDefinition<Record<string, unknown>, { threshold: number }> = {
      id: "static",
      name: "Static Params",
      scorer: async ({ params }) => {
        scorerSpy(params);
        return {
          status: "success" as const,
          score: 1,
        };
      },
    };

    const bundles = resolveExperimentScorers([
      {
        scorer: definition,
        params: { threshold: 42 },
      },
    ]);

    const runtimePayload = createRuntimePayload();
    await bundles[0].definition.scorer({
      payload: runtimePayload,
      params: {},
    });

    expect(scorerSpy).toHaveBeenCalledTimes(1);
    const [[params]] = scorerSpy.mock.calls as Array<[Record<string, unknown>]>;
    expect(params).toMatchObject({ threshold: 42 });
  });
});
