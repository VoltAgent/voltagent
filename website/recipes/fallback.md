---
id: fallback
title: Fallback
slug: fallback
description: Configure ordered model fallbacks for reliable agent calls.
---

# Fallback

Fallbacks let VoltAgent try a secondary model when the primary fails. Each model can have its own retry policy.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const agent = new Agent({
  name: "FallbackAgent",
  instructions: "Be concise.",
  model: [
    { id: "primary", model: openai("gpt-4o-mini"), maxRetries: 1 },
    { id: "secondary", model: anthropic("claude-3-5-sonnet"), maxRetries: 2 },
  ],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Enable or Disable a Model

```typescript
const agent = new Agent({
  name: "FeatureFlaggedAgent",
  instructions: "Handle requests reliably.",
  model: [
    { id: "primary", model: openai("gpt-4o-mini") },
    { id: "backup", model: "google/gemini-2.0-flash", enabled: false },
  ],
});
```

## Track Fallbacks

```typescript
const agent = new Agent({
  name: "FallbackAwareAgent",
  instructions: "Respond with a backup model if needed.",
  model: [
    { id: "primary", model: openai("gpt-4o-mini"), maxRetries: 1 },
    { id: "secondary", model: anthropic("claude-3-5-sonnet"), maxRetries: 1 },
  ],
  hooks: {
    onFallback: async ({ stage, fromModel, nextModel, operation }) => {
      console.warn(
        `Fallback (${stage}) from ${fromModel} to ${nextModel ?? "next"} during ${operation}`
      );
    },
  },
});
```

## Notes

- VoltAgent tries enabled models in order.
- Each model retries up to `maxRetries` before moving to the next.
- Fallback does not trigger for guardrail blocks, tool errors, or abort/bail conditions.
- Streaming fallback only happens if the stream fails before the first chunk.

## Learn More

See [Retries and Fallbacks](/docs/agents/retries-fallback) for full behavior details.
