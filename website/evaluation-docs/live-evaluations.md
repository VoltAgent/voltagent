---
title: Live Evaluations
sidebar_position: 3
---

# Live Evaluations

Live evaluations run scorers against real-time agent interactions. Attach scorers to agents during initialization to sample production traffic, enforce safety guardrails, and monitor conversation quality without running separate evaluation jobs.

## Configuring Live Scorers

Define scorers in the `eval` config when creating an agent:

```ts
import { Agent, VoltAgentObservability } from "@voltagent/core";
import { createModerationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const observability = new VoltAgentObservability();

const agent = new Agent({
  name: "support-agent",
  instructions: "Answer customer questions about products.",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    environment: "prod-us-east",
    sampling: { type: "ratio", rate: 0.1 },
    scorers: {
      moderation: {
        scorer: createModerationScorer({
          model: openai("gpt-4o-mini"),
          threshold: 0.5,
        }),
      },
    },
  },
});
```

Scorers execute asynchronously after the agent response is generated. Scoring does not block the user-facing response.

## Where live scores show up

Live scorer results are recorded as OTLP trace spans with `eval.scorer.*` attributes. They appear in VoltOps Live Scores and telemetry views. They do not create Eval Runs, are not attached to datasets, and do not trigger annotation automation. If you need reproducible runs, pass/fail criteria, or annotations, use dataset-based evaluations with `@voltagent/evals`.

## Eval Configuration

### Required Fields

None - all fields are optional. If no scorers are defined, evaluation is disabled.

### Optional Fields

#### `triggerSource`

Tags the evaluation run with a trigger identifier. Use to distinguish between environments or traffic sources.

```ts
triggerSource: "production"; // live traffic
triggerSource: "staging"; // pre-production
triggerSource: "manual"; // manual testing
```

Default: `"live"` when unspecified.

#### `environment`

Labels the evaluation with an environment tag. Appears in telemetry and VoltOps dashboards.

```ts
environment: "prod-us-east";
environment: "local-dev";
```

#### `sampling`

Controls what percentage of interactions are scored. Use sampling to reduce latency and LLM costs on high-volume agents.

**Ratio-based:**

```ts
sampling: {
  type: "ratio",
  rate: 0.1,  // score 10% of interactions
}
```

**Count-based:**

```ts
sampling: {
  type: "count",
  rate: 100,  // score every 100th interaction
}
```

**Always sample:**

```ts
sampling: { type: "ratio", rate: 1 }  // 100%
```

When unspecified, sampling defaults to scoring every interaction (`rate: 1`).

Sampling decisions are made independently for each scorer. Set sampling at the eval level (applies to all scorers) or per-scorer to override.

#### `scorers`

Map of scorer configurations. Each key identifies a scorer instance, and the value defines the scorer function and parameters.

```ts
scorers: {
  moderation: {
    scorer: createModerationScorer({ model, threshold: 0.5 }),
  },
  keyword: {
    scorer: keywordMatchScorer,
    params: { keyword: "refund" },
  },
}
```

#### `redact`

Function to remove sensitive data from evaluation payloads before storage. Called synchronously before scoring.

```ts
redact: (payload) => ({
  ...payload,
  input: payload.input?.replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, "[CARD]"),
  output: payload.output?.replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, "[CARD]"),
});
```

The redacted payload is stored in observability but scoring uses the original unredacted version.

## Scorer Configuration

Each entry in the `scorers` map has this structure:

```ts
{
  scorer: LocalScorerDefinition | (() => Promise<LocalScorerDefinition>),
  params?: Record<string, unknown> | ((payload: AgentEvalContext) => Record<string, unknown>),
  sampling?: SamplingPolicy,
  id?: string,
  onResult?: (result: AgentEvalResult) => void | Promise<void>,
}
```

### Fields

#### `scorer` (required)

The scoring function. Use prebuilt scorers from `@voltagent/scorers` or custom implementations via `buildScorer`.

**Prebuilt scorer:**

```ts
import { createModerationScorer } from "@voltagent/scorers";

scorer: createModerationScorer({ model, threshold: 0.5 });
```

**Custom scorer:**

```ts
import { buildScorer } from "@voltagent/core";

const customScorer = buildScorer({
  id: "length-check",
  type: "agent",
  label: "Response Length",
})
  .score(({ payload }) => {
    const length = payload.output?.length ?? 0;
    return { score: length > 50 ? 1 : 0 };
  })
  .build();
```

#### `params`

