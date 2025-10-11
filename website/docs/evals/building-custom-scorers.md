# Building Custom Scorers

VoltAgent provides a scorer builder API that lets you create custom evaluation scorers with optional preparation steps, analysis steps, and scoring logic.

## Basic Structure

Create a scorer using `buildScorer`:

```typescript
import { buildScorer } from "@voltagent/core";

const myScorer = buildScorer({
  id: "custom-scorer",
  label: "Custom Scorer",
  metadata: {
    category: "custom",
  },
})
  .score(({ payload, params }) => {
    // Your scoring logic
    return 0.85;
  })
  .build();
```

The `build()` method returns a `LocalScorerDefinition` that can be used in both offline and live evaluations.

## Scorer Configuration

### Required Options

- `id` (string): Unique identifier for the scorer

### Optional Options

- `label` (string): Human-readable name (defaults to `id`)
- `description` (string): Description of what the scorer evaluates
- `metadata` (Record\<string, unknown\> | null): Additional metadata stored with results
- `sampling` (SamplingPolicy): Default sampling configuration for this scorer
- `params` (Params | (payload: Payload) => Params): Default parameters or function to derive them
- `preferJudge` (BuilderJudgeDefaults): Default LLM judge configuration for steps

## Builder Steps

Scorers can define up to four steps, executed in order:

### 1. Prepare Step

Optional preprocessing before analysis. Use for data normalization, fetching context, or extracting features.

```typescript
.prepare(({ payload, params, results }) => {
  const text = typeof payload.output === "string"
    ? payload.output
    : JSON.stringify(payload.output);
  return text.toLowerCase();
})
```

### 2. Analyze Step

Optional analysis phase. Use for LLM calls, embeddings, or external API requests that inform scoring.

```typescript
.analyze(async ({ payload, params, results }) => {
  const prepared = results.prepare; // Access prepare step output

  // Call embedding API
  const embedding = await getEmbedding(prepared);
  return embedding;
})
```

### 3. Score Step

**Required**. Returns the final score (0-1) or a score with metadata.

```typescript
.score(({ payload, params, results }) => {
  const analysis = results.analyze; // Access analyze step output

  return {
    score: 0.92,
    metadata: {
      details: "High quality response",
    },
  };
})
```

Return either:

- `number`: Score between 0 and 1
- `{ score: number; metadata?: Record<string, unknown> }`: Score with additional data

### 4. Reason Step

Optional explanation generation for the score.

```typescript
.reason(({ score, payload, params, results }) => {
  if (score >= 0.8) {
    return "Response meets quality threshold";
  }
  return "Response needs improvement";
})
```

Return either:

- `string`: Explanation text
- `{ reason: string; metadata?: Record<string, unknown> }`: Explanation with additional data

## Context Objects

Each step receives a context object with:

- `payload` (Payload): The data being evaluated
- `params` (Params): Parameters for this evaluation
- `results` (BuilderResultsSnapshot): Outputs from previous steps
  - `results.prepare`: Output from prepare step
  - `results.analyze`: Output from analyze step
  - `results.score`: Score (only in reason step)
  - `results.reason`: Reason text (only in reason step)
  - `results.raw`: All raw results from internal operations
- `judge` (BuilderJudgeDefaults | undefined): Default judge configuration if provided

## Payload Types

### Generic Scorer

```typescript
interface CustomPayload extends Record<string, unknown> {
  input: string;
  output: string;
  metadata?: Record<string, unknown>;
}

const scorer = buildScorer<CustomPayload>({
  id: "generic-scorer",
})
  .score(({ payload }) => {
    const outputLength = payload.output.length;
    return outputLength > 100 ? 1 : 0.5;
  })
  .build();
```

### Agent Scorer

For agent evaluations, use `type: "agent"` to get typed `AgentEvalContext`:

```typescript
const agentScorer = buildScorer({
  id: "agent-scorer",
  type: "agent",
})
  .score(({ payload }) => {
    // payload is AgentEvalContext with input, output, spans, runId
    const hasToolUse = payload.spans?.some((s) => s.type === "tool");
    return hasToolUse ? 1 : 0;
  })
  .build();
```

## Using Parameters

Parameters allow customization per evaluation run.

