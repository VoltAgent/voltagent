---
title: Overview
sidebar_position: 1
---

VoltAgent Evaluations give you a consistent way to measure how well your agents perform across offline test sets, nightly regressions, and CI gates. The same experiment definition can run locally, in automation, or from a dashboard, while VoltOps captures detailed telemetry and scoring breakdowns.

This page explains the big picture: what makes up an evaluation, how runs flow from your code to VoltOps, and where to look next when you’re ready to dive in.

## Why run evaluations?

- **Catch regressions before they ship.** Re-run the same dataset whenever a prompt or model changes and spot drops in accuracy or quality.
- **Standardise measurement.** A single experiment can mix multiple scorers (exact match, semantic similarity, moderation, LLM judges, …) and compute pass thresholds automatically.
- **Close the loop with VoltOps.** Every offline run shows up alongside your live traffic, with the same tags, filters, and search you already use to debug agents.
- **Scriptable & repeatable.** Experiments are plain TypeScript modules, so you can version them, share them, and run them in any Node.js environment.

## Core building blocks

| Concept                                        | Responsibility                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Experiment definition** (`createExperiment`) | Describes the run: dataset source, how to invoke your agent/runner, which scorers to apply, and any pass criteria.                              |
| **Runner**                                     | A function that receives one dataset item and returns the agent output (plus optional metadata / traces).                                       |
| **Dataset**                                    | The evaluation inputs. Can be inline JSON, generated on the fly, or pulled from VoltOps.                                                        |
| **Scorers**                                    | Re-usable scoring functions (exact match, embeddings, LLM graders, moderation, etc.) that produce scores, thresholds, and metadata.             |
| **Aggregator**                                 | Computes summary stats (mean score, pass rate, threshold compliance) and overall pass/fail.                                                     |
| **VoltOps integration**                        | Optional client that automatically creates a run, streams item results, and finalises the summary so you can inspect everything in the Console. |

## How it fits with the rest of VoltAgent

- **Agents & workflows.** Experiments call into your agent code (e.g. the same functions your API or workflow uses). It’s your runner’s responsibility to invoke the agent with the right inputs.
- **VoltOps telemetry.** Runs appear alongside live traces. You get the same search, tagging, and drill-down experience for offline and online evaluation.
- **Scorer registry.** `@voltagent/scorers` ships ready-made graders (string similarity, number comparison, LLM judges). You can also write custom scorers or wrap external services.
- **Datasets.** Reuse the same dataset whether you run from CLI, CI, or VoltOps’s UI. The framework supports inline, generated, and VoltOps-hosted sources.

## Offline Evaluations

Offline evaluations run against a fixed dataset, return deterministic scores, and are ideal for regression testing, CI gates, and comparing branches.

### End-to-End Flow

1. **Define the experiment.** Import `createExperiment`, choose a dataset, and set up your runner.

   ```ts
   // experiments/support-nightly.experiment.ts
   import { createExperiment } from "@voltagent/evals";

   export default createExperiment({
     id: "support-nightly",
     dataset: { name: "support-nightly" },
     runner: async ({ item }) => ({ output: item.input }),
   });
   ```

2. **Resolve the dataset.** Inline arrays run as-is; named datasets pull from VoltOps or a registry.

   ```ts
   dataset: {
     items: [
       { id: "greeting", input: "hello", expected: "hello" },
       { id: "farewell", input: "goodbye", expected: "goodbye" },
     ],
   };

   // or
   dataset: { name: "support-nightly" };
   ```

3. **Execute the runner.** Call your agent and collect outputs/metadata.

   ```ts
   runner: async ({ item }) => {
     const reply = await supportAgent.generateText(item.input);
     return { output: reply.text, metadata: { tokens: reply.usage?.total_tokens } };
   };
   ```

4. **Score the result.** Combine scorers with thresholds or LLM judges.

   ```ts
   import { scorers } from "@voltagent/scorers";

   scorers: [scorers.exactMatch, scorers.embeddingSimilarity({ expectedMin: 0.8 })];
   ```

5. **Aggregate and apply pass criteria.**

   ```ts
   passCriteria: { type: "passRate", min: 0.95 };
   ```

### Running offline evals

You can execute the experiment either from the CLI or directly in Node.js:

```bash title="CLI"
npm run volt eval run \
  -- --experiment ./src/experiments/support-nightly.experiment.ts \
  --concurrency 4
```

```ts title="Node script"
import { VoltOpsRestClient } from "@voltagent/sdk";
import { runExperiment } from "@voltagent/evals";
import experiment from "./experiments/support-nightly.experiment";

const voltOpsClient = new VoltOpsRestClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const result = await runExperiment(experiment, {
  voltOpsClient,
  concurrency: 4,
  onProgress: ({ completed, total }) => console.log(`Processed ${completed}/${total ?? "?"}`),
});
```

The CLI handles TypeScript bundling and VoltOps linking for you. The programmatic form is handy for CI jobs or custom telemetry pipelines.

```ts title="experiments/offline-smoke.experiment.ts"
import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";
import { supportAgent } from "../agents/support";

export default createExperiment({
  id: "offline-smoke",
  dataset: { name: "support-nightly" },
  experiment: { name: "support-nightly-regression" },
  runner: async ({ item }) => {
    const reply = await supportAgent.generateText(item.input);
    return { output: reply.text };
  },
  scorers: [scorers.exactMatch],
  passCriteria: { type: "meanScore", min: 0.9 },
});
```

The experiment can be executed the same way as shown above (CLI or Node script). The CLI resolves TypeScript, streams progress, and, when VoltOps credentials are present, links the run to the named experiment. The Node API variant mirrors the same flow and returns the run summary object for further assertions.

## Live Evaluations

Live evaluations attach scorers to real-time agent interactions. They are suited for production monitoring, moderation, and sampling conversational quality under actual traffic.

```ts title="Attach live scorers when defining an agent"
import VoltAgent, { Agent, VoltAgentObservability } from "@voltagent/core";
import { createModerationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";
import honoServer from "@voltagent/server-hono";

const observability = new VoltAgentObservability();
const moderationModel = openai("gpt-4o-mini");

const supportAgent = new Agent({
  name: "live-scorer-demo",
  instructions: "Answer questions about VoltAgent.",
  model: openai("gpt-4o-mini"),
  eval: {
    triggerSource: "production",
    environment: "demo",
    sampling: { type: "ratio", rate: 1 },
    scorers: {
      moderation: {
        scorer: createModerationScorer({ model: moderationModel, threshold: 0.5 }),
      },
    },
  },
});

new VoltAgent({
  agents: { support: supportAgent },
  observability,
  server: honoServer(),
});
```

Use cases:

- Sample live traffic, enforce moderation, or feed LLM judges without waiting for batch runs.
- Combine with offline evals for deterministic regression checks before deploy.

## What’s next?

- Quick-start walkthrough: `docs/evals/quick-start` (upcoming).
- Experiment definition reference: `docs/evals/concepts/experiment-definition` (upcoming).
- Scorer catalog and authoring guide: `docs/evals/concepts/scorers` (upcoming).
- CLI usage notes: `docs/evals/reference/cli` (upcoming).
