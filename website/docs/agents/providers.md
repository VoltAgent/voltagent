---
title: Using Models
slug: /agents/providers
---

# Using Models with Agents

VoltAgent 1.x has no `llm` provider prop. Set `model` to either:

- An ai-sdk `LanguageModel` (imported from a provider package), or
- A model string like `openai/gpt-4o-mini` resolved by the built-in model router.

## Quick Example

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  instructions: "Helpful and concise",
  model: "anthropic/claude-3-5-sonnet",
});

const res = await agent.generateText("Say hi", { temperature: 0.2 });
console.log(res.text);
```

You can also pass a `LanguageModel` directly:

```ts
import { Agent } from "@voltagent/core";
import { anthropic } from "@ai-sdk/anthropic";

const agent = new Agent({
  name: "my-agent",
  instructions: "Helpful and concise",
  model: anthropic("claude-3-5-sonnet"),
});
```

## Provider Selection

Use any ai-sdk provider package you have configured (OpenAI, Anthropic, Google, Groq, Mistral, Vertex, Bedrock, etc.), or use model strings.
For installation and an up-to-date model matrix, see:

**[Providers & Models](/docs/getting-started/providers-models)**

For how model strings are resolved and how environment variables map, see:

**[Model Router & Registry](/docs/getting-started/model-router)**

## Retries and Fallbacks

For retry counts and fallback lists, see:

**[Retries and Fallbacks](/docs/agents/retries-fallback)**
