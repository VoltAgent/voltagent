# Prebuilt Scorers

VoltAgent provides prebuilt scorers for common evaluation scenarios. These scorers are production-ready and can be used in both offline and live evaluations.

## Heuristic Scorers (No LLM Required)

These scorers from AutoEvals perform deterministic evaluations without requiring an LLM or API keys:

### Exact Match

Checks if the output exactly matches the expected value.

```typescript
import { scorers } from "@voltagent/scorers";

// Use in offline evaluation
const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [{ input: "What is 2+2?", expected: "4" }],
  },
  runner: async ({ item }) => ({ output: "4" }),
  scorers: [scorers.exactMatch],
});
```

**Parameters (optional):**

- `ignoreCase` (boolean): Case-insensitive comparison (default: false)

**Score:** Binary (0 or 1)

---

### Levenshtein Distance

Measures string similarity using Levenshtein distance.

```typescript
import { scorers } from "@voltagent/scorers";

const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [{ input: "Spell 'algorithm'", expected: "algorithm" }],
  },
  runner: async ({ item }) => ({ output: "algoritm" }),
  scorers: [scorers.levenshtein],
});
```

**Parameters (optional):**

- `threshold` (number): Minimum similarity score (0-1)

**Score:** Normalized similarity (0-1)

---

### JSON Diff

Compares JSON objects for structural and value differences.

```typescript
import { scorers } from "@voltagent/scorers";

const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [
      {
        input: "Generate user object",
        expected: JSON.stringify({ name: "John", age: 30 }),
      },
    ],
  },
  runner: async ({ item }) => ({
    output: JSON.stringify({ name: "John", age: 30, extra: "field" }),
  }),
  scorers: [scorers.jsonDiff],
});
```

**Parameters:** None required (uses `expected` from dataset)

**Score:** Similarity score based on structural matching (0-1)

---

### List Contains

Checks if output contains all expected items.

```typescript
import { scorers } from "@voltagent/scorers";

const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [
      {
        input: "List primary colors",
        expected: ["red", "blue", "yellow"],
      },
    ],
  },
  runner: async ({ item }) => ({
    output: ["red", "blue", "yellow", "green"],
  }),
  scorers: [scorers.listContains],
});
```

**Parameters:** None required (uses `expected` from dataset)

**Score:** Fraction of expected items found (0-1)

---

### Numeric Diff

Evaluates numeric accuracy within a threshold.

```typescript
import { scorers } from "@voltagent/scorers";

const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [
      {
        input: "What is pi to 2 decimal places?",
        expected: 3.14,
      },
    ],
  },
  runner: async ({ item }) => ({ output: 3.1415 }),
  scorers: [
    {
      scorer: scorers.numericDiff,
      params: { threshold: 0.01 },
    },
  ],
});
```

**Parameters (optional):**

- `threshold` (number): Maximum allowed difference

**Score:** Binary (1 if within threshold, 0 otherwise)

---

## RAG Scorers (LLM Required)

These native VoltAgent scorers evaluate Retrieval-Augmented Generation systems:

### Answer Correctness

Evaluates factual accuracy of answers against expected ground truth.

```typescript
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload, params }) => ({
    input: String(payload.input),
    output: String(payload.output),
    expected: String(params.expectedAnswer),
  }),
});
```

**Payload Fields:**

- `input` (string): The question
- `output` (string): The answer to evaluate
- `expected` (string): The ground truth answer

**Options:**

- `factualityWeight` (number): Weight for factual accuracy (default: 1.0)

**Score:** F1 score based on statement classification (0-1)

**Metadata:**

```typescript
{
  classification: {
    TP: string[];    // True positive statements
    FP: string[];    // False positive statements
    FN: string[];    // False negative statements
    f1Score: number; // F1 score
  }
}
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
});

const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [
      {
        input: "What is the capital of France?",
        expected: "Paris is the capital of France.",
      },
    ],
  },
  runner: async ({ item }) => {
    const result = await agent.generateText(item.input);
    return { output: result.text };
  },
  scorers: [scorer],
});
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { Agent } from "@voltagent/core";
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    output: String(payload.output),
    expected: getGroundTruth(payload.input), // Your function to get expected answer
  }),
});

const agent = new Agent({
  name: "support-agent",
  model: openai("gpt-4o"),
  eval: {
    scorers: {
      correctness: { scorer },
    },
  },
});
```

</TabItem>
</Tabs>

---

### Answer Relevancy

Evaluates how relevant an answer is to the original question.

```typescript
import { createAnswerRelevancyScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerRelevancyScorer({
  model: openai("gpt-4o-mini"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
  strictness: 3,
  buildPayload: ({ payload, params }) => ({
    input: String(payload.input),
    output: String(payload.output),
    context: String(params.referenceContext),
  }),
});
```

**Payload Fields:**

- `input` (string): The original question
- `output` (string): The answer to evaluate
- `context` (string): Reference context for the answer

**Options:**

