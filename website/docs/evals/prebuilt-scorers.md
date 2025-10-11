# Prebuilt Scorers

VoltAgent provides prebuilt scorers for common evaluation scenarios. These scorers are production-ready and can be used in both offline and live evaluations.

## RAG Scorers

### Answer Correctness

Evaluates factual accuracy by classifying statements as true positive (TP), false positive (FP), or false negative (FN), then combining with semantic similarity.

```typescript
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
  buildPayload: ({ payload, params }) => ({
    input: String(payload.input),
    output: String(payload.output),
    expected: String(params.expectedAnswer),
  }),
});
```

**Payload Fields:**

- `input` (unknown): The question
- `output` (unknown): The answer to evaluate
- `expected` (unknown): The ground truth answer

**Parameters:**

- `factualityWeight` (number, default: 0.75): Weight for statement classification
- `answerSimilarityWeight` (number, default: 0.25): Weight for embedding similarity
- `embeddingExpectedMin` (number, default: 0.7): Minimum expected similarity score
- `embeddingPrefix` (string): Prefix added to text before embedding

**Score:** Weighted average of factuality F1 score and semantic similarity (0-1)

**Metadata:**

```typescript
{
  factuality: {
    truePositive: string[];    // Statements in both answer and ground truth
    falsePositive: string[];   // Statements in answer but not ground truth
    falseNegative: string[];   // Statements in ground truth but not answer
    f1Score: number;
  };
  similarity: {
    score: number;       // Scaled similarity score
    rawScore: number;    // Raw cosine similarity
    usage: number;       // Embedding tokens used
  } | null;
  weights: {
    factuality: number;
    similarity: number;
  };
}
```

**Use Case:** Verify RAG systems produce factually accurate answers compared to expected output.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      input: "What is the capital of France?",
      expected: "Paris is the capital of France.",
    },
    {
      input: "Who wrote Romeo and Juliet?",
      expected: "William Shakespeare wrote Romeo and Juliet.",
    },
  ],
  target: async ({ input }) => {
    const result = await agent.generateText(input);
    return { output: result.text };
  },
  scorers: [
    {
      scorer,
      params: {
        factualityWeight: 0.75,
        answerSimilarityWeight: 0.25,
      },
    },
  ],
});

const results = await experiment.results();
console.log(results.runs[0].scorerResults[0]);
// {
//   scorerId: "answerCorrectness",
//   score: 0.92,
//   metadata: {
//     factuality: { TP: [...], FP: [], FN: [], f1Score: 0.95 },
//     similarity: { score: 0.88, rawScore: 0.91, usage: 24 }
//   }
// }
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { Agent } from "@voltagent/core";
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "support-agent",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    environment: "prod",
    sampling: { type: "ratio", rate: 0.1 },
    scorers: {
      correctness: {
        scorer: createAnswerCorrectnessScorer({
          model: openai("gpt-4o-mini"),
          embeddingModel: openai.embedding("text-embedding-3-small"),
        }),
        params: ({ input }) => ({
          // Dynamically set expected answer based on input
          expectedAnswer: getGroundTruth(input),
        }),
      },
    },
  },
});

// Scores are automatically logged to observability
const result = await agent.generateText("What is the capital of France?");
```

</TabItem>
</Tabs>

---

### Answer Relevancy

Generates questions from the answer, then measures how similar they are to the original question.

```typescript
import { createAnswerRelevancyScorer } from "@voltagent/scorers";

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

- `input` (unknown): The original question
- `output` (unknown): The answer to evaluate
- `context` (unknown): Reference context for the answer

**Parameters:**

- `strictness` (number, default: 3): Number of questions to generate
- `embeddingExpectedMin` (number, default: 0.7): Minimum expected similarity
- `embeddingPrefix` (string): Prefix for embeddings

**Score:** Average similarity between generated questions and original question. Returns 0 if answer is noncommittal (0-1)

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

**Use Case:** Detect answers that don't actually address the question asked.

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createAnswerRelevancyScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerRelevancyScorer({
  model: openai("gpt-4o-mini"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
  strictness: 3,
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      input: "How do I reset my password?",
      context: "Users can reset passwords by clicking 'Forgot Password' on the login page.",
    },
  ],
  target: async ({ input }) => {
    const result = await agent.generateText(input);
    return { output: result.text };
  },
  scorers: [scorer],
});

