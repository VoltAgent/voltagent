import { describe, expect, it } from "vitest";

import { FakeVoltOpsClient } from "../test-utils/fake-voltops-client.js";
import { createExperiment } from "./create-experiment.js";
import { runExperiment } from "./run-experiment.js";
import type { ExperimentDatasetItem } from "./types.js";

const DATASET_ID = "dataset-integration";
const DATASET_VERSION_ID = "dataset-version-integration";
const DATASET_ITEM_1_ID = "11111111-1111-4111-8111-111111111111";
const DATASET_ITEM_2_ID = "22222222-2222-4222-8222-222222222222";
const DATASET_ITEM_3_ID = "33333333-3333-4333-8333-333333333333";

function createDatasetItems(): ExperimentDatasetItem[] {
  return [
    {
      id: DATASET_ITEM_1_ID,
      label: "first",
      input: "hello",
      expected: "world",
    },
    {
      id: DATASET_ITEM_2_ID,
      label: "second",
      input: "foo",
      expected: "bar",
    },
  ];
}

describe("runExperiment integration", () => {
  it("streams results and completes VoltOps run", async () => {
    const experiment = createExperiment({
      id: "run-integration",
      dataset: {
        id: DATASET_ID,
        versionId: DATASET_VERSION_ID,
        name: "integration-dataset",
        items: createDatasetItems(),
      },
      runner: async ({ item }) => ({
        output: `response:${item.input}`,
      }),
    });

    const client = new FakeVoltOpsClient();

    const result = await runExperiment(experiment, {
      voltOpsClient: client,
    });

    expect(result.items).toHaveLength(2);
    expect(result.summary.successCount).toBe(2);
    expect(result.runId).toBe("run-1");

    expect(client.createCalls).toHaveLength(1);
    expect(client.createCalls[0].datasetVersionId).toBe(DATASET_VERSION_ID);

    expect(client.appendCalls).toHaveLength(2);
    const appendedIds = client.appendCalls.map((call) => call.payload.results[0]?.datasetItemId);
    expect(appendedIds).toEqual([DATASET_ITEM_1_ID, DATASET_ITEM_2_ID]);

    expect(client.completeCalls).toHaveLength(1);
    expect(client.completeCalls[0].payload.status).toBe("succeeded");
  });

  it("marks VoltOps run as failed when pass criteria are not met", async () => {
    const experiment = createExperiment({
      id: "run-integration-failure",
      dataset: {
        id: DATASET_ID,
        versionId: DATASET_VERSION_ID,
        name: "integration-dataset",
        items: createDatasetItems(),
      },
      passCriteria: {
        type: "meanScore",
        min: 0.5,
      },
      runner: async () => ({
        output: "noop",
      }),
    });

    const client = new FakeVoltOpsClient();

    const result = await runExperiment(experiment, {
      voltOpsClient: client,
    });

    expect(result.summary.failureCount).toBe(0);
    expect(result.summary.criteria[0]?.passed).toBe(false);
    expect(client.completeCalls).toHaveLength(1);
    expect(client.completeCalls[0].payload.status).toBe("failed");
  });

  it("evaluates pass criteria using explicit scorer IDs", async () => {
    const experiment = createExperiment({
      id: "run-pass-criteria-scorer-id",
      dataset: {
        id: DATASET_ID,
        versionId: DATASET_VERSION_ID,
        name: "integration-dataset",
        items: createDatasetItems(),
      },
      runner: async ({ item }) => ({
        output: item.expected,
      }),
      scorers: [
        {
          id: "hede",
          name: "explicit-id",
          scorer: {
            id: "original-id",
            name: "original-name",
            scorer: () => ({
              status: "success",
              score: 1,
            }),
          },
        },
      ],
      passCriteria: [
        {
          type: "passRate",
          min: 1,
          scorerId: "hede",
        },
      ],
    });

    const result = await runExperiment(experiment);

    expect(result.summary.criteria[0]).toEqual(
      expect.objectContaining({
        passed: true,
        actual: 1,
        criteria: expect.objectContaining({
          scorerId: "hede",
        }),
      }),
    );
    expect(result.summary.scorers.hede?.passRate).toBe(1);
    expect(result.summary.scorers).not.toHaveProperty("original-id");
  });

  it("keeps sampled-out items out of the pass rate", async () => {
    const experiment = createExperiment({
      id: "run-sampled-out",
      dataset: {
        items: [
          { id: DATASET_ITEM_1_ID, input: "scored", expected: "scored" },
          { id: DATASET_ITEM_2_ID, input: "sampled-out", expected: "sampled-out" },
          { id: DATASET_ITEM_3_ID, input: "boom", expected: "boom" },
        ],
      },
      runner: async ({ item }) => ({ output: item.input }),
      scorers: [
        {
          id: "sampled",
          threshold: 0.5,
          scorer: {
            id: "sampled",
            name: "sampled",
            // One item is skipped, exactly as scorer sampling skips it, one
            // scores below the threshold and one errors.
            scorer: ({ payload }) => {
              if (payload.input === "sampled-out") {
                return { status: "skipped" };
              }
              if (payload.input === "boom") {
                return { status: "error", error: new Error("scorer failed") };
              }
              return { status: "success", score: 0 };
            },
          },
        },
      ],
    });

    const result = await runExperiment(experiment);

    // Nothing passed: one item scored below its threshold and one errored, so
    // the pass rate is 0 of the 2 evaluated items. Before this fix the
    // sampled-out item counted as a success and reported passRate 0.33.
    expect(result.summary.passRate).toBe(0);
    expect(result.summary.skippedCount).toBe(1);
    expect(result.summary.errorCount).toBe(1);
  });

  it("reports a null pass rate when every item is sampled out", async () => {
    const experiment = createExperiment({
      id: "run-fully-sampled-out",
      dataset: {
        items: [{ id: DATASET_ITEM_1_ID, input: "hello", expected: "hello" }],
      },
      runner: async ({ item }) => ({ output: item.input }),
      scorers: [
        {
          id: "sampled",
          threshold: 0.5,
          scorer: {
            id: "sampled",
            name: "sampled",
            sampling: { type: "never" },
            scorer: () => ({ status: "success", score: 1 }),
          },
        },
      ],
      passCriteria: [
        { type: "passRate", min: 1 },
        { type: "passRate", min: 1, scorerId: "sampled" },
      ],
    });

    const result = await runExperiment(experiment);

    // Both spellings of the same criterion must agree: with no evaluated
    // evidence there is no pass rate to meet, so neither can pass.
    expect(result.summary.passRate).toBeNull();
    expect(result.summary.criteria.map((entry) => entry.passed)).toEqual([false, false]);
  });
});