Static or dynamic parameters passed to the scorer.

**Static:**

```ts
params: {
  keyword: "refund",
  threshold: 0.8,
}
```

**Dynamic:**

```ts
params: (payload) => ({
  keyword: extractKeyword(payload.input),
  threshold: 0.8,
});
```

Dynamic params are resolved before each scorer invocation.

#### `sampling`

Override the global sampling policy for this scorer.

```ts
sampling: { type: "ratio", rate: 0.05 }  // 5% for this scorer only
```

#### `id`

Override the scorer's default ID. Useful when using the same scorer multiple times with different params.

```ts
scorers: {
  keywordRefund: {
    scorer: keywordScorer,
    id: "keyword-refund",
    params: { keyword: "refund" },
  },
  keywordReturn: {
    scorer: keywordScorer,
    id: "keyword-return",
    params: { keyword: "return" },
  },
}
```

#### `onResult`

Callback invoked after scoring completes. Use for custom logging, alerting, or side effects.

```ts
onResult: async (result) => {
  if (result.score !== null && result.score < 0.5) {
    await alertingService.send({
      message: `Low score: ${result.scorerName} = ${result.score}`,
    });
  }
};
```

## Scorer Context

Scorers receive an `AgentEvalContext` object with these properties:

```ts
interface AgentEvalContext {
  agentId: string;
  agentName: string;
  operationId: string;
  operationType: "generateText" | "streamText" | string;
  input: string | null; // normalized string
  output: string | null; // normalized string
  rawInput: unknown; // original input value
  rawOutput: unknown; // original output value
  userId?: string;
  conversationId?: string;
  traceId: string;
  spanId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  rawPayload: AgentEvalPayload;
}
```

Use `input` and `output` for text-based scorers. Access `rawInput` and `rawOutput` for structured data.

## Building Custom Scorers

Use `buildScorer` to create scorers with custom logic:

```ts
import { buildScorer } from "@voltagent/core";

const lengthScorer = buildScorer({
  id: "response-length",
  type: "agent",
  label: "Response Length Check",
})
  .score(({ payload, params }) => {
    const minLength = (params.minLength as number) ?? 50;
    const length = payload.output?.length ?? 0;
    return {
      score: length >= minLength ? 1 : 0,
      metadata: { actualLength: length, minLength },
    };
  })
  .reason(({ score, params }) => {
    const minLength = (params.minLength as number) ?? 50;
    return {
      reason:
        score >= 1
          ? `Response meets minimum length of ${minLength} characters.`
          : `Response is shorter than ${minLength} characters.`,
    };
  })
  .build();
```

### Builder Methods

#### `.score(fn)`

Defines the scoring function. Return `{ score, metadata? }` or just the numeric score.

```ts
.score(({ payload, params, results }) => {
  const match = payload.output?.includes(params.keyword);
  return {
    score: match ? 1 : 0,
    metadata: { keyword: params.keyword, matched: match },
  };
})
```

Context properties:

- `payload` - `AgentEvalContext` with input/output
- `params` - Resolved parameters
- `results` - Shared results object for multi-stage scoring

#### `.reason(fn)` (optional)

Generates human-readable explanations. Return `{ reason: string }`.

```ts
.reason(({ score, params }) => ({
  reason: score >= 1 ? "Match found" : "No match",
}))
```

#### `.build()`

Returns the `LocalScorerDefinition` object.

## LLM Judge Scorers

Use AI SDK's `generateObject` to build LLM-based evaluators:

```ts
import { buildScorer } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const JUDGE_SCHEMA = z.object({
  score: z.number().min(0).max(1).describe("Score from 0 to 1"),
  reason: z.string().describe("Detailed explanation"),
});

const helpfulnessScorer = buildScorer({
  id: "helpfulness",
  label: "Helpfulness Judge",
})
  .score(async ({ payload }) => {
    const prompt = `Rate the response for clarity and helpfulness.

User Input: ${payload.input}
Assistant Response: ${payload.output}

Provide a score from 0 to 1 with an explanation.`;

    const response = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: JUDGE_SCHEMA,
      prompt,
      maxTokens: 200,
    });

    return {
      score: response.object.score,
      metadata: {
        reason: response.object.reason,
      },
    };
  })
  .build();
```

The judge calls the LLM with a structured schema, ensuring consistent scoring output.

## Prebuilt Scorers

### Moderation

```ts
import { createModerationScorer } from "@voltagent/scorers";

createModerationScorer({
  model: openai("gpt-4o-mini"),
  threshold: 0.5, // fail if score < 0.5
});
```

