import { runLocalScorers } from "@voltagent/scorers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createExperiment } from "./create-experiment.js";
import { runExperiment } from "./run-experiment.js";

vi.mock("@voltagent/scorers", async (original) => ({
  ...(await original<typeof import("@voltagent/scorers")>()),
  runLocalScorers: vi.fn(),
}));
afterEach(() => {
  vi.resetAllMocks();
});
describe("scoring failure presence", () => {
  it.each([undefined, null, false, 0, ""])(
    "preserves a thrown falsy scoring value %s",
    async (failure) => {
      vi.mocked(runLocalScorers).mockRejectedValueOnce(failure);
      const result = await runExperiment(
        createExperiment({
          id: "falsy-scoring-failure",
          dataset: { items: [{ id: "a", input: "x" }] },
          runner: () => "captured",
          scorers: [
            { id: "score", name: "score", scorer: () => ({ status: "success", score: 1 }) },
          ],
        }),
      );
      expect(result.items[0].status).toBe("error");
      expect(result.summary.errorCount).toBe(1);
      expect(result.items[0].runner.output).toBe("captured");
    },
  );
});

describe("per-score error selection", () => {
  it("selects the first score whose status is error even when its error value is undefined", async () => {
    vi.mocked(runLocalScorers).mockResolvedValueOnce({
      results: [
        { id: "first", name: "first", status: "error", score: null, error: undefined },
        { id: "second", name: "second", status: "error", score: null, error: "later failure" },
      ],
    } as never);
    const result = await runExperiment(
      createExperiment({
        id: "score-error-selection",
        dataset: { items: [{ id: "a", input: "x" }] },
        runner: () => "captured",
        scorers: [
          { id: "first", name: "first", scorer: () => ({ status: "success", score: 1 }) },
          { id: "second", name: "second", scorer: () => ({ status: "success", score: 1 }) },
        ],
      }),
    );
    expect(result.items[0].status).toBe("error");
    expect(result.items[0].error).toBeUndefined();
  });
});
