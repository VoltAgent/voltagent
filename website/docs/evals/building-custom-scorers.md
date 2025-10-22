# Building Custom Scorers

Custom scorers allow you to evaluate your agent's outputs based on your specific requirements. Whether you need simple heuristic checks or sophisticated LLM-based evaluations, VoltAgent provides a flexible pipeline for building custom scorers.

## When to Use Custom Scorers

Custom scorers are ideal when:

- Built-in scorers don't match your evaluation criteria
- You need domain-specific evaluation logic
- You want to combine multiple evaluation methods
- You need custom thresholds or scoring scales

## The 4-Step Scorer Pipeline

VoltAgent's `buildScorer` provides a fluent API with four optional steps that execute in sequence:

### Step 1: Prepare (Optional)

Transform or validate the input payload before scoring.

```typescript
.prepare(({ payload }) => {
  // Clean and validate inputs
  const text = String(payload.output || "").trim();
  const minWords = Number(payload.minWords || 5);

  return { text, minWords };
})
```

### Step 2: Analyze (Optional)

Extract features or perform analysis on the prepared data.

```typescript
.analyze(({ prepared }) => {
  // Extract features from prepared data
  const wordCount = prepared.text.split(/\s+/).length;
  const hasMinWords = wordCount >= prepared.minWords;

  return { wordCount, hasMinWords };
})
```

### Step 3: Score (Required)

Calculate the actual score based on your evaluation logic.

```typescript
.score(({ payload, prepared, analysis }) => {
  // Calculate score (0.0 to 1.0)
  const score = analysis.hasMinWords ? 1.0 : 0.0;

  return {
    score,
    metadata: { wordCount: analysis.wordCount }
  };
})
```

### Step 4: Reason (Optional)

Generate human-readable explanations for the score.

```typescript
.reason(({ payload, score, metadata }) => {
  // Provide explanation
  const passed = score >= 0.5;
  return passed
    ? `Output meets minimum word requirement (${metadata.wordCount} words)`
    : `Output too short (${metadata.wordCount} words, need ${payload.minWords})`;
})
```

## Complete Example: Sentiment Analyzer

Let's build a sentiment analyzer that evaluates whether responses maintain appropriate positivity:

```typescript
import { buildScorer } from "@voltagent/core";

const sentimentScorer = buildScorer({
  id: "sentiment-analyzer",
  label: "Sentiment Analyzer",
  description: "Evaluates response sentiment and positivity",
})
  .prepare(({ payload }) => {
    // Step 1: Clean and prepare the text
    const text = String(payload.output || "")
      .toLowerCase()
      .trim();
    const targetSentiment = String(payload.targetSentiment || "positive");

    return { text, targetSentiment };
  })
  .analyze(({ results }) => {
    // Step 2: Analyze sentiment indicators
    const prepared = results.prepare as { text: string; targetSentiment: string };
    const positiveWords = ["great", "excellent", "happy", "wonderful", "fantastic"];
    const negativeWords = ["bad", "terrible", "awful", "horrible", "poor"];

    const positiveCount = positiveWords.filter((word) => prepared.text.includes(word)).length;

    const negativeCount = negativeWords.filter((word) => prepared.text.includes(word)).length;

    const sentiment =
      positiveCount > negativeCount
        ? "positive"
        : negativeCount > positiveCount
          ? "negative"
          : "neutral";

    return {
      sentiment,
      positiveCount,
      negativeCount,
      matchesTarget: sentiment === prepared.targetSentiment,
    };
  })
  .score(({ results }) => {
    // Step 3: Calculate score based on sentiment match
    const analysis = results.analyze as {
      sentiment: string;
      positiveCount: number;
      negativeCount: number;
      matchesTarget: boolean;
    };
    const score = analysis.matchesTarget ? 1.0 : 0.0;

    return {
      score,
      metadata: {
        detectedSentiment: analysis.sentiment,
        positiveWords: analysis.positiveCount,
        negativeWords: analysis.negativeCount,
      },
    };
  })
  .reason(({ score, results }) => {
    // Step 4: Explain the scoring decision
    const prepared = results.prepare as { text: string; targetSentiment: string };
    const metadata = results.raw as any;

    if (score === 1.0) {
      return (
        `Sentiment matches target (${prepared.targetSentiment}). ` +
        `Found ${metadata.positiveWords} positive and ${metadata.negativeWords} negative indicators.`
      );
    }

    return (
      `Sentiment mismatch. Expected ${prepared.targetSentiment} but detected ${metadata.detectedSentiment}. ` +
      `Found ${metadata.positiveWords} positive and ${metadata.negativeWords} negative indicators.`
    );
  })
  .build();
```