Flags unsafe content (toxicity, bias, etc.) using LLM-based classification.

### Answer Correctness

```ts
import { createAnswerCorrectnessScorer } from "@voltagent/scorers";

const scorer = createAnswerCorrectnessScorer({
  buildPayload: ({ payload, params }) => ({
    input: payload.input,
    output: payload.output,
    expected: params.expectedAnswer,
  }),
});
```

Evaluates factual accuracy. Requires `expected` in params. Users implement scoring logic.

### Answer Relevancy

```ts
import { createAnswerRelevancyScorer } from "@voltagent/scorers";

const scorer = createAnswerRelevancyScorer({
  strictness: 3,
  buildPayload: ({ payload, params }) => ({
    input: payload.input,
    output: payload.output,
    context: params.referenceContext,
  }),
});
```

Checks if the output addresses the input. Strictness controls evaluation level.

### Keyword Match

```ts
import { buildScorer } from "@voltagent/core";

const keywordScorer = buildScorer({
  id: "keyword-match",
  type: "agent",
})
  .score(({ payload, params }) => {
    const keyword = params.keyword as string;
    const matched = payload.output?.toLowerCase().includes(keyword.toLowerCase());
    return { score: matched ? 1 : 0 };
  })
  .build();

// Usage:
scorers: {
  keyword: {
    scorer: keywordScorer,
    params: { keyword: "refund" },
  },
}
```

## VoltOps Integration

When a VoltOps client is configured globally, live scorer results are forwarded automatically:

```ts
import VoltAgent, { Agent, VoltAgentObservability } from "@voltagent/core";
import { VoltOpsClient } from "@voltagent/sdk";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const observability = new VoltAgentObservability();

new VoltAgent({
  agents: { support: agent },
  observability,
  voltOpsClient, // enables automatic forwarding
});
```

The framework creates evaluation runs, registers scorers, appends results, and finalizes summaries. Each batch of scores (per agent interaction) becomes a separate run in VoltOps.

## Sampling Strategies

### Ratio Sampling

Sample a percentage of interactions:

```ts
sampling: { type: "ratio", rate: 0.1 }  // 10% of traffic
```

Use for high-volume agents where scoring every interaction is expensive.

### Count Sampling

Sample every Nth interaction:

```ts
sampling: { type: "count", rate: 100 }  // every 100th interaction
```

Use when you need predictable sampling intervals or rate-limiting.

### Per-Scorer Sampling

Override sampling for specific scorers:

```ts
eval: {
  sampling: { type: "ratio", rate: 1 },  // default: score all
  scorers: {
    moderation: {
      scorer: moderationScorer,
      sampling: { type: "ratio", rate: 1 },  // always run moderation
    },
    helpfulness: {
      scorer: helpfulnessScorer,
      sampling: { type: "ratio", rate: 0.05 },  // 5% for expensive LLM judge
    },
  },
}
```

## Error Handling

If a scorer throws an exception, the result is marked `status: "error"` and the error message is captured in `errorMessage`. Other scorers continue executing.

```ts
.score(({ payload, params }) => {
  if (!params.keyword) {
    throw new Error("keyword parameter is required");
  }
  // ...
})
```

The error appears in observability storage and VoltOps telemetry.

## Best Practices

### Use Sampling for Expensive Scorers

LLM judges and embedding-based scorers consume tokens and add latency. Sample aggressively:

```ts
sampling: { type: "ratio", rate: 0.05 }  // 5% for LLM judges
```

### Combine Fast and Slow Scorers

Run lightweight scorers (keyword match, length checks) on all interactions. Sample LLM judges at lower rates.

```ts
scorers: {
  keyword: {
    scorer: keywordScorer,
    sampling: { type: "ratio", rate: 1 },  // 100%
  },
  helpfulness: {
    scorer: helpfulnessScorer,
    sampling: { type: "ratio", rate: 0.1 },  // 10%
  },
}
```

### Use Redaction for PII

Strip sensitive data before storage:

```ts
redact: (payload) => ({
  ...payload,
  input: payload.input?.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"),
  output: payload.output?.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"),
});
```

Scorers receive unredacted data. Only storage and telemetry are redacted.

### Use Thresholds for Alerts

Set thresholds and trigger alerts on failures:

