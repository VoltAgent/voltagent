---
title: Offline Evaluations
sidebar_position: 2
---

# Offline Evaluations

Offline evaluations run against a fixed dataset and produce deterministic results. Use them for regression testing, CI gates, and comparing model or prompt changes before deployment.

This guide walks you through building an evaluation experiment step-by-step, from a basic setup to advanced configurations.

## Where offline runs show up

When you run an experiment with a `voltOpsClient`, each execution is stored as an Eval Run in VoltOps. You can inspect items, scores, pass criteria, and summaries in the Console. Threshold failures also participate in annotation automation for human review. If you omit `voltOpsClient`, the run executes locally and results stay in memory/STDOUT only.

## Step 1: Create a Basic Experiment

Start with the simplest possible experiment using `createExperiment`. You need three things: an `id`, a `dataset` with inline items, and a `runner` function.

```ts
import { createExperiment } from "@voltagent/evals";
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

export default createExperiment({
  id: "offline-smoke",
  dataset: {
    items: [
      {
        id: "1",
        input: "The color of the sky",
        expected: "blue",
      },
      {
        id: "2",
        input: "2+2",
        expected: "4",
      },
    ],
  },
  runner: async ({ item }) => {
    const supportAgent = new Agent({
      name: "offline-evals-support",
      instructions: "You are a helpful assistant. Answer questions very short.",
      model: openai("gpt-4o-mini"),
    });
    const result = await supportAgent.generateText(item.input);
    return {
      output: result.text,
    };
  },
});
```

The `runner` function receives each dataset item and returns an output. The runner can return the output directly or wrap it in an object with additional metadata.

At this point, your experiment runs but doesn't evaluate anything. Let's add scoring.

## Step 2: Add a Scorer

Add a scorer to evaluate the runner's output against the expected value. Start with a basic heuristic scorer like `levenshtein`, which measures string similarity.

```ts
import { createExperiment } from "@voltagent/evals";
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  id: "offline-smoke",
  dataset: {
    items: [
      {
        id: "1",
        input: "The color of the sky",
        expected: "blue",
      },
      {
        id: "2",
        input: "2+2",
        expected: "4",
      },
    ],
  },
  runner: async ({ item }) => {
    const supportAgent = new Agent({
      name: "offline-evals-support",
      instructions: "You are a helpful assistant. Answer questions very short.",
      model: openai("gpt-4o-mini"),
    });
    const result = await supportAgent.generateText(item.input);
    return {
      output: result.text,
    };
  },
  scorers: [scorers.levenshtein],
});
```

By default, scorers have a **threshold of 0**, meaning every item passes regardless of the score. The scorer produces a numeric score (0.0 to 1.0), but without a threshold, it doesn't affect pass/fail status.

## Step 3: Set a Threshold

Make the scorer meaningful by adding a `threshold`. Items fail if their score falls below this value.

```ts
import { createExperiment } from "@voltagent/evals";
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  id: "offline-smoke",
  dataset: {
    items: [
      {
        id: "1",
        input: "The color of the sky",
        expected: "blue",
      },
      {
        id: "2",
        input: "2+2",
        expected: "4",
      },
    ],
  },
  runner: async ({ item }) => {
    const supportAgent = new Agent({
      name: "offline-evals-support",
      instructions: "You are a helpful assistant. Answer questions very short.",
      model: openai("gpt-4o-mini"),
    });
    const result = await supportAgent.generateText(item.input);
    return {
      output: result.text,
    };
  },
  scorers: [
    {
      scorer: scorers.levenshtein,
      threshold: 0.5,
    },
  ],
});
```

Now, if the levenshtein score is below 0.5, the item is marked as `failed`. You can also assign a custom `id` to reference this scorer in pass criteria:

```ts
scorers: [
  {
    id: "my-custom-scorer-id",
    scorer: scorers.levenshtein,
    threshold: 0.5,
  },
],
```

## Step 4: Add Pass Criteria

While individual scorers determine if each item passes or fails, **pass criteria** define whether the **entire experiment** succeeds. Use `passCriteria` to set overall success conditions.

There are two types of criteria:

- **`meanScore`**: Average score across all items must meet a minimum
- **`passRate`**: Percentage of passed items must meet a minimum