const results = await experiment.results();
console.log(results.runs[0].scorerResults[0].metadata);
// {
//   strictness: 3,
//   questions: [
//     { question: "How can users reset their passwords?", noncommittal: false },
//     { question: "What is the process for password reset?", noncommittal: false },
//     { question: "Where do I find password reset?", noncommittal: false }
//   ],
//   similarity: [...],
//   noncommittal: false
// }
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { Agent } from "@voltagent/core";
import { createAnswerRelevancyScorer } from "@voltagent/scorers";

const agent = new Agent({
  name: "qa-agent",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    scorers: {
      relevancy: {
        scorer: createAnswerRelevancyScorer({
          model: openai("gpt-4o-mini"),
          embeddingModel: openai.embedding("text-embedding-3-small"),
          strictness: 3,
        }),
        sampling: { type: "ratio", rate: 0.2 },
      },
    },
  },
});

// Automatically evaluates 20% of responses
await agent.generateText("How do I reset my password?");
```

</TabItem>
</Tabs>

---

### Answer Similarity

Measures semantic similarity between the output and expected answer using embeddings.

```typescript
import { createAnswerSimilarityScorer } from "@voltagent/scorers";

const scorer = createAnswerSimilarityScorer({
  embeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingExpectedMin: 0.7,
  buildPayload: ({ payload }) => ({
    output: String(payload.output),
    expected: String(payload.expected),
  }),
});
```

**Payload Fields:**

- `output` (unknown): The answer to evaluate
- `expected` (unknown): The ground truth answer

**Parameters:**

- `embeddingExpectedMin` (number, default: 0.7): Minimum expected similarity for scaling
- `embeddingPrefix` (string): Prefix added before embedding

**Score:** Scaled cosine similarity between output and expected (0-1)

**Metadata:**

```typescript
{
  similarity: {
    score: number; // Scaled similarity
    rawScore: number; // Raw cosine similarity
    usage: number; // Embedding tokens
  }
}
```

**Use Case:** Quick semantic comparison without statement-level analysis.

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createAnswerSimilarityScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const scorer = createAnswerSimilarityScorer({
  embeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingExpectedMin: 0.7,
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      output: "The capital of France is Paris.",
      expected: "Paris is the capital city of France.",
    },
  ],
  target: async ({ input }) => {
    return { output: await agent.generateText(input).then((r) => r.text) };
  },
  scorers: [scorer],
});

const results = await experiment.results();
console.log(results.runs[0].scorerResults[0]);
// {
//   scorerId: "answerSimilarity",
//   score: 0.94,
//   metadata: {
//     similarity: { score: 0.94, rawScore: 0.91, usage: 18 }
//   }
// }
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { createAnswerSimilarityScorer } from "@voltagent/scorers";

const agent = new Agent({
  name: "assistant",
  model: openai("gpt-4o"),
  eval: {
    scorers: {
      similarity: {
        scorer: createAnswerSimilarityScorer({
          embeddingModel: openai.embedding("text-embedding-3-small"),
        }),
        params: ({ input }) => ({
          // Get expected answer from knowledge base
          expected: await knowledgeBase.getAnswer(input),
        }),
      },
    },
  },
});
```

</TabItem>
</Tabs>

---

### Context Precision

Verifies if the provided context was useful for arriving at the answer.

```typescript
import { createContextPrecisionScorer } from "@voltagent/scorers";

const scorer = createContextPrecisionScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    expected: String(payload.expected),
    context: String(payload.context),
  }),
});
```

**Payload Fields:**

- `input` (unknown): The question
- `expected` (unknown): The answer
- `context` (unknown): Retrieved context

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for LLM response

**Score:** Binary verdict (0 or 1)

**Metadata:**

```typescript
{
  reason: string; // Explanation for the verdict
  verdict: number; // 1 if useful, 0 if not
}
```

**Use Case:** Evaluate retrieval quality in RAG systems.

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createContextPrecisionScorer } from "@voltagent/scorers";

const scorer = createContextPrecisionScorer({
  model: openai("gpt-4o-mini"),
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      input: "What is the capital of France?",
      expected: "Paris",
      context: "Paris is the capital and largest city of France. It is located in northern France.",
    },
  ],
  target: async ({ input, context }) => {
    const result = await ragAgent.generateText(input, { context });
    return { output: result.text, context };
  },
  scorers: [scorer],
});

