---
title: Quick Start
slug: /evals/quick-start
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Evals Quick Start Guide

This guide will walk you through setting up your first evaluation pipeline with VoltAgent and Viteval. In just a few minutes, you'll have a working eval system that can measure your agent's performance.

## Prerequisites

Before starting, make sure you have:

- A VoltAgent project set up with `@voltagent/core`
- Node.js 22+ installed
- An AI provider configured (OpenAI, Anthropic, etc.)

## Installation

Install Viteval as a development dependency:

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash
    npm install viteval --save-dev
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add viteval --dev
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm add viteval --save-dev
    ```
  </TabItem>
</Tabs>

## Quick Setup

### 1. Set up VoltAgent

```bash
viteval init
```

This will create a `viteval.config.ts` and `viteval.setup.ts` file in your project root.

### 2. Viteval Setup File

Uncomment the setup file content to use env variables or remove it if you don't need it:

```typescript
// viteval.setup.ts
import dotenv from "dotenv";

dotenv.config({ path: "./.env", quiet: true });
```

### 3. Configure Viteval (Optional)

Update the Viteval configuration file:

```typescript
// viteval.config.ts
import { defineConfig } from "viteval/config";

export default defineConfig({
  reporter: "console",
  eval: {
    include: ["src/**/*.eval.ts"],
    setupFiles: ["./viteval.setup.ts"],
  },
});
```

### 4. Create Your Agent

First, create your VoltAgent agent:

```typescript
// src/agents/support.ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

export const supportAgent = new Agent({
  name: "Customer Support",
  instructions:
    "You are a helpful customer support agent. Provide accurate and friendly assistance.",
  model: openai("gpt-4o-mini"),
});
```

### 5. Create Test Dataset

Define your test cases in a dataset file:

```typescript
// src/agents/support.dataset.ts
import { defineDataset } from "viteval/dataset";

export default defineDataset({
  name: "support",
  data: async () => [
    {
      input: "What is your refund policy?",
      expected: "Our refund policy allows returns within 30 days of purchase with a valid receipt.",
    },
    {
      input: "How long does shipping take?",
      expected: "Standard shipping takes 3-5 business days, express shipping takes 1-2 days.",
    },
    {
      input: "Hello, I need help with my order",
      expected:
        "Hello! I'd be happy to help you with your order. What specific assistance do you need?",
    },
  ],
});
```

:::tip
You can also use an LLM to generate the dataset dynamically. See an example in [Viteval Example](https://github.com/voltagent/voltagent/tree/main/examples/with-viteval)
:::

### 6. Create Evaluation File

Create the evaluation logic:

```typescript
// src/agents/support.eval.ts
import { evaluate, scorers } from "viteval";
import { supportAgent } from "./support";
import supportDataset from "./support.dataset";

evaluate("Customer Support Agent", {
  description: "Evaluates customer support agent capabilities",
  data: supportDataset,
  task: async ({ input }) => {
    const result = await supportAgent.generateText(input);
    return result.text;
  },
  scorers: [scorers.answerCorrectness, scorers.answerRelevancy, scorers.moderation],
  threshold: 0.7,
});
```

:::tip
You can learn more about Viteval scorers by visiting the [Viteval Scorers](https://viteval.dev/guide/concepts#scorers?ref=voltagent) documentation.
:::

### 7. Add NPM Script

Add a script to your `package.json`:

```json
{
  "scripts": {
    "eval": "viteval"
  }
}
```

### 8. Run Your First Evaluation

```bash
npm run eval
```

You'll see output like:

```
✓ Customer Support Agent (3/3 passed)
  ✓ answerCorrectness: 0.85
  ✓ answerRelevancy: 0.82
  ✓ moderation: 0.98
  Overall: 0.883 (threshold: 0.7) ✓
```

## Next Steps

- [**View Available Scorers**](https://viteval.dev/api/scorers?ref=voltagent): Understanding evaluation metrics
- [**CI Integration**](https://viteval.dev/guide/advanced/ci?ref=voltagent): Integrate Viteval into your CI pipeline
