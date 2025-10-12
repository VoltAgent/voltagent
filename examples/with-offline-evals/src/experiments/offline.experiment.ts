import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  dataset: {
    name: "basic-eval-inline",
  },
  id: "offline-smoke",
  label: "Offline Regression Smoke Test",
  description: "Demonstrates createExperiment + runExperiment without VoltOps connectivity.",
  runner: async ({ item }) => {
    const output = item.input.prompt.trim();
    return {
      output: "item.expected",
      metadata: {
        echo: output,
      },
    };
  },
  scorers: [
    {
      scorer: scorers.levenshtein,
      threshold: 1,
    },
    scorers.exactMatch,
  ],
  passCriteria: {
    type: "meanScore",
    min: 0.5,
  },
});