- `strictness` (number): Number of questions to generate for evaluation (default: 3)
- `embeddingExpectedMin` (number): Minimum expected similarity (default: 0.7)
- `embeddingPrefix` (string): Prefix for embeddings

**Score:** Average similarity score (0-1)

**Metadata:**

```typescript
{
  strictness: number;
  questions: Array<{
    question: string;
    noncommittal: boolean;
  }>;
  similarity: Array<{
    question: string;
    score: number;
    rawScore: number;
    usage: number;
  }>;
  noncommittal: boolean;
}
```

---

### Context Precision

Evaluates whether the provided context was useful for generating the answer.

```typescript
import { createContextPrecisionScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createContextPrecisionScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    output: String(payload.output),
    context: String(payload.context),
    expected: String(payload.expected),
  }),
});
```

**Payload Fields:**

- `input` (string): The question
- `output` (string): The generated answer
- `context` (string): Retrieved context
- `expected` (string): Expected answer

**Score:** Binary (1 if useful, 0 if not)

**Metadata:**

```typescript
{
  reason: string; // Explanation for the verdict
  verdict: number; // 1 if useful, 0 if not
}
```

---

### Context Recall

Measures how well the context covers the expected answer.

```typescript
import { createContextRecallScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createContextRecallScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    expected: String(payload.expected),
    context: payload.context,
  }),
});
```

**Payload Fields:**

- `input` (string): The question
- `expected` (string): The ground truth answer
- `context` (string | string[]): Retrieved context

**Score:** Percentage of statements found in context (0-1)

**Metadata:**

```typescript
{
  classifications: Array<{
    statement: string;
    attributed: number; // 1 if found in context, 0 if not
    reason: string;
  }>;
  score: number;
}
```

---

### Context Relevancy

Evaluates how relevant the retrieved context is to the question.

```typescript
import { createContextRelevancyScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createContextRelevancyScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    context: payload.context,
  }),
});
```

**Payload Fields:**

- `input` (string): The question
- `context` (string | string[]): Retrieved context

**Score:** Coverage ratio of relevant sentences (0-1)

**Metadata:**

```typescript
{
  sentences: Array<{
    sentence: string;
    isRelevant: number;
    reason: string;
  }>;
  coverageRatio: number;
}
```

---

## Task-Specific Scorers (LLM Required)

### Factuality

Verifies factual accuracy against ground truth.

```typescript
import { createFactualityScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createFactualityScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    output: String(payload.output),
    expected: String(payload.expected),
  }),
});
```

**Payload Fields:**

- `input` (string): The input/question
- `output` (string): Generated response
- `expected` (string): Expected factual answer

**Score:** Binary (0 or 1) based on factual accuracy

**Metadata:**

```typescript
{
  rationale: string; // Explanation of the verdict
}
```

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createFactualityScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createFactualityScorer({
  model: openai("gpt-4o-mini"),
});