const results = await experiment.results();
console.log(results.runs[0].scorerResults[0]);
// { score: 1, metadata: { verdict: 1, reason: "Context provided relevant information" } }
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { createContextPrecisionScorer } from "@voltagent/scorers";

const agent = new Agent({
  name: "rag-agent",
  model: openai("gpt-4o"),
  eval: {
    scorers: {
      precision: {
        scorer: createContextPrecisionScorer({
          model: openai("gpt-4o-mini"),
        }),
        sampling: { type: "ratio", rate: 0.1 },
      },
    },
  },
});

// Context precision automatically evaluated
const result = await agent.generateText("What is the capital of France?", {
  context: retrievedDocs,
});
```

</TabItem>
</Tabs>

---

### Context Recall

Classifies statements in the answer as attributed or not attributed to the context.

```typescript
import { createContextRecallScorer } from "@voltagent/scorers";

const scorer = createContextRecallScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    expected: String(payload.expected),
    context: String(payload.context),
  }),
});
```

**Payload Fields:**

- `input` (unknown): The question
- `expected` (unknown): The answer
- `context` (unknown): Retrieved context

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for LLM response

**Score:** Ratio of attributed statements to total statements (0-1)

**Metadata:**

```typescript
{
  statements: Array<{
    statement: string;
    attributed: number; // 1 if attributed, 0 if not
    reason: string;
  }>;
}
```

**Use Case:** Detect hallucinations by identifying statements not supported by context.

---

### Context Relevancy

Extracts sentences from the context relevant to answering the question.

```typescript
import { createContextRelevancyScorer } from "@voltagent/scorers";

const scorer = createContextRelevancyScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    input: String(payload.input),
    context: String(payload.context),
  }),
});
```

**Payload Fields:**

- `input` (unknown): The question
- `context` (unknown): Retrieved context

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for LLM response

**Score:** Ratio of relevant context length to total context length (0-1)

**Metadata:**

```typescript
{
  sentences: Array<{
    sentence: string;
    reasons: string[];
  }>;
  coverageRatio: number;
}
```

**Use Case:** Measure how much of retrieved context is actually relevant.

---

### Context Entity Recall

Extracts entities from expected answer and context, then calculates recall.

```typescript
import { createContextEntityRecallScorer } from "@voltagent/scorers";

const scorer = createContextEntityRecallScorer({
  model: openai("gpt-4o-mini"),
  buildPayload: ({ payload }) => ({
    expected: String(payload.expected),
    context: String(payload.context),
  }),
});
```

**Payload Fields:**

- `expected` (unknown): The ground truth answer
- `context` (unknown): Retrieved context

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for LLM entity extraction

**Score:** Recall of entities (entities in context / entities in expected) (0-1)

**Metadata:**

```typescript
{
  expectedEntities: string[];
  contextEntities: string[];
}
```

**Use Case:** Verify retrieval includes key entities from expected answer.

---

## Classification Scorers

### Factuality

Compares submitted answer to expert answer using multiple-choice classification.

```typescript
import { createFactualityScorer } from "@voltagent/scorers";

const scorer = createFactualityScorer({
  model: openai("gpt-4o-mini"),
});
```

**Payload Fields:**

- `input` (unknown): The question
- `output` (unknown): The submission
- `expected` (unknown): The expert answer

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for judge response

**Score:**

- 0.4: Submission is subset of expert and consistent
- 0.6: Submission is superset of expert and consistent
- 1.0: Submission matches expert OR differences don't affect factuality
- 0.0: Submission conflicts with expert

**Metadata:**

```typescript
{
  choice: "A" | "B" | "C" | "D" | "E";
  reason: string;
  raw: unknown;
}
```

**Use Case:** Grade answers against reference answers with nuanced scoring.

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createFactualityScorer } from "@voltagent/scorers";

const scorer = createFactualityScorer({
  model: openai("gpt-4o-mini"),
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      input: "What year was the Eiffel Tower completed?",
      expected: "The Eiffel Tower was completed in 1889.",
    },
  ],
  target: async ({ input }) => {
    return { output: await agent.generateText(input).then((r) => r.text) };
  },
  scorers: [scorer],
});

const results = await experiment.results();
console.log(results.runs[0].scorerResults[0]);
// {
//   score: 1.0,  // C: Matches the expert answer
//   metadata: {
//     choice: "C",
//     reason: "Both mention 1889 as completion year"
//   }
// }
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { createFactualityScorer } from "@voltagent/scorers";

const agent = new Agent({
  name: "knowledge-agent",
  model: openai("gpt-4o"),
  eval: {
    scorers: {
      factuality: {
        scorer: createFactualityScorer({
          model: openai("gpt-4o-mini"),
        }),
        params: ({ input }) => ({
          expected: getExpertAnswer(input),
        }),
        sampling: { type: "count", limit: 100 },
      },
    },
  },
});
```

