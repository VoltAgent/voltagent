<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent Engineering Platform
</h3>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a>
</div>
</div>

<br/>

<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@voltagent/evals.svg)](https://www.npmjs.com/package/@voltagent/evals)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/evals.svg)](https://www.npmjs.com/package/@voltagent/evals)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/evals

Experiment orchestration utilities for VoltAgent. Define a dataset, a runner, and a set of scorers with `createExperiment`, then execute them with `runExperiment` to get aggregated pass/fail and score summaries — locally, in CI, or against a VoltOps-managed dataset.

---

## Install

```bash
npm install @voltagent/evals @voltagent/scorers @voltagent/sdk
# or
yarn add @voltagent/evals @voltagent/scorers @voltagent/sdk
# or
pnpm add @voltagent/evals @voltagent/scorers @voltagent/sdk
```

## Usage

Define an experiment with `createExperiment`:

```typescript
import { Agent } from "@voltagent/core";
import { createExperiment } from "@voltagent/evals";

const supportAgent = new Agent({
  name: "support-agent",
  instructions: "You are a helpful assistant that answers questions concisely and accurately.",
  model: "openai/gpt-4o-mini",
});

export const experiment = createExperiment({
  id: "offline-smoke",
  label: "Offline Regression Smoke Test",
  description: "Demonstrates createExperiment + runExperiment without VoltOps connectivity.",
  dataset: {
    name: "support-qa",
    items: [
      { input: "How do I reset my password?", expected: "Use the reset link on the login page." },
    ],
    // To use a VoltOps-managed dataset instead, create one at https://console.voltagent.dev/evals/datasets
  },
  runner: async ({ item }) => {
    const result = await supportAgent.generateText(item.input);
    return { output: result.text };
  },
  scorers: [], // see "Scorers" below
  passCriteria: {
    type: "meanScore",
    min: 0.5,
  },
});
```

Then run it with `runExperiment`:

```typescript
import { runExperiment } from "@voltagent/evals";
import { experiment } from "./experiment";

const result = await runExperiment(experiment, {
  onProgress: ({ completed, total }) => {
    console.log(`Processed ${completed}/${total ?? "?"} items`);
  },
});

console.log({
  success: result.summary.successCount,
  failures: result.summary.failureCount,
  errors: result.summary.errorCount,
  meanScore: result.summary.meanScore,
  passRate: result.summary.passRate,
});
```

### `RunExperimentOptions`

| Option          | Type                                                                      | Description                                                            |
| --------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `concurrency`   | `number`                                                                  | Maximum number of dataset items to process in parallel                 |
| `signal`        | `AbortSignal`                                                             | Abort the experiment run                                               |
| `voltOpsClient` | client instance                                                           | Used to resolve VoltOps-managed datasets and report results to VoltOps |
| `onItem`        | `(event) => void \| Promise<void>`                                        | Called after each dataset item finishes, with its result and score     |
| `onProgress`    | `(event: { completed: number; total?: number }) => void \| Promise<void>` | Called after each dataset item finishes, with overall progress         |

## Scorers

Pass scorer definitions from [`@voltagent/scorers`](https://github.com/VoltAgent/voltagent/tree/main/packages/scorers) (or your own custom scorers) via `scorers` on `createExperiment`. Each scorer receives the runner's input/output and returns a score that feeds into the experiment summary and `passCriteria`.

## VoltOps Integration

If a `voltOpsClient` is provided (either via `runExperiment` options or `config.voltOps.client`), datasets can be loaded from and experiment runs reported to your [VoltOps](https://console.voltagent.dev) project.

## Example

See [`examples/with-offline-evals`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-offline-evals) for a complete, runnable experiment with a local dataset and scorers.

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Evals Overview](https://voltagent.dev/docs/evals/overview/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
