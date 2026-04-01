---
id: retrying
title: Retrying
slug: retrying
description: Automatically retry model calls to handle transient failures.
---

# Retrying

Retries help you survive transient provider issues like 5xx errors and rate limits. VoltAgent applies exponential backoff between attempts.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const agent = new Agent({
  name: "ReliableAgent",
  instructions: "Answer support questions clearly and fast.",
  model: openai("gpt-4o-mini"),
  maxRetries: 2,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Per-Call Overrides

```typescript
const response = await agent.generateText("Summarize this ticket", {
  maxRetries: 0,
});
```

## Retry Telemetry

Use the `onRetry` hook to track retry behavior.

```typescript
const agent = new Agent({
  name: "RetryAwareAgent",
  instructions: "Answer questions with retries.",
  model: openai("gpt-4o-mini"),
  maxRetries: 2,
  hooks: {
    onRetry: async (args) => {
      if (args.source === "llm") {
        console.log(`LLM retry ${args.nextAttempt}/${args.maxRetries + 1} for ${args.modelName}`);
      } else {
        console.log(
          `Middleware retry ${args.retryCount + 1}/${args.maxRetries + 1} for ${args.middlewareId ?? "unknown"}`
        );
      }
    },
  },
});
```

## Notes

- Total attempts = `maxRetries + 1`.
- Default `maxRetries` is `3` if you do not configure it.
- Errors marked `isRetryable: false` skip retries.
- Streaming retries only happen if the stream fails before the first chunk.

## Learn More

See [Retries and Fallbacks](/docs/agents/retries-fallback) for full behavior details.