```ts
import { createExperiment } from "@voltagent/evals";
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  id: "offline-smoke",
  dataset: {
    items: [
      {
        id: "1",
        input: "The color of the sky",
        expected: "blue",
      },
      {
        id: "2",
        input: "2+2",
        expected: "4",
      },
    ],
  },
  runner: async ({ item }) => {
    const supportAgent = new Agent({
      name: "offline-evals-support",
      instructions: "You are a helpful assistant. Answer questions very short.",
      model: openai("gpt-4o-mini"),
    });
    const result = await supportAgent.generateText(item.input);
    return {
      output: result.text,
    };
  },
  scorers: [
    {
      id: "my-custom-scorer-id",
      scorer: scorers.levenshtein,
      threshold: 0.5,
    },
  ],
  passCriteria: [
    {
      type: "passRate",
      min: 1.0, // All items must pass
      scorerId: "my-custom-scorer-id", // Only consider this scorer
    },
    {
      type: "meanScore",
      min: 0.5, // Average score must be at least 0.5
    },
  ],
});
```

Pass criteria are evaluated **after all items complete**. If any criterion fails, the experiment result shows which criteria were not met. You can also set `severity: "warn"` on criteria that shouldn't fail the run but should be reported.

## Step 5: Run Your Experiment

There are two ways to execute experiments: programmatically via the API or through the VoltAgent CLI.

### Option 1: Run with the API

Use `runExperiment` to execute your experiment programmatically:

```ts
import { runExperiment } from "@voltagent/evals";
import experiment from "./experiments/offline.experiment";

const result = await runExperiment(experiment, {
  onProgress: ({ completed, total }) => {
    const label = total !== undefined ? `${completed}/${total}` : `${completed}`;
    console.log(`[with-offline-evals] processed ${label} items`);
  },
});

console.log("Summary:", {
  success: result.summary.successCount,
  failures: result.summary.failureCount,
  errors: result.summary.errorCount,
  meanScore: result.summary.meanScore,
  passRate: result.summary.passRate,
});
```

**API Options:**

- `concurrency` - Number of items processed in parallel (default: 1)
- `signal` - AbortSignal to cancel the run
- `voltOpsClient` - VoltOps SDK instance for telemetry and cloud datasets
- `onProgress` - Callback invoked after each item with `{ completed, total? }`
- `onItem` - Callback invoked after each item with `{ index, item, result, summary }`

Example with all options:

```ts
import { VoltOpsRestClient } from "@voltagent/sdk";

const result = await runExperiment(experiment, {
  concurrency: 4,
  signal: abortController.signal,
  voltOpsClient: new VoltOpsRestClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
  }),
  onProgress: ({ completed, total }) => {
    console.log(`Processed ${completed}/${total ?? "?"} items`);
  },
  onItem: ({ index, result }) => {
    console.log(`Item ${index}: ${result.status}`);
  },
});
```

### Option 2: Run with the CLI

The VoltAgent CLI provides a convenient way to run experiments from the command line:

```bash
pnpm volt eval run --experiment ./src/experiments/offline.experiment.ts
```

**CLI Options:**

- `--experiment <path>` (required) - Path to the experiment module
- `--concurrency <count>` - Maximum concurrent items (default: 1)
- `--dataset <name>` - Dataset name override applied at runtime
- `--experiment-name <name>` - VoltOps experiment name override
- `--tag <trigger>` - VoltOps trigger source tag (default: "cli-experiment")
- `--dry-run` - Skip VoltOps submission (local scoring only)

Example with concurrency:

```bash
pnpm volt eval run \
  --experiment ./src/experiments/offline.experiment.ts \
  --concurrency 4
```

The CLI automatically resolves TypeScript imports, streams progress to stdout, and links the run to VoltOps when credentials are present in environment variables (`VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY`).

## Step 6: Use a Custom Dataset Resolver

Instead of inline items, you can provide a custom `resolve` function to fetch data from external sources, databases, or APIs.

