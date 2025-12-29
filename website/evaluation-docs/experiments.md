---
title: Experiments
---

# Experiments

Experiments are the core abstraction for running evaluations in VoltAgent. They define how to test your agents, what data to use, and how to measure success.

## Creating Experiments

Use `createExperiment` from `@voltagent/evals` to define an evaluation experiment:

```typescript
import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";

export default createExperiment({
  id: "customer-support-quality",
  label: "Customer Support Quality",
  description: "Evaluate customer support agent responses",

  // Reference a dataset by name
  dataset: {
    name: "support-qa-dataset",
  },

  // Define the runner function to evaluate
  runner: async ({ item, index, total }) => {
    // Access the dataset item
    const input = item.input;
    const expected = item.expected;

    // Run your evaluation logic
    const response = await myAgent.generateText(input);

    // Return the output
    return {
      output: response.text,
      metadata: {
        processingTime: Date.now(),
        modelUsed: "gpt-4o-mini",
      },
    };
  },

  // Configure scorers
  scorers: [
    scorers.exactMatch,
    {
      scorer: scorers.levenshtein,
      threshold: 0.8,
    },
  ],

  // Pass criteria
  passCriteria: {
    type: "meanScore",
    min: 0.7,
  },
});
```

## Experiment Configuration

### Required Fields

```typescript
interface ExperimentConfig {
  // Unique identifier for the experiment
  id: string;

  // The runner function that executes for each dataset item
  runner: ExperimentRunner;

  // Optional but recommended
  label?: string;
  description?: string;
}
```

### Runner Function

The runner function is what you're evaluating. It receives a context object and produces output:

```typescript
type ExperimentRunner = (context: ExperimentRunnerContext) => Promise<ExperimentRunnerReturn>;

interface ExperimentRunnerContext {
  item: ExperimentDatasetItem; // Current dataset item
  index: number; // Item index
  total?: number; // Total items (if known)
  signal?: AbortSignal; // For cancellation
  voltOpsClient?: any; // VoltOps client if configured
  runtime?: {
    runId?: string;
    startedAt?: number;
    tags?: readonly string[];
  };
}
```

Example runners:

```typescript
// Simple text generation
runner: async ({ item }) => {
  const result = await processInput(item.input);
  return {
    output: result,
    metadata: {
      confidence: 0.95,
    },
  };
};

// Using expected value for comparison
runner: async ({ item }) => {
  const prompt = `Question: ${item.input}\nExpected answer format: ${item.expected}`;
  const result = await generateResponse(prompt);
  return { output: result };
};

// With error handling
runner: async ({ item, signal }) => {
  try {
    const result = await processWithTimeout(item.input, signal);
    return { output: result };
  } catch (error) {
    return {
      output: null,
      metadata: {
        error: error.message,
        failed: true,
      },
    };
  }
};

// Accessing runtime context
runner: async ({ item, index, total, runtime }) => {
  console.log(`Processing item ${index + 1}/${total}`);
  console.log(`Run ID: ${runtime?.runId}`);

  const result = await process(item.input);
  return {
    output: result,
  };
};
```

### Dataset Configuration

Experiments can use datasets in multiple ways:

```typescript
// Reference registered dataset by name
dataset: {
  name: "my-dataset"
}

// Reference by ID
dataset: {
  id: "dataset-uuid",
  versionId: "version-uuid"  // Optional specific version
}

// Limit number of items
dataset: {
  name: "large-dataset",
  limit: 100  // Only use first 100 items
}

// Inline items
dataset: {
  items: [
    {
      id: "1",
      input: { prompt: "What is 2+2?" },
      expected: "4"
    },
    {
      id: "2",
      input: { prompt: "Capital of France?" },
      expected: "Paris"
    }
  ]
}

// Dynamic resolver
dataset: {
  resolve: async ({ limit, signal }) => {
    const items = await fetchDatasetItems(limit);
    return {
      items,
      total: items.length,
      dataset: {
        name: "Dynamic Dataset",
        description: "Fetched at runtime"
      }
    };
  }
}
```

### Dataset Item Structure

```typescript
interface ExperimentDatasetItem {
  id: string; // Unique item ID
  label?: string; // Optional display name
  input: any; // Input data (your format)
  expected?: any; // Expected output (optional)
  extra?: Record<string, any>; // Additional data
  metadata?: Record<string, any>; // Item metadata

  // Automatically added if from registered dataset
  datasetId?: string;
  datasetVersionId?: string;
  datasetName?: string;
}
```

## Scorers Configuration

Configure how experiments use scorers:

```typescript
import { scorers } from "@voltagent/scorers";

scorers: [
  // Use prebuilt scorer directly
  scorers.exactMatch,

  // Configure scorer with threshold
  {
    scorer: scorers.levenshtein,
    threshold: 0.9,
    name: "String Similarity",
  },

  // Custom scorer with metadata
  {
    scorer: myCustomScorer,
    threshold: 0.7,
    metadata: {
      category: "custom",
      version: "1.0.0",
    },
  },
];
```

## Pass Criteria

Define success conditions for your experiments:

```typescript
// Single criterion - mean score
passCriteria: {
  type: "meanScore",
  min: 0.8,
  label: "Average Quality",
  scorerId: "exact-match"  // Optional: specific scorer
}

// Single criterion - pass rate
passCriteria: {
  type: "passRate",
  min: 0.9,
  label: "90% Pass Rate",
  severity: "error"  // "error" or "warn"
}

// Multiple criteria (all must pass)
passCriteria: [
  {
    type: "meanScore",
    min: 0.7,
    label: "Overall Quality"
  },
  {
    type: "passRate",
    min: 0.95,
    label: "Consistency Check",
    scorerId: "exact-match"
  }
]
```