```typescript
interface KeywordParams {
  keyword: string;
  caseSensitive?: boolean;
}

const keywordScorer = buildScorer<Record<string, unknown>, KeywordParams>({
  id: "keyword-match",
  params: {
    caseSensitive: false, // default
  },
})
  .score(({ payload, params }) => {
    const output = String(payload.output);
    const keyword = params.keyword;
    const caseSensitive = params.caseSensitive ?? false;

    const match = caseSensitive
      ? output.includes(keyword)
      : output.toLowerCase().includes(keyword.toLowerCase());

    return match ? 1 : 0;
  })
  .reason(({ score, params }) => {
    return score === 1
      ? `Output contains "${params.keyword}"`
      : `Output missing "${params.keyword}"`;
  })
  .build();

// Use in offline eval
const experiment = voltagent.evals.runExperiment({
  scorers: [
    {
      scorer: keywordScorer,
      params: { keyword: "voltagent", caseSensitive: false },
    },
  ],
});

// Use in live eval
const agent = new Agent({
  eval: {
    scorers: {
      keyword: {
        scorer: keywordScorer,
        params: { keyword: "feature" },
      },
    },
  },
});
```

## Dynamic Parameters

Parameters can be derived from the payload:

```typescript
const dynamicScorer = buildScorer({
  id: "dynamic-params",
  params: (payload) => {
    // Extract expected value from payload
    return {
      expectedCategory: payload.category,
      threshold: payload.confidence ?? 0.8,
    };
  },
})
  .score(({ payload, params }) => {
    const match = payload.output === params.expectedCategory;
    return match ? 1 : 0;
  })
  .build();
```

## LLM-Based Scorers

### Using Judge Defaults

Set `preferJudge` to provide default LLM configuration for all steps:

```typescript
import { openai } from "@ai-sdk/openai";

const judgeScorer = buildScorer({
  id: "judge-scorer",
  type: "agent",
  preferJudge: {
    model: openai("gpt-4o-mini"),
    instructions: "Evaluate response quality and accuracy",
    maxOutputTokens: 200,
  },
})
  .score(async (context) => {
    const judge = await createLlmJudgeGenerateScore({
      model: context.judge!.model,
      instructions: context.judge!.instructions,
      maxOutputTokens: context.judge!.maxOutputTokens,
      context: {
        payload: context.payload,
        params: context.params,
        results: context.results.raw,
      },
    });

    return judge.score;
  })
  .build();
```

### Using Builder Prompt Steps

For structured LLM output:

```typescript
import { createBuilderPromptStep } from "@voltagent/core";
import { z } from "zod";

const classificationSchema = z.object({
  category: z.enum(["positive", "negative", "neutral"]),
  confidence: z.number().min(0).max(1),
});

const classifierScorer = buildScorer({
  id: "sentiment-classifier",
})
  .analyze(
    createBuilderPromptStep({
      model: openai("gpt-4o-mini"),
      maxOutputTokens: 100,
      schema: classificationSchema,
      buildPrompt: ({ payload }) => {
        return `Classify the sentiment of this text: "${payload.output}"\n\nRespond with JSON.`;
      },
    })
  )
  .score(({ results }) => {
    const classification = results.analyze as z.infer<typeof classificationSchema>;
    return classification.confidence;
  })
  .reason(({ results }) => {
    const classification = results.analyze as z.infer<typeof classificationSchema>;
    return `Classified as ${classification.category} (${(classification.confidence * 100).toFixed(0)}% confident)`;
  })
  .build();
```

## Embedding-Based Scorers

Use `createEmbeddingSimilarityStep` for semantic similarity:

```typescript
import { createEmbeddingSimilarityStep } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

interface SimilarityPayload {
  input: string;
  output: string;
  expected: string;
}

const similarityScorer = buildScorer<SimilarityPayload>({
  id: "semantic-similarity",
})
  .analyze(
    createEmbeddingSimilarityStep({
      model: openai.embedding("text-embedding-3-small"),
      normalize: false,
      buildInput: ({ payload }) => ({
        query: payload.output,
        references: [{ id: "expected", text: payload.expected }],
      }),
      transform: ({ items }) => {
        return items[0]?.score ?? 0;
      },
    })
  )
  .score(({ results }) => {
    const similarity = results.analyze as number;
    return Math.max(0, Math.min(1, similarity));
  })
  .build();
```