```ts
import { createExperiment } from "@voltagent/evals";

export default createExperiment({
  id: "custom-dataset-example",
  dataset: {
    name: "custom-source",
    resolve: async ({ limit, signal }) => {
      // Fetch from your API, database, or any source
      const response = await fetch("https://api.example.com/test-data", { signal });
      const data = await response.json();

      // Apply limit if provided
      const items = limit ? data.slice(0, limit) : data;

      return {
        items, // Can be an array or async iterable
        total: data.length, // Optional: total count for progress tracking
        dataset: {
          name: "custom-source",
          metadata: { source: "api", fetchedAt: new Date().toISOString() },
        },
      };
    },
  },
  runner: async ({ item }) => {
    // Your runner logic
    return { output: processItem(item.input) };
  },
});
```

**Resolver function:**

- Receives `{ limit?, signal? }` as arguments
- Can return an iterable, async iterable, or object with `{ items, total?, dataset? }`
- Supports streaming large datasets with async iterables
- `signal` enables cancellation handling

Example with async iterable for streaming:

```ts
dataset: {
  resolve: async function* ({ signal }) {
    for await (const item of fetchItemsStream()) {
      if (signal?.aborted) break;
      yield item;
    }
  },
}
```

## Step 7: Use Named Datasets from VoltOps

For production workflows, store datasets in VoltOps and reference them by name. This enables version control, collaboration, and reusable test suites.

```ts
import { createExperiment } from "@voltagent/evals";

export default createExperiment({
  id: "voltops-dataset-example",
  dataset: {
    name: "support-qa-v1",
    versionId: "abc123", // Optional - defaults to latest version
    limit: 100, // Optional - limit items processed
  },
  runner: async ({ item }) => {
    // Your runner logic
    return { output: processItem(item.input) };
  },
});
```

**Dataset configuration:**

- `name` - Dataset name in VoltOps (required)
- `versionId` - Specific version ID (optional, defaults to latest)
- `limit` - Maximum number of items to process (optional)

When you run the experiment with a `voltOpsClient`, the dataset is automatically fetched from VoltOps. If no client is provided, the experiment fails with a clear error message.

### Managing Datasets with the CLI

Use the CLI to push local datasets to VoltOps or pull remote datasets locally:

**Push a dataset:**

```bash
pnpm volt eval dataset push \
  --name support-qa-v1 \
  --file ./datasets/support-qa.json
```

**Pull a dataset:**

```bash
pnpm volt eval dataset pull \
  --name support-qa-v1 \
  --version abc123 \
  --output ./datasets/support-qa-v1.json
```

**CLI dataset commands:**

- `push` - Upload a local dataset file to VoltOps
  - `--name <datasetName>` (required) - Dataset name
  - `--file <datasetFile>` - Path to dataset JSON file
- `pull` - Download a dataset version from VoltOps
  - `--name <datasetName>` - Dataset name (defaults to `VOLTAGENT_DATASET_NAME`)
  - `--id <datasetId>` - Dataset ID (overrides `--name`)
  - `--version <versionId>` - Version ID (defaults to latest)
  - `--output <filePath>` - Custom output file path
  - `--overwrite` - Overwrite existing file if present
  - `--page-size <size>` - Number of items to fetch per request

## Configuration Reference

### Required Fields

#### `id`

Unique identifier for the experiment. Used in logs, telemetry, and VoltOps run metadata.

```ts
id: "support-regression";
```

#### `dataset`

Specifies the evaluation inputs. Three approaches:

**Inline items:**

```ts
dataset: {
  items: [
    { id: "1", input: "hello", expected: "hello" },
    { id: "2", input: "goodbye", expected: "goodbye" },
  ];
}
```

**Named dataset (pulled from VoltOps):**

```ts
dataset: {
  name: "support-qa-v1",
  versionId: "abc123",  // optional - defaults to latest
  limit: 100,           // optional - limit items processed
}
```

**Custom resolver:**

```ts
dataset: {
  name: "custom-source",
  resolve: async ({ limit, signal }) => {
    const items = await fetchFromAPI(limit, signal);
    return {
      items,
      total: items.length,
      dataset: { name: "custom-source", metadata: { source: "api" } },
    };
  },
}
```

The resolver receives `{ limit?, signal? }` and returns an iterable, async iterable, or object with `{ items, total?, dataset? }`.

#### `runner`

Function that executes your agent/workflow for each dataset item. Receives a context object and returns output.

**Context properties:**

