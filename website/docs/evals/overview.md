---
title: Overview
slug: /evals/overview
---

# Evals Overview

Evaluation (evals) helps you measure and improve your AI agent's performance. VoltAgent uses [**Viteval**](https://github.com/viteval/viteval) as its official evaluation framework, providing a simple yet powerful way to test your agents.

## Why Evals Matter

Without evaluation, you're building agents blindfolded. Evals help you:

- **Ensure Quality**: Catch issues before users do
- **Track Performance**: See if changes improve or break your agent
- **Build Confidence**: Know your agent works as expected
- **Meet Standards**: Validate safety and accuracy requirements

## What Gets Evaluated

### Agent Responses

- **Accuracy**: Are the facts correct?
- **Relevance**: Does it answer the question?
- **Helpfulness**: Is it useful to the user?
- **Safety**: No harmful or inappropriate content?

### Agent Behavior

- **Tool Usage**: Does it use the right tools correctly?
- **Following Instructions**: Does it stick to its role?
- **Consistency**: Similar inputs get similar outputs?

## Viteval Integration

VoltAgent works seamlessly with Viteval:

```typescript
// In your agent file (e.g., src/agents/support.ts)
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

export const supportAgent = new Agent({
  name: "Support Agent",
  instructions: "Help customers with their questions",
  model: openai("gpt-4o-mini"),
});

// In your eval file (e.g., src/agents/support.eval.ts)
import { evaluate, scorers } from "viteval";
import { supportAgent } from "./support";
import supportDataset from "./support.dataset";

evaluate("Support Agent", {
  description: "Evaluates customer support capabilities",
  data: supportDataset,
  task: async ({ input }) => {
    const result = await supportAgent.generateText(input);
    return result.text;
  },
  scorers: [scorers.answerCorrectness, scorers.answerRelevancy],
  threshold: 0.7,
});
```

## Getting Started

Ready to start evaluating? Our [Quick Start Guide](./quick-start.md) will have you running evals in minutes.

## Learn More

- [**Quick Start**](./quick-start.md): Your first evaluation in 5 minutes
- [**Viteval Concepts**](https://viteval.dev/guide/concepts?ref=voltagent): Understanding Viteval concepts
- [**Viteval Scorers**](https://viteval.dev/api/scorers?ref=voltagent): Understanding evaluation metrics