</TabItem>
</Tabs>

---

### Summary

Compares two summaries (expert vs submission) of the same text.

```typescript
import { createSummaryScorer } from "@voltagent/scorers";

const scorer = createSummaryScorer({
  model: openai("gpt-4o-mini"),
});
```

**Payload Fields:**

- `input` (unknown): The original text
- `output` (unknown): The submission summary
- `expected` (unknown): The expert summary

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for judge response

**Score:**

- 1.0: Submission summary (B) is preferred
- 0.0: Expert summary (A) is preferred

**Metadata:**

```typescript
{
  choice: "A" | "B";
  reason: string;
  raw: unknown;
}
```

**Use Case:** Evaluate summarization quality compared to reference.

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createSummaryScorer } from "@voltagent/scorers";

const scorer = createSummaryScorer({
  model: openai("gpt-4o-mini"),
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      input: "Long article text here...",
      expected: "Expert summary of the article.",
    },
  ],
  target: async ({ input }) => {
    const summary = await agent.generateText(`Summarize: ${input}`);
    return { output: summary.text };
  },
  scorers: [scorer],
});

const results = await experiment.results();
console.log(results.runs[0].scorerResults[0]);
// {
//   score: 1.0,  // B: Submission preferred
//   metadata: {
//     choice: "B",
//     reason: "More concise and captures key points"
//   }
// }
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { createSummaryScorer } from "@voltagent/scorers";

const agent = new Agent({
  name: "summarizer",
  model: openai("gpt-4o"),
  instructions: "Summarize the provided text concisely.",
  eval: {
    scorers: {
      quality: {
        scorer: createSummaryScorer({
          model: openai("gpt-4o-mini"),
        }),
        params: ({ input }) => ({
          expected: await getExpertSummary(input),
        }),
        sampling: { type: "ratio", rate: 0.05 },
      },
    },
  },
});
```

</TabItem>
</Tabs>

---

### Translation

Compares submission translation to expert translation.

```typescript
import { createTranslationScorer } from "@voltagent/scorers";

const scorer = createTranslationScorer({
  model: openai("gpt-4o-mini"),
});

// Use with language parameter
await voltagent.evals.runExperiment({
  scorers: [
    {
      scorer,
      params: { language: "French" },
    },
  ],
});
```

**Payload Fields:**

- `input` (unknown): The original sentence
- `output` (unknown): The submission translation
- `expected` (unknown): The expert translation

**Parameters:**

- `language` (string): Source language (used in prompt)
- `maxOutputTokens` (number): Maximum tokens for judge response

**Score:**

- 1.0: Submission matches expert translation
- 0.0: Submission differs from expert translation

**Metadata:**

```typescript
{
  choice: "Y" | "N";
  reason: string;
  raw: unknown;
}
```

**Use Case:** Validate translation accuracy.

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createTranslationScorer } from "@voltagent/scorers";

const scorer = createTranslationScorer({
  model: openai("gpt-4o-mini"),
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      input: "Bonjour, comment allez-vous?",
      expected: "Hello, how are you?",
    },
    {
      input: "Je m'appelle Claude.",
      expected: "My name is Claude.",
    },
  ],
  target: async ({ input }) => {
    const translation = await agent.generateText(`Translate to English: ${input}`);
    return { output: translation.text };
  },
  scorers: [
    {
      scorer,
      params: { language: "French" },
    },
  ],
});

const results = await experiment.results();
results.runs.forEach((run) => {
  const result = run.scorerResults[0];
  console.log({
    score: result.score, // 1 = match, 0 = differs
    choice: result.metadata.choice,
    reason: result.metadata.reason,
  });
});
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { createTranslationScorer } from "@voltagent/scorers";

const agent = new Agent({
  name: "translator",
  model: openai("gpt-4o"),
  instructions: "Translate the provided text to English.",
  eval: {
    scorers: {
      accuracy: {
        scorer: createTranslationScorer({
          model: openai("gpt-4o-mini"),
        }),
        params: ({ input }) => ({
          language: detectLanguage(input),
          expected: getGroundTruthTranslation(input),
        }),
        sampling: { type: "ratio", rate: 0.1 },
      },
    },
  },
});

// Translation quality evaluated on 10% of requests
const result = await agent.generateText("Bonjour, comment allez-vous?");
```