```ts
scorers: {
  moderation: {
    scorer: createModerationScorer({ model, threshold: 0.7 }),
    onResult: async (result) => {
      if (result.score !== null && result.score < 0.7) {
        await alertingService.send({
          severity: "high",
          message: `Moderation failed: ${result.score}`,
        });
      }
    },
  },
}
```

### Tag Environments

Use `environment` to distinguish between deployments:

```ts
environment: process.env.NODE_ENV === "production" ? "prod" : "staging";
```

Filter telemetry by environment in VoltOps dashboards.

## Examples

### Moderation + Keyword Matching

```ts
import { Agent, VoltAgentObservability, buildScorer } from "@voltagent/core";
import { createModerationScorer } from "@voltagent/scorers";
import { openai } from "@ai-sdk/openai";

const moderationModel = openai("gpt-4o-mini");

const keywordScorer = buildScorer({
  id: "keyword-match",
  type: "agent",
})
  .score(({ payload, params }) => {
    const keyword = params.keyword as string;
    const matched = payload.output?.toLowerCase().includes(keyword.toLowerCase());
    return { score: matched ? 1 : 0, metadata: { keyword, matched } };
  })
  .build();

const agent = new Agent({
  name: "support",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    sampling: { type: "ratio", rate: 1 },
    scorers: {
      moderation: {
        scorer: createModerationScorer({ model: moderationModel, threshold: 0.5 }),
      },
      keyword: {
        scorer: keywordScorer,
        params: { keyword: "refund" },
      },
    },
  },
});
```

### LLM Judge for Helpfulness

```ts
import { Agent, buildScorer } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const HELPFULNESS_SCHEMA = z.object({
  score: z.number().min(0).max(1),
  reason: z.string(),
});

const helpfulnessScorer = buildScorer({
  id: "helpfulness",
  label: "Helpfulness",
})
  .score(async ({ payload }) => {
    const agent = new Agent({
      name: "helpfulness-judge",
      model: openai("gpt-4o-mini"),
      instructions: "You rate responses for helpfulness",
    });

    const prompt = `Rate the response for clarity, accuracy, and helpfulness.

User Input: ${payload.input}
Assistant Response: ${payload.output}

Provide a score from 0 to 1 with an explanation.`;

    const response = await agent.generateObject(prompt, HELPFULNESS_SCHEMA);

    const rawResults = (payload as any).results?.raw ?? {};
    rawResults.helpfulnessJudge = response.object;

    return {
      score: response.object.score,
      metadata: { reason: response.object.reason },
    };
  })
  .reason(({ results }) => {
    const judge = results.raw?.helpfulnessJudge as { reason?: string };
    return { reason: judge?.reason ?? "No explanation provided." };
  })
  .build();

const agent = new Agent({
  name: "support",
  model: openai("gpt-4o"),
  eval: {
    sampling: { type: "ratio", rate: 0.1 }, // 10% sampling
    scorers: {
      helpfulness: { scorer: helpfulnessScorer },
    },
  },
});
```

### Multiple Scorers with Different Sampling

```ts
const agent = new Agent({
  name: "support",
  model: openai("gpt-4o"),
  eval: {
    triggerSource: "production",
    environment: "prod-us-east",
    sampling: { type: "ratio", rate: 1 }, // default: score everything
    scorers: {
      moderation: {
        scorer: createModerationScorer({ model, threshold: 0.5 }),
        sampling: { type: "ratio", rate: 1 }, // always run
      },
      answerCorrectness: {
        scorer: createAnswerCorrectnessScorer(),
        sampling: { type: "ratio", rate: 0.05 }, // 5% (expensive)
        params: (payload) => ({
          expectedAnswer: lookupExpectedAnswer(payload.input),
        }),
      },
      keyword: {
        scorer: keywordScorer,
        params: { keyword: "refund" },
        sampling: { type: "ratio", rate: 1 }, // cheap, always run
      },
    },
  },
});
```

## Combining Offline and Live Evaluations

Use live evals for real-time monitoring and offline evals for regression testing:

- **Live**: Sample 5-10% of production traffic with fast scorers (moderation, keyword match)
- **Offline**: Run comprehensive LLM judges on curated datasets nightly

Both share the same scorer definitions. Move scorers between eval types as needed.

## Next Steps

- [Offline Evaluations](/evaluation-docs/offline-evaluations) - Regression testing and CI integration
- [Prebuilt Scorers](/evaluation-docs/prebuilt-scorers) - Full catalog of prebuilt scorers
- [Building Custom Scorers](/evaluation-docs/building-custom-scorers) - Create your own evaluation scorers