- `item` - Current dataset item (`{ id, input, expected?, label?, extra?, ... }`)
- `index` - Zero-based position in the dataset
- `total` - Total number of items (if known)
- `signal` - AbortSignal for cancellation handling
- `voltOpsClient` - VoltOps client instance (if provided)
- `runtime` - Metadata including `runId`, `startedAt`, `tags`

**Return format:**

```ts
// Full format:
runner: async ({ item }) => {
  return {
    output: "agent response",
    metadata: { tokens: 150 },
    traceIds: ["trace-id-1"], // Optional: trace IDs for observability
  };
};

// Short format (just the output):
runner: async ({ item }) => {
  return "agent response";
};
```

The runner can return the output directly or wrap it in an object with metadata and trace IDs.

### Optional Fields

#### `scorers`

Array of scoring functions to evaluate outputs. Each scorer compares the runner output against the expected value or applies custom logic.

**Basic usage with heuristic scorers:**

```ts
// These scorers don't require LLM/API keys
scorers: [scorers.exactMatch, scorers.levenshtein, scorers.numericDiff];
```

**With thresholds and custom IDs:**

```ts
scorers: [
  {
    id: "similarity-check",
    scorer: scorers.levenshtein,
    threshold: 0.8,
  },
];
```

**With LLM-based scorers:**

```ts
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

scorers: [
  {
    scorer: scorers.levenshtein, // Heuristic scorer
    threshold: 0.8,
  },
  {
    scorer: createAnswerCorrectnessScorer({
      model: openai("gpt-4o-mini"), // LLM scorer requires model
    }),
    threshold: 0.9,
  },
];
```

When a threshold is set, the item fails if `score < threshold`. Scorers without thresholds contribute to metrics but don't affect pass/fail status.

#### `passCriteria`

Defines overall experiment success. Can be a single criterion or an array.

**Mean score:**

```ts
passCriteria: {
  type: "meanScore",
  min: 0.9,
  scorerId: "exactMatch",  // optional - defaults to all scorers
  severity: "error",       // optional - "error" or "warn"
  label: "Accuracy check", // optional - for reporting
}
```

**Pass rate:**

```ts
passCriteria: {
  type: "passRate",
  min: 0.95,
  scorerId: "exactMatch",
}
```

**Multiple criteria:**

```ts
passCriteria: [
  { type: "meanScore", min: 0.8 },
  { type: "passRate", min: 0.9, scorerId: "exactMatch" },
];
```

All criteria must pass for the run to succeed. Criteria marked `severity: "warn"` don't fail the run but are reported in the summary.

#### `label` and `description`

Human-readable strings for dashboards and logs:

```ts
label: "Nightly Regression Suite",
description: "Validates prompt changes against production scenarios."
```

#### `tags`

Array of strings attached to the run for filtering and search:

```ts
tags: ["nightly", "production", "v2-prompts"];
```

#### `metadata`

Arbitrary key-value data included in the run result:

```ts
metadata: {
  branch: "feature/new-prompts",
  commit: "abc123",
  environment: "staging",
}
```

#### `experiment`

Binds the run to a named experiment in VoltOps:

```ts
experiment: {
  name: "support-regression",
  id: "exp-123",        // optional - explicit experiment ID
  autoCreate: true,     // optional - create experiment if missing (default: true)
}
```

When `autoCreate` is true and the experiment doesn't exist, VoltOps creates it on first run.

#### `voltOps`

VoltOps integration settings:

```ts
voltOps: {
  client: voltOpsClient,        // optional - SDK instance
  triggerSource: "ci",          // optional - "ci", "manual", "scheduled", etc.
  autoCreateRun: true,          // optional - defaults to true
  autoCreateScorers: true,      // optional - register scorers in VoltOps
  tags: ["regression", "v2"],   // optional - additional tags
}
```

## Dataset Items

Each item in the dataset has this structure:

```ts
interface ExperimentDatasetItem {
  id: string; // unique identifier
  input: unknown; // passed to runner
  expected?: unknown; // passed to scorers
  label?: string | null; // human-readable description
  extra?: Record<string, unknown> | null; // additional metadata
  datasetId?: string; // VoltOps dataset ID (auto-populated)
  datasetVersionId?: string; // VoltOps version ID (auto-populated)
  datasetName?: string; // Dataset name (auto-populated)
  metadata?: Record<string, unknown> | null; // item-level metadata
}
```