</TabItem>
</Tabs>

---

### Humor

Determines if text is humorous.

```typescript
import { createHumorScorer } from "@voltagent/scorers";

const scorer = createHumorScorer({
  model: openai("gpt-4o-mini"),
});
```

**Payload Fields:**

- `output` (unknown): The text to evaluate

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for judge response

**Score:**

- 1.0: Humorous
- 0.5: Uncertain
- 0.0: Not humorous

**Metadata:**

```typescript
{
  choice: "YES" | "NO" | "UNSURE";
  reason: string;
  raw: unknown;
}
```

**Use Case:** Filter or score creative content for humor.

---

### Possible

Determines if submission claims task is impossible or provides guidance.

```typescript
import { createPossibleScorer } from "@voltagent/scorers";

const scorer = createPossibleScorer({
  model: openai("gpt-4o-mini"),
});
```

**Payload Fields:**

- `input` (unknown): The task
- `output` (unknown): The submission

**Parameters:**

- `maxOutputTokens` (number): Maximum tokens for judge response

**Score:**

- 1.0: Submission provides guidance or solution
- 0.0: Submission declares task impossible

**Metadata:**

```typescript
{
  choice: "A" | "B";
  reason: string;
  raw: unknown;
}
```

**Use Case:** Detect when AI refuses tasks it should attempt.

---

## Safety Scorers

### Moderation

Checks content for safety violations across multiple categories.

```typescript
import { createModerationScorer } from "@voltagent/scorers";

const scorer = createModerationScorer({
  model: openai("gpt-4o-mini"),
  threshold: 0.5,
  categories: [
    "hate",
    "hate/threatening",
    "harassment",
    "harassment/threatening",
    "self-harm",
    "self-harm/intent",
    "self-harm/instructions",
    "sexual",
    "sexual/minors",
    "violence",
    "violence/graphic",
  ],
});
```

**Payload Fields:**

- `output` (unknown): The content to moderate

**Parameters:**

- None (configured at scorer creation)

**Score:**

- 1.0: Content passes moderation (all scores below threshold)
- 0.0: Content flagged (any score at or above threshold)

**Metadata:**

```typescript
{
  voltAgent: {
    scorer: string;
    threshold: number;
    flagged: boolean;
    maxScore: number;
    thresholdPassed: boolean;
  };
  moderation: {
    flagged: boolean;
    scores: Record<string, number>;  // Category scores 0-1
    raw: unknown;
    reason?: string;
  };
}
```

**Options:**

- `threshold` (number, default: 0.5): Score threshold for flagging
- `categories` (string[]): Categories to check (defaults to 11 standard categories)
- `buildPrompt` (function): Custom prompt builder

**Use Case:** Filter unsafe content in production.

<Tabs>
<TabItem value="offline" label="Offline Eval" default>

```typescript
import { createModerationScorer } from "@voltagent/scorers";

const scorer = createModerationScorer({
  model: openai("gpt-4o-mini"),
  threshold: 0.5,
  categories: ["hate", "harassment", "violence", "sexual", "self-harm"],
});

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [{ output: "How can I help you today?" }, { output: "I want to hurt someone" }],
  target: async ({ input }) => {
    return { output: await agent.generateText(input).then((r) => r.text) };
  },
  scorers: [scorer],
});

const results = await experiment.results();
results.runs.forEach((run) => {
  const modResult = run.scorerResults.find((r) => r.scorerId === "moderation");
  console.log({
    score: modResult.score, // 1 = pass, 0 = fail
    flagged: modResult.metadata.moderation.flagged,
    scores: modResult.metadata.moderation.scores,
  });
});
```

</TabItem>
<TabItem value="live" label="Live Eval">

