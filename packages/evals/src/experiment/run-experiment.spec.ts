import { setImmediate } from "node:timers/promises";
import { describe, expect, it } from "vitest";

import { FakeVoltOpsClient } from "../test-utils/fake-voltops-client.js";
import { createExperiment } from "./create-experiment.js";
import { runExperiment } from "./run-experiment.js";
import type { ExperimentDatasetItem } from "./types.js";

const DATASET_ID = "dataset-integration";
const DATASET_VERSION_ID = "dataset-version-integration";
const DATASET_ITEM_1_ID = "11111111-1111-4111-8111-111111111111";
const DATASET_ITEM_2_ID = "22222222-2222-4222-8222-222222222222";

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
});

describe("runExperiment callback failures", () => {
  for (const callbackName of ["onItem", "onProgress"] as const) {
    for (const asynchronous of [false, true]) {
      it.each([1, 3])(
        `propagates ${asynchronous ? "async" : "sync"} ${callbackName} failures at concurrency %i`,
        async (concurrency) => {
          const error = new Error(`${callbackName} failed`);
          const client = new FakeVoltOpsClient();
          const experiment = createExperiment({
            id: "callback-failure",
            dataset: { items: createDatasetItems().slice(0, 1) },
            runner: async () => ({ output: "response" }),
          });
          const callback = asynchronous
            ? async () => {
                throw error;
              }
            : () => {
                throw error;
              };

          await expect(
            runExperiment(experiment, {
              concurrency,
              voltOpsClient: client,
              [callbackName]: callback,
            }),
          ).rejects.toBe(error);
          await setImmediate();

          expect(client.failCalls).toHaveLength(1);
          expect(client.completeCalls).toHaveLength(0);
        },
      );
    }

    it(`retains ${callbackName} failures while awaiting the next dataset item`, async () => {
      const error = new Error(`${callbackName} failed`);
      const client = new FakeVoltOpsClient();
      const experiment = createExperiment({
        id: "streamed-callback-failure",
        dataset: {
          items: (async function* () {
            yield createDatasetItems()[0];
            await setImmediate();
          })(),
        },
        runner: async () => ({ output: "response" }),
      });

      await expect(
        runExperiment(experiment, {
          concurrency: 3,
          voltOpsClient: client,
          [callbackName]: async () => {
            throw error;
          },
        }),
      ).rejects.toBe(error);
      await setImmediate();

      expect(client.failCalls).toHaveLength(1);
      expect(client.completeCalls).toHaveLength(0);
    });
  }
});
