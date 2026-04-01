---
title: Retries and Fallbacks
slug: /agents/retries-fallback
---

# Retries and Fallbacks

VoltAgent supports per-call retries and ordered model fallback lists. Retries are handled by VoltAgent with exponential backoff. After retries are exhausted for a model, VoltAgent attempts the next model in the list.

## Configure Retries

You can set a default retry count at the agent level, then override it per model or per call.

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "Support",
  instructions: "Resolve tickets quickly.",
  model: "openai/gpt-4o-mini",
  maxRetries: 3,
});

// Per-call override
await agent.generateText("Summarize this ticket", { maxRetries: 0 });
```

- `maxRetries` is the number of retry attempts for a single model call (total attempts = `maxRetries + 1`).
- Priority order: per-call `maxRetries` > per-model `maxRetries` > agent `maxRetries` > default `3`.
- `0` disables retries for that call.
- Retry delay uses exponential backoff: 1s, 2s, 4s, 8s (max 10s).
- Errors with `isRetryable: false` skip retries; fallback can still run.

## Configure Fallbacks

Provide a list of models. VoltAgent tries them in order until one succeeds.
Each entry can have its own retry count and can be toggled on/off.

```ts
import { Agent } from "@voltagent/core";
import { anthropic } from "@ai-sdk/anthropic";

const agent = new Agent({
  name: "FallbackAgent",
  instructions: "Be concise.",
  model: [
    { id: "primary", model: "openai/gpt-4o-mini", maxRetries: 2 },
    { id: "secondary", model: anthropic("claude-3-5-sonnet"), maxRetries: 1 },
    { id: "tertiary", model: "google/gemini-2.0-flash", enabled: true },
  ],
});
```

Notes:

- The first enabled model is the primary.
- `maxRetries` falls back to the agent default if omitted.
- `enabled: false` lets you keep a model configured but temporarily disabled.

## How Fallback Works

VoltAgent tries each enabled model in order:

1. Resolve the model (dynamic or static).
2. Execute the call with that model, retrying up to `maxRetries` on error.
3. If retries are exhausted, move to the next model.

Fallback **does not** trigger for:

- Abort or bail errors.
- Guardrail blocks.
- Tool execution errors.

Streaming behavior:

- Retries and fallback happen only if the stream fails before the first output chunk.
- If a stream fails after output starts, the error is surfaced to the caller and the stream is not restarted.

## Middleware Retries

Middleware retries are separate from model retries and fallback. A middleware can call `abort("reason", { retry: true })` to restart the full attempt.

- Controlled by `maxMiddlewareRetries` (agent-level or per-call).
- Each retry reruns the full pipeline: middleware, guardrails, hooks, model selection, model retries, and fallback.
- In streaming calls, only input middlewares can trigger a retry before the stream starts.

See [Middleware](/docs/agents/middleware) for configuration and API details.

## Real-World Scenarios

### 1. Provider Outage During a Traffic Spike

The primary provider returns 5xx errors during a traffic spike. Configure a fallback provider with its own retry count.

```ts
const agent = new Agent({
  name: "LaunchAssistant",
  instructions: "Handle onboarding questions.",
  model: [
    { model: "openai/gpt-4o-mini", maxRetries: 1 },
    { model: "anthropic/claude-3-5-sonnet", maxRetries: 2 },
  ],
});
```

Expected behavior:

- Primary errors are retried up to `maxRetries`.
- After retries, the secondary provider is attempted.

### 2. Rate Limits During Peak Hours

The primary model returns 429 during peak hours. Set `maxRetries: 0` on the primary and allow retries on the fallback.

```ts
const agent = new Agent({
  name: "PeakTrafficAgent",
  instructions: "Answer pricing questions.",
  model: [
    { model: "openai/gpt-4o-mini", maxRetries: 0 },
    { model: "groq/llama-3.3-70b-versatile", maxRetries: 2 },
  ],
});
```

Expected behavior:

- The primary fails without retry delay.
- The fallback is attempted and can retry if needed.

### 3. Timeouts in One Region

Requests in a region start timing out. Configure a regional primary with a global fallback.

```ts
const agent = new Agent({
  name: "RegionalAgent",
  instructions: "Support users in APAC.",
  model: [
    { model: "google/gemini-2.0-flash", maxRetries: 1 },
    { model: "openai/gpt-4o-mini", maxRetries: 1 },
  ],
});
```

Expected behavior:

- Timeouts on the primary move the call to the fallback after retries.
- The fallback handles calls that the primary fails.

### 4. Compliance or Data Residency Constraints

Some users require a specific provider for data residency. Select the primary model dynamically and keep a fallback entry.

```ts
const agent = new Agent({
  name: "ComplianceAgent",
  instructions: "Handle regulated requests.",
  model: [
    {
      model: async ({ context }) => {
        const region = (context.get("region") as string) || "us";
        return region === "eu" ? "mistral/mistral-large-latest" : "openai/gpt-4o-mini";
      },
      maxRetries: 1,
    },
    { model: "anthropic/claude-3-5-sonnet", maxRetries: 1 },
  ],
});
```

Expected behavior:

- The model selection uses `context` values on each call.
- If the selected model fails, the fallback is attempted.

### 5. Cost Control with Fallback

Use a lower-cost primary model and a second model for error cases.

```ts
const agent = new Agent({
  name: "CostAwareAgent",
  instructions: "Handle receipts and billing questions.",
  model: [
    { model: "openai/gpt-4o-mini", maxRetries: 1 },
    { model: "openai/gpt-4o", maxRetries: 0 },
  ],
});
```

Expected behavior:

- The primary handles successful calls.
- The fallback is only used when the primary errors.

## Troubleshooting Tips

- If fallbacks never trigger, check for guardrail blocks or tool errors.
- If retries are skipped, check whether the provider marks the error as `isRetryable: false`.
- If all configured models are disabled, VoltAgent throws `MODEL_LIST_EMPTY`.
- For long streaming sessions, consider application-level retry on stream errors.
- Keep the fallback list short to avoid long end-to-end latency when providers are degraded.