## Multi-Step Scorers

Combine preparation, analysis, and scoring:

```typescript
const complexScorer = buildScorer({
  id: "complex-scorer",
})
  .prepare(({ payload }) => {
    // Extract and normalize text
    const text = String(payload.output).toLowerCase().trim();
    return { text, wordCount: text.split(/\s+/).length };
  })
  .analyze(async ({ payload, results }) => {
    const prep = results.prepare as { text: string; wordCount: number };

    // Fetch external data
    const metadata = await fetchExternalMetadata(payload.id);

    return {
      wordCount: prep.wordCount,
      hasMetadata: Boolean(metadata),
      metadataScore: metadata?.quality ?? 0,
    };
  })
  .score(({ results }) => {
    const analysis = results.analyze as {
      wordCount: number;
      hasMetadata: boolean;
      metadataScore: number;
    };

    const lengthScore = Math.min(analysis.wordCount / 100, 1);
    const metadataScore = analysis.metadataScore;

    return lengthScore * 0.4 + metadataScore * 0.6;
  })
  .reason(({ score, results }) => {
    const analysis = results.analyze as any;
    return `Score ${score.toFixed(2)} based on ${analysis.wordCount} words and metadata quality`;
  })
  .build();
```

## Weighted Composite Scorers

Combine multiple scoring functions with `weightedBlend`:

```typescript
import { weightedBlend } from "@voltagent/core";

const compositeScorer = buildScorer({
  id: "composite",
})
  .score(
    weightedBlend([
      {
        id: "length",
        weight: 0.3,
        step: ({ payload }) => {
          const length = String(payload.output).length;
          return Math.min(length / 500, 1);
        },
      },
      {
        id: "quality",
        weight: 0.7,
        step: async ({ payload }) => {
          // Call LLM judge
          const result = await evaluateQuality(payload.output);
          return result.score;
        },
      },
    ])
  )
  .build();
```

## Error Handling

Scorer errors are captured and returned with status `"error"`:

```typescript
const errorProneScorer = buildScorer({
  id: "error-prone",
})
  .score(async ({ payload }) => {
    if (!payload.output) {
      throw new Error("Missing output field");
    }

    // If external API fails, the error is caught
    const result = await callExternalAPI(payload.output);
    return result.score;
  })
  .build();

// Result structure on error:
// {
//   status: "error",
//   score: null,
//   metadata: { ... },
//   error: Error("...")
// }
```

## Running Scorers Standalone

Use the `.run()` method for testing:

```typescript
const scorer = buildScorer({
  id: "test-scorer",
})
  .score(({ payload }) => (payload.value > 10 ? 1 : 0))
  .build();

const result = await scorer.run({
  payload: { value: 15 },
  params: {},
});

console.log(result);
// {
//   id: "test-scorer",
//   status: "success",
//   score: 1,
//   reason: undefined,
//   metadata: {},
//   durationMs: 2,
//   sampling: undefined,
//   rawResult: { status: "success", score: 1, metadata: {} },
//   payload: { value: 15 },
//   params: {},
//   steps: { raw: {}, score: 1 }
// }
```

## Prebuilt Scorer Factories

VoltAgent provides factories for common scorer patterns:

### Answer Correctness

Evaluates factual accuracy using statement classification and semantic similarity:

```typescript
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const correctnessScorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
  buildPayload: ({ payload, params }) => ({
    input: String(payload.input),
    output: String(payload.output),
    expected: String(params.expectedAnswer),
  }),
});
```

Parameters:

- `factualityWeight` (default: 0.75): Weight for statement classification
- `answerSimilarityWeight` (default: 0.25): Weight for embedding similarity
- `embeddingExpectedMin` (default: 0.7): Minimum expected similarity score
- `embeddingPrefix` (string): Prefix added to embeddings

### Answer Relevancy

Generates questions from the answer and measures similarity to the original question:

```typescript
import { createAnswerRelevancyScorer } from "@voltagent/scorers";

const relevancyScorer = createAnswerRelevancyScorer({
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

Parameters:

- `strictness` (default: 3): Number of questions to generate
- `embeddingExpectedMin` (default: 0.7): Minimum expected similarity
- `embeddingPrefix` (string): Prefix for embeddings

### Moderation

Checks content for safety violations:

```typescript
import { createModerationScorer } from "@voltagent/scorers";