```typescript
import { createModerationScorer } from "@voltagent/scorers";

const agent = new Agent({
  name: "chat-agent",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    scorers: {
      safety: {
        scorer: createModerationScorer({
          model: openai("gpt-4o-mini"),
          threshold: 0.5,
        }),
        // Check every response
        sampling: { type: "ratio", rate: 1 },
        onResult: async ({ score, metadata }) => {
          if (score === 0) {
            // Content flagged - take action
            await alertSecurityTeam({
              flagged: metadata.moderation.flagged,
              categories: metadata.moderation.scores,
            });
          }
        },
      },
    },
  },
});

// Moderation runs on every response
const result = await agent.generateText(userMessage);
```

</TabItem>
</Tabs>

---

## Using Prebuilt Scorers

### In Offline Evaluations

```typescript
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";

const experiment = await voltagent.evals.runExperiment({
  datasetItems: [
    {
      input: "What is the capital of France?",
      expected: "Paris",
    },
  ],
  target: async ({ input }) => {
    const result = await agent.generateText(input);
    return { output: result.text };
  },
  scorers: [
    {
      scorer: createAnswerCorrectnessScorer({
        model: openai("gpt-4o-mini"),
        embeddingModel: openai.embedding("text-embedding-3-small"),
      }),
      params: {
        factualityWeight: 0.8,
        answerSimilarityWeight: 0.2,
      },
    },
  ],
});
```

### In Live Evaluations

```typescript
const agent = new Agent({
  name: "support",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    scorers: {
      moderation: {
        scorer: createModerationScorer({
          model: openai("gpt-4o-mini"),
          threshold: 0.5,
        }),
        sampling: { type: "ratio", rate: 1 },
      },
      relevancy: {
        scorer: createAnswerRelevancyScorer({
          model: openai("gpt-4o-mini"),
          embeddingModel: openai.embedding("text-embedding-3-small"),
        }),
        sampling: { type: "ratio", rate: 0.1 },
      },
    },
  },
});
```

### Custom Payload Mapping

All scorers accept `buildPayload` to map your data structure:

```typescript
const scorer = createAnswerCorrectnessScorer({
  model: openai("gpt-4o-mini"),
  embeddingModel: openai.embedding("text-embedding-3-small"),
  buildPayload: ({ payload, params }) => {
    // Map your custom structure
    return {
      input: payload.userQuery,
      output: payload.agentResponse.text,
      expected: params.groundTruth,
    };
  },
});
```

### Combining Scorers

Run multiple scorers in parallel:

```typescript
const experiment = await voltagent.evals.runExperiment({
  datasetItems: [...],
  target: myAgent,
  scorers: [
    createAnswerCorrectnessScorer({ /* ... */ }),
    createAnswerRelevancyScorer({ /* ... */ }),
    createContextPrecisionScorer({ /* ... */ }),
    createContextRecallScorer({ /* ... */ }),
    createModerationScorer({ /* ... */ }),
  ],
});
```

Each scorer runs independently and produces its own score and metadata.

## AutoEval Scorers

VoltAgent also exposes AutoEval scorers directly via the `scorers` export:

```typescript
import { scorers } from "@voltagent/scorers";

// Use prebuilt AutoEval definitions
const experiment = await voltagent.evals.runExperiment({
  scorers: [
    scorers.factual,
    scorers.moderation,
    scorers.answerCorrectness,
    scorers.levenshtein,
    scorers.exactMatch,
  ],
});
```

Available AutoEval scorers:

- `factual`: Factuality comparison
- `moderation`: Content moderation
- `sql`: SQL query validation
- `summary`: Summary comparison
- `translation`: Translation comparison
- `answerCorrectness`: Answer correctness
- `answerRelevancy`: Answer relevancy
- `answerSimilarity`: Answer similarity
- `contextEntityRecall`: Context entity recall
- `contextPrecision`: Context precision
- `contextRecall`: Context recall
- `contextRelevancy`: Context relevancy
- `possible`: Task possibility
- `embeddingSimilarity`: Embedding similarity
- `listContains`: List containment
- `numericDiff`: Numeric difference
- `jsonDiff`: JSON difference
- `humor`: Humor detection
- `exactMatch`: Exact string match
- `levenshtein`: Levenshtein distance

These are lower-level wrappers around the AutoEval library. For production use, prefer the `create*Scorer` functions which provide better TypeScript types and customization options.