### Example Outputs

Given different inputs, here's what our sentiment scorer produces:

**Input 1: Positive Response**

```typescript
await sentimentScorer.run({
  payload: {
    output: "This is a fantastic solution! Great work on the implementation.",
    targetSentiment: "positive"
  },
  params: {}
});

// Result:
{
  score: 1.0,
  metadata: {
    detectedSentiment: "positive",
    positiveWords: 2,
    negativeWords: 0
  },
  reason: "Sentiment matches target (positive). Found 2 positive and 0 negative indicators."
}
```

**Input 2: Sentiment Mismatch**

```typescript
await sentimentScorer.run({
  payload: {
    output: "This approach seems problematic and could cause terrible issues.",
    targetSentiment: "positive"
  },
  params: {}
});

// Result:
{
  score: 0.0,
  metadata: {
    detectedSentiment: "negative",
    positiveWords: 0,
    negativeWords: 1
  },
  reason: "Sentiment mismatch. Expected positive but detected negative. Found 0 positive and 1 negative indicators."
}
```

## Scorer Types

### 1. Heuristic Scorers

Rule-based evaluation without external dependencies:

```typescript
const lengthScorer = buildScorer({
  id: "length-check",
  label: "Length Validator",
})
  .score(({ payload }) => {
    const length = String(payload.output || "").length;
    const maxLength = Number(payload.maxLength || 100);
    return {
      score: length <= maxLength ? 1.0 : 0.0,
      metadata: { length, maxLength },
    };
  })
  .build();
```

### 2. LLM-Based Scorers

Leverage language models for sophisticated evaluation:

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const QUALITY_SCHEMA = z.object({
  score: z.number().min(0).max(10),
  reason: z.string(),
});

const qualityScorer = buildScorer({
  id: "quality-check",
  label: "Response Quality",
})
  .analyze(async ({ payload }) => {
    const agent = new Agent({
      name: "quality-evaluator",
      model: openai("gpt-4o-mini"),
      instructions: "You evaluate response quality on a scale of 0-10",
    });

    const prompt = `Rate the quality of this response: ${payload.output}`;
    const result = await agent.generateObject(prompt, QUALITY_SCHEMA);

    return result.object;
  })
  .score(({ results }) => {
    const analysis = results.analyze as z.infer<typeof QUALITY_SCHEMA>;
    return {
      score: analysis.score / 10,
      metadata: { rating: analysis.score, reason: analysis.reason },
    };
  })
  .build();
```

### 3. Hybrid Scorers

Combine multiple evaluation methods:

```typescript
const hybridScorer = buildScorer({
  id: "hybrid-validator",
  label: "Comprehensive Validator",
})
  .analyze(({ payload }) => {
    // Heuristic checks
    const hasProperLength = String(payload.output || "").length >= 50;
    const hasNoErrors = !String(payload.output || "").includes("error");

    // Could add LLM analysis here
    return { hasProperLength, hasNoErrors };
  })
  .score(({ results }) => {
    // Combine multiple criteria
    const analysis = results.analyze as { hasProperLength: boolean; hasNoErrors: boolean };
    const lengthScore = analysis.hasProperLength ? 0.5 : 0;
    const errorScore = analysis.hasNoErrors ? 0.5 : 0;

    return {
      score: lengthScore + errorScore,
      metadata: analysis,
    };
  })
  .build();
```

## Using Custom Scorers

### In Offline Evaluations

```typescript
import { createExperiment } from "@voltagent/evals";

