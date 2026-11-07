import { describe, expect, it } from "vitest";
import { createExperiment } from "../experiment/create-experiment.js";
import { runExperiment } from "../experiment/run-experiment.js";
import { createMemoryTapeStore, createRecordingRunner, createReplayRunner } from "./index.js";

const manifest = {
  version: 1 as const,
  tapeId: "example",
  runnerRevision: "runner-v1",
  datasetRevision: "dataset-v1",
};
describe("native experiment runner tapes", () => {
  it("replays native outputs with new scorers without invoking the target again", async () => {
    const store = createMemoryTapeStore(manifest);
    let calls = 0;
    const recorded = createRecordingRunner({
      store,
      manifest,
      runner: async ({ item }) => {
        calls++;
        return { output: { answer: item.input }, metadata: { fixture: true } };
      },
    });
    const dataset = {
      items: [
        { id: "a", input: "hello" },
        { id: "b", input: "world" },
      ],
    };
    const first = await runExperiment(
      createExperiment({ id: "record", dataset, runner: recorded.runner }),
    );
    await recorded.whenIdle();
    expect(calls).toBe(2);
    expect(first.summary.successCount).toBe(2);
    const replay = createReplayRunner({ store, manifest });
    const second = await runExperiment(
      createExperiment({
        id: "replay",
        dataset,
        runner: replay,
        scorers: [
          {
            id: "new-scorer",
            name: "new-scorer",
            scorer: () => ({ status: "success", score: 0.75 }),
          },
        ],
      }),
    );
    expect(calls).toBe(2);
    expect(second.summary.successCount).toBe(2);
    expect(second.items[0].runner.output).toEqual(first.items[0].runner.output);
  });
  it("never falls back to a target for an unrecorded item", async () => {
    const store = createMemoryTapeStore(manifest);
    const replay = createReplayRunner({ store, manifest });
    await expect(replay({ item: { id: "missing", input: "x" }, index: 0 })).rejects.toThrow(
      /record/i,
    );
  });
});
