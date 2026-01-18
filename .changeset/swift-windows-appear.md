---
"@voltagent/core": patch
---

feat: add retry/fallback hooks and middleware retry feedback

### Model Retry and Fallback

Configure ordered model candidates with per-model retry limits.

```ts
import { Agent } from "@voltagent/core";
import { anthropic } from "@ai-sdk/anthropic";

const agent = new Agent({
  name: "Support",
  instructions: "Answer support questions with short, direct replies.",
  model: [
    { id: "primary", model: "openai/gpt-4o-mini", maxRetries: 2 },
    { id: "fallback", model: anthropic("claude-3-5-sonnet"), maxRetries: 1 },
  ],
});
```

- `maxRetries` is per model (total attempts = `maxRetries + 1`).
- If retries are exhausted, VoltAgent tries the next enabled model.

### Middleware Retry Feedback

Middleware can request a retry. The retry reason and metadata are added as a system
message for the next attempt.

```ts
import { Agent, createOutputMiddleware } from "@voltagent/core";

const requireSignature = createOutputMiddleware<string>({
  name: "RequireSignature",
  handler: ({ output, abort }) => {
    if (!output.includes("-- Support")) {
      abort("Missing signature", { retry: true, metadata: { signature: "-- Support" } });
    }
    return output;
  },
});

const agent = new Agent({
  name: "Support",
  instructions: "Answer support questions with short, direct replies.",
  model: "openai/gpt-4o-mini",
  maxMiddlewareRetries: 1,
  outputMiddlewares: [requireSignature],
});
```

### Input Middleware Example

Input middleware can rewrite user input before guardrails and hooks.

```ts
import { Agent, createInputMiddleware } from "@voltagent/core";

const normalizeInput = createInputMiddleware({
  name: "NormalizeInput",
  handler: ({ input }) => {
    if (typeof input !== "string") return input;
    return input.trim();
  },
});

const agent = new Agent({
  name: "Support",
  instructions: "Answer support questions with short, direct replies.",
  model: "openai/gpt-4o-mini",
  inputMiddlewares: [normalizeInput],
});
```

### Retry and Fallback Hooks

Track retries and fallbacks in hooks. `onRetry` runs for LLM and middleware retries.

```ts
const agent = new Agent({
  name: "RetryHooks",
  instructions: "Answer support questions with short, direct replies.",
  model: "openai/gpt-4o-mini",
  hooks: {
    onRetry: async (args) => {
      if (args.source === "llm") {
        console.log(`LLM retry ${args.nextAttempt}/${args.maxRetries + 1} for ${args.modelName}`);
        return;
      }
      console.log(
        `Middleware retry ${args.retryCount + 1}/${args.maxRetries + 1} for ${args.middlewareId ?? "unknown"}`
      );
    },
    onFallback: async ({ stage, fromModel, nextModel }) => {
      console.log(`Fallback (${stage}) from ${fromModel} to ${nextModel ?? "next"}`);
    },
  },
});
```
