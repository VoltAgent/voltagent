import { describe, expect, it } from "vitest";

import { FakeVoltOpsClient } from "../test-utils/fake-voltops-client.js";
import { createExperiment } from "./create-experiment.js";
import { runExperiment } from "./run-experiment.js";
import type { ExperimentDatasetItem } from "./types.js";

const DATASET_ID = "dataset-integration";
const DATASET_VERSION_ID = "dataset-version-integration";

function createDatasetItems(): ExperimentDatasetItem[] {
  return [
    {
      id: "item-1",
      label: "first",
      input: "hello",
      expected: "world",
    },
    {
      id: "item-2",
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
    expect(appendedIds).toEqual(["item-1", "item-2"]);

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
});