export default createExperiment({
  dataset: { name: "customer-support" },
  experiment: { name: "sentiment-test" },
  runner: async ({ item }) => ({
    output: await generateResponse(item.input),
  }),
  scorers: [
    sentimentScorer,
    {
      scorer: lengthScorer,
      params: { maxLength: 200 },
      threshold: 1.0,
    },
  ],
});
```

### In Agent Evaluations

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "support-agent",
  model: openai("gpt-4o-mini"),
  eval: {
    scorers: {
      sentiment: {
        scorer: sentimentScorer,
        params: { targetSentiment: "positive" },
      },
    },
    sampling: { rate: 0.1 }, // Sample 10% of requests
  },
});
```

## Best Practices

### 1. Type Safety

Define clear interfaces for your scorer payloads:

```typescript
interface SentimentPayload {
  output: string;
  targetSentiment: "positive" | "negative" | "neutral";
}

const typedScorer = buildScorer<SentimentPayload>({
  id: "typed-sentiment",
  label: "Typed Sentiment",
})
  .score(({ payload }) => {
    // TypeScript knows payload structure
    const isPositive = payload.targetSentiment === "positive";
    return { score: isPositive ? 1.0 : 0.0 };
  })
  .build();
```

### 2. Error Handling

Make your scorers resilient to unexpected inputs:

```typescript
.prepare(({ payload }) => {
  try {
    const text = String(payload.output || "");
    if (!text) throw new Error("Empty output");
    return { text };
  } catch (error) {
    return { text: "", error: error.message };
  }
})
```

### 3. Performance Optimization

- Use `prepare` to validate and clean data once
- Cache expensive computations in `analyze`
- Keep `score` lightweight for fast execution
- Use `reason` only when explanations are needed

### 4. Testing Your Scorers

```typescript
import { describe, it, expect } from "vitest";

describe("sentimentScorer", () => {
  it("detects positive sentiment", async () => {
    const result = await sentimentScorer.run({
      payload: {
        output: "This is excellent!",
        targetSentiment: "positive",
      },
      params: {},
    });

    expect(result.score).toBe(1.0);
    expect(result.metadata.detectedSentiment).toBe("positive");
  });

  it("handles empty input", async () => {
    const result = await sentimentScorer.run({
      payload: {
        output: "",
        targetSentiment: "positive",
      },
      params: {},
    });

    expect(result.score).toBeDefined();
    expect(result.reason).toContain("neutral");
  });
});
```

## Pipeline Visualization

The scorer pipeline flows through each step sequentially:

```
Input Payload
     ↓
┌─────────────┐
│   Prepare   │ → Transform & validate input
└─────────────┘
     ↓
┌─────────────┐
│   Analyze   │ → Extract features & insights
└─────────────┘
     ↓
┌─────────────┐
│    Score    │ → Calculate numeric score (0-1)
└─────────────┘
     ↓
┌─────────────┐
│   Reason    │ → Generate explanation
└─────────────┘
     ↓
Final Result
```

Each step has access to:

- `payload`: Original input data
- `params`: Parameters for this evaluation
- `results`: Outputs from previous steps
  - `results.prepare`: Output from prepare step
  - `results.analyze`: Output from analyze step
  - `results.raw`: All raw results for debugging

## Advanced Patterns

### Using Parameters

Parameters allow customization per evaluation run:

```typescript
interface KeywordParams {
  keyword: string;
  caseSensitive?: boolean;
}

const keywordScorer = buildScorer<Record<string, unknown>, KeywordParams>({
  id: "keyword-match",
  params: { caseSensitive: false }, // default
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
  .build();
```

### Dynamic Parameters

Parameters can be derived from the payload:

```typescript
const dynamicScorer = buildScorer({
  id: "dynamic-params",
  params: (payload) => ({
    expectedCategory: payload.category,
    threshold: payload.confidence ?? 0.8,
  }),
})
  .score(({ payload, params }) => {
    const match = payload.output === params.expectedCategory;
    return match ? 1 : 0;
  })
  .build();
```

### Weighted Composite Scorers

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

## Next Steps

- Explore [pre-built scorers](./prebuilt-scorers.md) for common evaluation needs
- Learn about [offline evaluations](./offline-evaluations.md) for batch testing
- Configure [Agent evaluations](./live-evaluations.md) for real-time monitoring
