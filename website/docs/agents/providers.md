---
title: Using Models
slug: /agents/providers
---

# Using Models with Agents

VoltAgent 1.x has no `llm` provider prop. Instead, pass an ai-sdk `LanguageModel` directly via the `model` option.

## Quick Example

```ts
import { Agent } from "@voltagent/core";
import { anthropic } from "@ai-sdk/anthropic";

const agent = new Agent({
  name: "my-agent",
  instructions: "Helpful and concise",
  model: anthropic("claude-3-5-sonnet"),
});

const res = await agent.generateText("Say hi", { temperature: 0.2 });
console.log(res.text);
```

## Provider Selection

Choose any ai-sdk provider package that fits your needs (OpenAI, Anthropic, Google, Groq, Mistral, Vertex, Bedrock, etc.). For installation and an up-to-date model matrix, see:

**[Providers & Models](/docs/getting-started/providers-models)**