## VoltOps Integration

Configure VoltOps for cloud-based tracking:

```typescript
voltOps: {
  client: voltOpsClient,          // VoltOps client instance
  triggerSource: "ci",            // Source identifier
  autoCreateRun: true,             // Auto-create eval runs
  autoCreateScorers: true,         // Auto-register scorers
  tags: ["nightly", "regression"]  // Tags for filtering
}
```

## Experiment Binding

Link experiments to VoltOps experiments:

```typescript
experiment: {
  name: "production-quality-check",  // VoltOps experiment name
  id: "exp-uuid",                   // Or use existing ID
  autoCreate: true                  // Create if doesn't exist
}
```

## Running Experiments

### Via CLI

Save your experiment to a file:

```typescript
// experiments/support-quality.ts
import { createExperiment } from "@voltagent/evals";

export default createExperiment({
  id: "support-quality",
  dataset: { name: "support-dataset" },
  runner: async ({ item }) => {
    // evaluation logic
    return { output: "response" };
  },
});
```

Run with:

```bash
npm run volt eval run --experiment ./experiments/support-quality.ts
```

### Programmatically

```typescript
import { runExperiment } from "@voltagent/evals";
import experiment from "./experiments/support-quality";

const summary = await runExperiment(experiment, {
  concurrency: 5, // Run 5 items in parallel

  onItemComplete: (event) => {
    console.log(`Completed item ${event.index}/${event.total}`);
    console.log(`Score: ${event.result.scores[0]?.score}`);
  },

  onComplete: (summary) => {
    console.log(`Experiment completed: ${summary.passed ? "PASSED" : "FAILED"}`);
    console.log(`Mean score: ${summary.meanScore}`);
  },
});
```

## Complete Example

Here's a complete example from the codebase:

```typescript
import { createExperiment } from "@voltagent/evals";
import { scorers } from "@voltagent/scorers";
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const supportAgent = new Agent({
  name: "Support Agent",
  instructions: "You are a helpful customer support agent.",
  model: openai("gpt-4o-mini"),
});

export default createExperiment({
  id: "support-agent-eval",
  label: "Support Agent Evaluation",
  description: "Evaluates support agent response quality",

  dataset: {
    name: "support-qa-v2",
    limit: 100, // Test on first 100 items
  },

  runner: async ({ item, index, total }) => {
    console.log(`Processing ${index + 1}/${total}`);

    try {
      const response = await supportAgent.generateText({
        messages: [{ role: "user", content: item.input.prompt }],
      });

      return {
        output: response.text,
        metadata: {
          model: "gpt-4o-mini",
          tokenUsage: response.usage,
        },
      };
    } catch (error) {
      return {
        output: null,
        metadata: {
          error: error.message,
          failed: true,
        },
      };
    }
  },

  scorers: [
    {
      scorer: scorers.exactMatch,
      threshold: 1.0,
    },
    {
      scorer: scorers.levenshtein,
      threshold: 0.8,
      name: "String Similarity",
    },
  ],

  passCriteria: [
    {
      type: "meanScore",
      min: 0.75,
      label: "Overall Quality",
    },
    {
      type: "passRate",
      min: 0.9,
      scorerId: "exact-match",
      label: "Exact Match Rate",
    },
  ],

  experiment: {
    name: "support-agent-regression",
    autoCreate: true,
  },

  voltOps: {
    autoCreateRun: true,
    tags: ["regression", "support"],
  },
});
```

## Result Structure

When running experiments, you get a summary with this structure:

```typescript
interface ExperimentSummary {
  experimentId: string;
  runId: string;
  status: "completed" | "failed" | "cancelled";
  passed: boolean;

  startedAt: number;
  completedAt: number;
  durationMs: number;

  results: ExperimentItemResult[];

  // Aggregate metrics
  totalItems: number;
  completedItems: number;
  meanScore: number;
  passRate: number;

  // Pass criteria results
  criteriaResults?: {
    label?: string;
    passed: boolean;
    value: number;
    threshold: number;
  }[];

  metadata?: Record<string, unknown>;
}
```

## Best Practices

### 1. Use Descriptive IDs

```typescript
id: "gpt4-customer-support-accuracy-v2"; // Good
id: "test1"; // Bad
```

### 2. Handle Errors Gracefully

```typescript
runner: async ({ item }) => {
  try {
    const result = await process(item.input);
    return { output: result };
  } catch (error) {
    // Return error info for analysis
    return {
      output: null,
      metadata: {
        error: error.message,
        errorType: error.constructor.name,
      },
    };
  }
};
```

### 3. Add Meaningful Metadata

```typescript
runner: async ({ item, runtime }) => {
  const startTime = Date.now();
  const result = await process(item.input);

  return {
    output: result,
    metadata: {
      processingTimeMs: Date.now() - startTime,
      runId: runtime?.runId,
      itemCategory: item.metadata?.category,
    },
  };
};
```

### 4. Use Appropriate Concurrency

```typescript
// For rate-limited APIs
await runExperiment(experiment, {
  concurrency: 2, // Low concurrency
});

// For local processing
await runExperiment(experiment, {
  concurrency: 10, // Higher concurrency
});
```

### 5. Tag Experiments Properly

```typescript
voltOps: {
  tags: ["model:gpt-4", "version:2.1.0", "type:regression", "priority:high"];
}
```

## Next Steps

- [Datasets](/evaluation-docs/datasets) - Learn about creating and managing datasets
- [Building Custom Scorers](/evaluation-docs/building-custom-scorers) - Create domain-specific scorers
- [Prebuilt Scorers](/evaluation-docs/prebuilt-scorers) - Explore available scorers
- [CLI Reference](/evaluation-docs/cli-reference) - Run experiments from the command line