const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [
      {
        input: "When was the Eiffel Tower built?",
        expected: "1889",
      },
    ],
  },
  runner: async ({ item }) => {
    const result = await agent.generateText(item.input);
    return { output: result.text };
  },
  scorers: [scorer],
});
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
const agent = new Agent({
  name: "fact-checker",
  model: openai("gpt-4o"),
  eval: {
    scorers: {
      facts: {
        scorer: createFactualityScorer({
          model: openai("gpt-4o-mini"),
        }),
      },
    },
  },
});
```

</TabItem>
</Tabs>

---

### Summary

Evaluates the quality of generated summaries.

```typescript
import { createSummaryScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createSummaryScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.content),
    output: String(payload.summary),
  }),
});
```

**Payload Fields:**

- `input` (string): Original content to summarize
- `output` (string): Generated summary

**Score:** Quality score (0-1)

**Metadata:**

```typescript
{
  coherence: number; // 0-5 rating
  consistency: number; // 0-5 rating
  fluency: number; // 0-5 rating
  relevance: number; // 0-5 rating
  rationale: string; // Detailed explanation
}
```

---

### Translation

Evaluates translation quality and accuracy.

```typescript
import { createTranslationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createTranslationScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.source),
    output: String(payload.translation),
    expected: String(payload.reference),
  }),
});
```

**Payload Fields:**

- `input` (string): Source text
- `output` (string): Generated translation
- `expected` (string): Reference translation

**Score:** Translation quality (0-1)

**Metadata:**

```typescript
{
  accuracy: number; // Semantic accuracy (0-5)
  fluency: number; // Language fluency (0-5)
  consistency: number; // Term consistency (0-5)
  rationale: string; // Detailed feedback
}
```

---

### Humor

Evaluates if a response is appropriately humorous.

```typescript
import { createHumorScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createHumorScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    output: String(payload.response),
  }),
});
```

**Payload Fields:**

- `output` (string): Response to evaluate

**Score:** Binary (0 or 1) - 1 if humorous, 0 if not

**Metadata:**

```typescript
{
  rationale: string; // Explanation of humor assessment
}
```

---

### Possible

Tests if a task or scenario is possible/feasible.

```typescript
import { createPossibleScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createPossibleScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.task),
    output: String(payload.response),
  }),
});
```

**Payload Fields:**

- `input` (string): Task or scenario description
- `output` (string): Assessment response

**Score:** Binary (0 or 1) - 1 if possible, 0 if not

**Metadata:**

```typescript
{
  rationale: string; // Reasoning about possibility
}
```

---

### Moderation

Checks content for safety and appropriateness.

```typescript
import { createModerationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createModerationScorer({
  model: openai("gpt-4o-mini"),
  threshold: 0.5,
  categories: ["hate", "harassment", "violence", "sexual", "self-harm"],
  buildPayload: ({ payload }) => ({
    output: String(payload.content),
  }),
});
```

**Payload Fields:**

- `output` (string): Content to moderate

**Options:**

- `threshold` (number): Threshold for flagging content (default: 0.5)
- `categories` (string[]): Categories to check

**Score:** Binary (0 or 1) - 1 if safe, 0 if problematic

**Metadata:**

```typescript
{
  categories: {
    hate: boolean;
    violence: boolean;
    sexual: boolean;
    selfHarm: boolean;
    harassment: boolean;
  }
  rationale: string; // Explanation of moderation decision
}
```

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createModerationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createModerationScorer({
  model: openai("gpt-4o-mini"),
  threshold: 0.5,
});

const experiment = await voltagent.evals.runExperiment({
  dataset: {
    items: [{ input: "User generated content to check..." }],
  },
  runner: async ({ item }) => {
    return { output: item.input };
  },
  scorers: [scorer],
});
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
const agent = new Agent({
  name: "content-moderator",
  model: openai("gpt-4o"),
  eval: {
    scorers: {
      safety: {
        scorer: createModerationScorer({
          model: openai("gpt-4o-mini"),
          threshold: 0.7,
        }),
      },
    },
  },
});
```

</TabItem>
</Tabs>

---

## Using Scorers

### In Offline Evaluations

```typescript
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { scorers } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const experiment = await voltagent.evals.runExperiment({
  dataset: { name: "my-test-dataset" },
  runner: myAgent,
  scorers: [
    // Heuristic scorer (gets expected from dataset)
    scorers.exactMatch,
    // LLM-based scorer
    createAnswerCorrectnessScorer({
      model: openai("gpt-4o-mini"),
    }),
  ],
});

const results = await experiment.results();
```

### In Live Evaluations

```typescript
import { Agent } from "@voltagent/core";
import { scorers, createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "production-agent",
  model: openai("gpt-4o"),
  eval: {
    scorers: {
      // Heuristic scorer
      exact: {
        scorer: scorers.exactMatch,
        params: { expected: "expected value" },
      },
      // LLM-based scorer
      correctness: {
        scorer: createAnswerCorrectnessScorer({
          model: openai("gpt-4o-mini"),
        }),
      },
    },
  },
});
```

### Custom Payload Mapping

All scorers support custom payload mapping:

```typescript
const scorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload, params }) => ({
    input: payload.question,
    output: payload.answer,
    expected: params.groundTruth,
  }),
});
```

### Combining Scorer Types

Mix heuristic and LLM-based scorers for comprehensive evaluation:

```typescript
import {
  scorers,
  createAnswerCorrectnessScorer,
  createAnswerRelevancyScorer,
} from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const allScorers = [
  // Heuristic scorers (no LLM, use expected from dataset)
  scorers.levenshtein,
  {
    scorer: scorers.numericDiff,
    params: { threshold: 0.1 }, // Only threshold param needed
  },
  // LLM-based scorers
  createAnswerCorrectnessScorer({
    model: openai("gpt-4o-mini"),
  }),
  createAnswerRelevancyScorer({
    model: openai("gpt-4o-mini"),
    embeddingModel: openai.embedding("text-embedding-3-small"),
  }),
];

const experiment = await voltagent.evals.runExperiment({
  dataset: { name: "qa-dataset" },
  runner: ragPipeline,
  scorers: allScorers,
});
```

---

## Choosing the Right Scorer

### Use Heuristic Scorers When:

- You need deterministic, reproducible results
- You want fast evaluation without API costs
- You're comparing exact values or simple patterns
- You don't have access to LLM APIs

### Use LLM-Based Scorers When:

- You need semantic understanding
- You're evaluating natural language quality
- You want nuanced judgment of correctness
- You need to evaluate subjective qualities

### Performance Considerations:

- **Heuristic scorers**: Fast, no API calls, deterministic
- **LLM-based scorers**: Slower, require API calls, may vary slightly between runs

---

## Next Steps

- [Build Custom Scorers](./building-custom-scorers.md)
- [Run Offline Evaluations](./offline-evaluations.md)
- [Set Up Agent Evaluations](./live-evaluations.md)
- [Configure Datasets](./datasets.md)
