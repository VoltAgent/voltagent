import { describe, expect, it } from "vitest";

import type {
  ExperimentConfig,
  ExperimentDatasetInfo,
  ExperimentItemResult,
  ExperimentRunnerReturn,
  ExperimentSummary,
} from "../experiment/types.js";
import { FakeVoltOpsClient } from "../test-utils/fake-voltops-client.js";
import { VoltOpsRunManager } from "./run.js";

const baseDataset: ExperimentDatasetInfo = {
  id: "dataset-1",
  versionId: "dataset-version-1",
  name: "sample-dataset",
};

const baseConfig: ExperimentConfig = {
  id: "exp-1",
  runner: (() => ({ output: "ok" })) as () => ExperimentRunnerReturn<unknown>,
  scorers: [],
};

const baseItemResult: ExperimentItemResult = {
  item: {
    id: "item-1",
    input: "question",
    expected: "answer",
    datasetId: baseDataset.id,
    datasetVersionId: baseDataset.versionId,
    datasetName: baseDataset.name,
  },
  itemId: "item-1",
  index: 0,
  status: "passed",
  runner: {
    output: "answer",
    metadata: null,
    traceIds: undefined,
    startedAt: Date.now(),
    completedAt: Date.now(),
    durationMs: 12,
  },
  scores: {},
  thresholdPassed: true,
  durationMs: 12,
  datasetId: baseDataset.id,
  datasetVersionId: baseDataset.versionId,
  datasetName: baseDataset.name,
};

const baseSummary: ExperimentSummary = {
  totalCount: 1,
  completedCount: 1,
  successCount: 1,
  failureCount: 0,
  errorCount: 0,
  skippedCount: 0,
  meanScore: 1,
  passRate: 1,
  startedAt: Date.now(),
  completedAt: Date.now(),
  durationMs: 10,
  scorers: {},
  criteria: [],
};

describe("VoltOpsRunManager", () => {
  it("creates a run on demand and appends results", async () => {
    const client = new FakeVoltOpsClient();
    const manager = new VoltOpsRunManager({ client, config: baseConfig, dataset: baseDataset });

    await manager.appendResult({ item: baseItemResult });

    expect(manager.runId).toBe("run-1");
    expect(client.createCalls).toHaveLength(1);
    expect(client.appendCalls).toHaveLength(1);
    const append = client.appendCalls[0];
    expect(append.runId).toBe("run-1");
    expect(append.payload.results).toHaveLength(1);
    const result = append.payload.results[0];
    expect(result.datasetVersionId).toBe(baseDataset.versionId);
    expect(result.thresholdPassed).toBe(true);
  });

  it("completes the run with failed status when failures exist", async () => {
    const client = new FakeVoltOpsClient();
    const manager = new VoltOpsRunManager({ client, config: baseConfig, dataset: baseDataset });
    await manager.prepare();

    const failedSummary: ExperimentSummary = {
      ...baseSummary,
      failureCount: 1,
      criteria: [{ criteria: { type: "meanScore", min: 0.9 }, passed: false }],
    };

    await manager.complete({ summary: failedSummary });

    expect(client.completeCalls).toHaveLength(1);
    const completeCall = client.completeCalls[0];
    expect(completeCall.runId).toBe("run-1");
    expect(completeCall.payload.status).toBe("failed");
    expect(completeCall.payload.summary?.metadata?.criteria).toEqual(failedSummary.criteria);
  });

  it("records a failure when run execution errors", async () => {
    const client = new FakeVoltOpsClient();
    const manager = new VoltOpsRunManager({ client, config: baseConfig, dataset: baseDataset });
    await manager.prepare();

    await manager.fail(new Error("boom"));

    expect(client.failCalls).toHaveLength(1);
    const failCall = client.failCalls[0];
    expect(failCall.payload.error.message).toBe("boom");
  });

  it("skips run creation when dataset version is missing", async () => {
    const client = new FakeVoltOpsClient();
    const manager = new VoltOpsRunManager({
      client,
      config: baseConfig,
      dataset: { id: "dataset-2", name: "no-version" },
    });

    await manager.prepare();
    expect(client.createCalls).toHaveLength(0);
    expect(manager.runId).toBeUndefined();
  });
});