The `input` and `expected` types are generic - use any structure your runner and scorers expect.

## Scorers

Scorers compare runner output to expected values or apply custom validation. Each scorer returns a result with:

- `status` - `"success"`, `"error"`, or `"skipped"`
- `score` - Numeric value (0.0 to 1.0 for normalized scorers)
- `metadata` - Additional context (e.g., token counts, similarity details)
- `reason` - Explanation for the score (especially for LLM judges)
- `error` - Error message if status is `"error"`

### Heuristic Scorers (No LLM Required)

```ts
import { scorers } from "@voltagent/scorers";

// String comparison
scorers.exactMatch; // output === expected
scorers.levenshtein; // edit distance (0-1 score)

// Numeric and data comparison
scorers.numericDiff; // normalized numeric difference
scorers.jsonDiff; // JSON object comparison
scorers.listContains; // list element matching
```

### LLM-Based Scorers

For LLM-based evaluation, use the native VoltAgent scorers that explicitly require a model:

```ts
import {
  createAnswerCorrectnessScorer,
  createAnswerRelevancyScorer,
  createContextPrecisionScorer,
  createContextRecallScorer,
  createContextRelevancyScorer,
  createModerationScorer,
  createFactualityScorer,
  createSummaryScorer,
} from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

// Create LLM scorers with explicit model configuration
const answerCorrectness = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  options: { factualityWeight: 0.8 },
});

const moderation = createModerationScorer({
  model: openai("gpt-4o-mini"),
  threshold: 0.5,
});
```

### Custom Scorers

For custom scoring logic, use `buildScorer` from @voltagent/core:

```ts
import { buildScorer } from "@voltagent/core";

const customLengthScorer = buildScorer({
  id: "length-validator",
  label: "Length Validator",
})
  .score(({ payload }) => {
    const output = String(payload.output || "");
    const minLength = Number(payload.minLength || 10);
    const valid = output.length >= minLength;

    return {
      score: valid ? 1.0 : 0.0,
      metadata: {
        actualLength: output.length,
        minLength,
      },
    };
  })
  .reason(({ score, results }) => ({
    reason:
      score >= 1
        ? `Output meets minimum length of ${results.raw.minLength}`
        : `Output too short: ${results.raw.actualLength} < ${results.raw.minLength}`,
  }))
  .build();
```

## Result Structure

`runExperiment` returns:

```ts
interface ExperimentResult {
  runId?: string; // VoltOps run ID (if connected)
  summary: ExperimentSummary; // aggregate metrics
  items: ExperimentItemResult[]; // per-item results
  metadata?: Record<string, unknown> | null;
}
```

### Summary

```ts
interface ExperimentSummary {
  totalCount: number;
  completedCount: number;
  successCount: number; // items with status "passed"
  failureCount: number; // items with status "failed"
  errorCount: number; // items with status "error"
  skippedCount: number; // items with status "skipped"
  meanScore?: number | null;
  passRate?: number | null;
  startedAt: number; // Unix timestamp
  completedAt?: number; // Unix timestamp
  durationMs?: number;
  scorers: Record<string, ScorerAggregate>; // per-scorer stats
  criteria: PassCriteriaEvaluation[]; // pass/fail breakdown
}
```

### Item Results

```ts
interface ExperimentItemResult {
  item: ExperimentDatasetItem;
  itemId: string;
  index: number;
  status: "passed" | "failed" | "error" | "skipped";
  runner: {
    output?: unknown;
    metadata?: Record<string, unknown> | null;
    traceIds?: string[];
    error?: unknown;
    startedAt: number;
    completedAt?: number;
    durationMs?: number;
  };
  scores: Record<string, ExperimentScore>;
  thresholdPassed?: boolean | null; // true if all thresholds passed
  error?: unknown;
  durationMs?: number;
}
```

## Error Handling

### Runner Errors

If the runner throws an exception, the item is marked `status: "error"` and the error is captured in `itemResult.error` and `itemResult.runner.error`.

