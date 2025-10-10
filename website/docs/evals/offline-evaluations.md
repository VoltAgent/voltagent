---
title: Offline Evaluations
sidebar_position: 2
---

# Offline Evaluations

Offline evaluations run against a fixed dataset and produce deterministic results. Use them for regression testing, CI gates, and comparing model or prompt changes before deployment.

## Creating an Experiment

Define an experiment with `createExperiment`:

```ts
import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  id: "support-regression",
  dataset: { name: "support-qa-v1" },
  runner: async ({ item }) => {
    const reply = await supportAgent.generateText(item.input);
    return { output: reply.text };
  },
  scorers: [scorers.exactMatch],
  passCriteria: { type: "passRate", min: 0.95 },
});
```

The experiment returns a definition object that can be executed with `runExperiment`.

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
    traceIds: ["trace-123"],
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

**Basic usage:**

```ts
scorers: [scorers.exactMatch, scorers.levenshtein];
```

**With thresholds and metadata:**

```ts
scorers: [
  {
    scorer: scorers.embeddingSimilarity,
    threshold: 0.8,
    metadata: { model: "text-embedding-ada-002" },
  },
  {
    scorer: scorers.answerCorrectness,
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
  autoCreate: true,     // optional - create experiment if missing
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

## Running Experiments

### Programmatic Execution

```ts
import { runExperiment } from "@voltagent/evals";
import { VoltOpsRestClient } from "@voltagent/sdk";
import experiment from "./experiments/support.experiment";

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

**Options:**

- `concurrency` - Number of items processed in parallel (default: 1)
- `signal` - AbortSignal to cancel the run
- `voltOpsClient` - SDK instance for telemetry and datasets
- `onProgress` - Called after each item with `{ completed, total? }`
- `onItem` - Called after each item with `{ index, item, result, summary }`

### CLI Execution

```bash
npx @voltagent/cli eval run \
  --experiment ./src/experiments/support.experiment.ts \
  --concurrency 4
```

The CLI resolves TypeScript imports, streams progress to stdout, and links the run to VoltOps when credentials are present in environment variables.

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

### String Comparison

```ts
import { scorers } from "@voltagent/scorers";

scorers.exactMatch; // output === expected
scorers.levenshtein; // edit distance
```

### Semantic Similarity

```ts
scorers.embeddingSimilarity; // cosine similarity of embeddings
scorers.answerSimilarity; // LLM-based semantic comparison
```

### LLM Judges

```ts
scorers.answerCorrectness; // combines factuality + semantic similarity
scorers.answerRelevancy; // checks if output answers the input
scorers.contextRelevancy; // validates retrieved context relevance
scorers.contextRecall; // checks if all expected facts are present
scorers.contextPrecision; // measures precision of retrieved context
```

### Moderation and Classification

```ts
scorers.moderation; // safety checks (toxicity, bias, etc.)
scorers.factual; // verifies factual claims
scorers.summary; // validates summaries
scorers.translation; // checks translation quality
```

### Custom Scorers

```ts
import { createAutoEvalScorer } from "@voltagent/scorers";

const customScorer = createAutoEvalScorer({
  id: "custom-length",
  name: "Length Validator",
  scorer: ({ output, expected }) => {
    const valid = output.length >= expected.minLength;
    return {
      score: valid ? 1.0 : 0.0,
      metadata: { actualLength: output.length },
    };
  },
});
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

### Multi-Model Comparison

```ts
import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";

const models = ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet"];

for (const model of models) {
  const experiment = createExperiment({
    id: `model-comparison-${model}`,
    dataset: { name: "benchmark-suite" },
    runner: async ({ item }) => {
      const answer = await generateText({
        model,
        prompt: item.input,
      });
      return answer.text;
    },
    scorers: [scorers.exactMatch, scorers.answerCorrectness],
    tags: ["model-comparison", model],
    metadata: { model },
  });

  await runExperiment(experiment, { voltOpsClient });
}
```

## Next Steps

- [Prebuilt Scorers](/docs/evals/prebuilt-scorers) - Full catalog of prebuilt scorers
- [Building Custom Scorers](/docs/evals/building-custom-scorers) - Create your own evaluation scorers