const moderationScorer = createModerationScorer({
  model: openai("gpt-4o-mini"),
  threshold: 0.5,
  categories: ["hate", "harassment", "violence", "sexual", "self-harm"],
});
```

Returns score 1 (pass) if all categories are below threshold, 0 (fail) otherwise.

## Best Practices

### Keep Steps Focused

Each step should have a single responsibility:

```typescript
// Good: focused steps
.prepare(({ payload }) => normalizeText(payload.output))
.analyze(({ results }) => extractFeatures(results.prepare))
.score(({ results }) => calculateScore(results.analyze))

// Bad: doing too much in one step
.score(({ payload }) => {
  const normalized = normalizeText(payload.output);
  const features = extractFeatures(normalized);
  return calculateScore(features);
})
```

### Store Intermediate Results

Use `context.results.raw` to store data for debugging:

```typescript
.analyze(async ({ payload, results }) => {
  const apiResponse = await callAPI(payload.output);

  // Store raw response for debugging
  const raw = results.raw as Record<string, unknown>;
  raw.apiResponse = apiResponse;

  return apiResponse.analysis;
})
```

### Handle Missing Data

Check for required fields and provide defaults:

```typescript
.score(({ payload, params }) => {
  const output = payload.output ?? "";
  const threshold = params.threshold ?? 0.8;

  if (typeof output !== "string" || output.length === 0) {
    return 0;
  }

  // ... scoring logic
})
```

### Type Your Payloads

Define interfaces for clarity:

```typescript
interface EvalPayload {
  input: string;
  output: string;
  expected?: string;
}

interface EvalParams {
  threshold: number;
  strict: boolean;
}

const scorer = buildScorer<EvalPayload, EvalParams>({
  id: "typed-scorer",
  params: { threshold: 0.8, strict: false },
})
  .score(({ payload, params }) => {
    // payload and params are fully typed
    const match = payload.output === payload.expected;
    return match ? 1 : params.threshold;
  })
  .build();
```

### Avoid Heavy Computation in Prepare

Prepare steps run before sampling checks. Keep them lightweight:

```typescript
// Bad: expensive operation before sampling
.prepare(async ({ payload }) => {
  const embedding = await getEmbedding(payload.output); // Expensive!
  return embedding;
})

// Good: defer expensive work to analyze
.prepare(({ payload }) => {
  return payload.output.toLowerCase(); // Fast normalization
})
.analyze(async ({ results }) => {
  const embedding = await getEmbedding(results.prepare); // Only runs if sampled
  return embedding;
})
```

### Provide Meaningful Reasons

Explain the score in human terms:

```typescript
.reason(({ score, payload, results }) => {
  if (score >= 0.9) {
    return "Excellent response with high accuracy";
  }
  if (score >= 0.7) {
    return "Good response with minor issues";
  }
  if (score >= 0.5) {
    return "Acceptable response but needs improvement";
  }
  return "Poor response quality";
})
```

## Testing Scorers

### Unit Testing

Test scorer logic independently:

```typescript
import { describe, it, expect } from "vitest";

describe("keyword scorer", () => {
  it("should match case-insensitive keywords", async () => {
    const result = await keywordScorer.run({
      payload: { output: "This mentions VoltAgent" },
      params: { keyword: "voltagent", caseSensitive: false },
    });

    expect(result.score).toBe(1);
    expect(result.status).toBe("success");
  });

  it("should respect case-sensitive flag", async () => {
    const result = await keywordScorer.run({
      payload: { output: "This mentions voltagent" },
      params: { keyword: "VoltAgent", caseSensitive: true },
    });

    expect(result.score).toBe(0);
  });
});
```

### Integration Testing

Test with real evaluation runs:

```typescript
const testExperiment = await voltagent.evals.runExperiment({
  datasetItems: [{ input: "Test question", expected: "Expected answer" }],
  target: async ({ input }) => {
    return { output: "Test output" };
  },
  scorers: [myCustomScorer],
});

const results = await testExperiment.results();
expect(results.runs[0].scorerResults[0].score).toBeGreaterThan(0.5);
```
