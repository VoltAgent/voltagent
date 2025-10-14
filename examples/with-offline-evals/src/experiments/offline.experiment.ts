import { openai } from "@ai-sdk/openai";
import { Agent } from "@voltagent/core";
import { createExperiment } from "@voltagent/evals";

import { SUPPORT_DATASET_NAME, type SupportDatasetItem, supportDatasetItems } from "./dataset.js";
import { createSupportExperimentScorers } from "./scorers.js";

const supportAgent = new Agent({
  name: "offline-evals-support",
  instructions:
    "You are a helpful assistant that answers questions about VoltAgent concisely and accurately.",
  model: openai("gpt-4o-mini"),
});

const judgeModel = openai("gpt-4o-mini");
const moderationModel = openai("gpt-4o-mini");

const experimentScorers = createSupportExperimentScorers({
  judgeModel,
  moderationModel,
});

export default createExperiment({
  dataset: {
    name: SUPPORT_DATASET_NAME,
    items: supportDatasetItems,
    // If you prefer managed datasets you can create one in VoltOps: https://console.voltagent.dev/evals/datasets
  },
  id: "offline-smoke",
  label: "Offline Regression Smoke Test",
  description: "Demonstrates createExperiment + runExperiment without VoltOps connectivity.",
  runner: async ({ item }: { item: SupportDatasetItem }) => {
    const result = await supportAgent.generateText(item.input);
    return {
      output: result.text,
    };
  },
  scorers: experimentScorers,
  passCriteria: {
    type: "meanScore",
    min: 0.5,
  },
});