```ts
runner: async ({ item }) => {
  try {
    return await agent.generateText(item.input);
  } catch (error) {
    // Error captured automatically - no need to handle here
    throw error;
  }
};
```

### Scorer Errors

If a scorer throws, the item is marked `status: "error"`. Individual scorer results include `status: "error"` and the error message.

### Cancellation

Pass an AbortSignal to stop the run early:

```ts
const controller = new AbortController();

setTimeout(() => controller.abort(), 30000); // 30 second timeout

const result = await runExperiment(experiment, {
  signal: controller.signal,
});
```

When aborted, `runExperiment` throws the abort reason. Items processed before cancellation are included in the partial result (available via VoltOps if connected).

## Concurrency

Set `concurrency` to process multiple items in parallel:

```ts
const result = await runExperiment(experiment, {
  concurrency: 10, // 10 items at once
});
```

Concurrency applies to both runner execution and scoring. Higher values increase throughput but consume more resources. Start with 4-8 and adjust based on rate limits and system capacity.

## Best Practices

### Structure Datasets by Purpose

Group related scenarios in the same dataset:

- `user-onboarding` - Sign-up flows and welcome messages
- `support-faq` - Common questions with known answers
- `edge-cases` - Error handling and unusual inputs

### Use Version Labels

Label dataset versions to track changes:

```ts
dataset: {
  name: "support-faq",
  metadata: {
    version: "2024-01-15",
    description: "Added 20 new questions about billing",
  },
}
```

### Combine Multiple Scorers

Use complementary scorers to catch different failure modes:

```ts
scorers: [
  scorers.exactMatch, // strict match
  scorers.embeddingSimilarity, // semantic similarity
  scorers.moderation, // safety check
];
```

### Set Realistic Thresholds

Start with loose thresholds and tighten over time:

```ts
scorers: [
  { scorer: scorers.answerCorrectness, threshold: 0.7 }, // initial baseline
];
```

Monitor false positives and adjust based on production data.

### Tag Runs for Filtering

Use tags to organize runs by context:

```ts
tags: [`branch:${process.env.GIT_BRANCH}`, `commit:${process.env.GIT_SHA}`, "ci"];
```

This enables filtering in VoltOps dashboards and APIs.

### Handle Long-Running Items

Set timeouts in your runner to prevent hangs:

```ts
runner: async ({ item, signal }) => {
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    return await agent.generateText(item.input, { signal });
  } finally {
    clearTimeout(timeout);
  }
};
```

Or use the provided `signal` for coordinated cancellation.

### Validate Experiment Configuration

Test your experiment with a small dataset before running the full suite:

```ts
const result = await runExperiment(experiment, {
  voltOpsClient,
  onProgress: ({ completed, total }) => {
    if (completed === 1) {
      console.log("First item processed successfully");
    }
  },
});
```

Check the first result to verify runner output format and scorer compatibility.

## Examples

### Basic Regression Test

```ts
import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  id: "greeting-smoke",
  dataset: {
    items: [
      { id: "1", input: "hello", expected: "hello" },
      { id: "2", input: "goodbye", expected: "goodbye" },
    ],
  },
  runner: async ({ item }) => item.input.toLowerCase(),
  scorers: [scorers.exactMatch],
  passCriteria: { type: "passRate", min: 1.0 },
});
```

### RAG Evaluation

```ts
import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  id: "rag-quality",
  dataset: { name: "knowledge-base-qa" },
  runner: async ({ item }) => {
    const docs = await retriever.retrieve(item.input);
    const answer = await agent.generateText(item.input, { context: docs });
    return {
      output: answer.text,
      metadata: {
        docs: docs.map((d) => d.id),
        tokens: answer.usage?.total_tokens,
      },
    };
  },
  scorers: [
    { scorer: scorers.answerCorrectness, threshold: 0.8 },
    { scorer: scorers.contextRelevancy, threshold: 0.7 },
  ],
  passCriteria: [
    { type: "meanScore", min: 0.75 },
    { type: "passRate", min: 0.9 },
  ],
});
```

## Next Steps

- [Prebuilt Scorers](/evaluation-docs/prebuilt-scorers) - Full catalog of prebuilt scorers
- [Building Custom Scorers](/evaluation-docs/building-custom-scorers) - Create your own evaluation scorers
