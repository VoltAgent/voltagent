---
title: Using with Viteval
slug: /evals/using-with-viteval
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Using VoltAgent with Viteval

Viteval is a third-party evaluation framework that can be integrated with VoltAgent for running evaluations. While VoltAgent provides its own native evaluation system through the CLI and `runExperiment` API, Viteval offers an alternative approach for teams already familiar with its ecosystem.

:::info Recommended Approach
For full feature support and VoltOps integration, we recommend using VoltAgent's native evaluation system:

- **VoltAgent CLI**: Use `volt eval` commands for dataset management and evaluation runs
- **runExperiment API**: Direct programmatic control over evaluations
- **VoltOps Integration**: Cloud-based evaluation management (coming soon)

See our [CLI Reference](/docs/evals/cli-reference) and [Experiments Guide](/docs/evals/experiments) for the recommended approach.
:::

:::warning VoltOps Integration
Viteval does not currently integrate with VoltOps, VoltAgent's cloud platform for managing evaluations. VoltOps integration for third-party evaluation frameworks is coming soon. For now, use VoltAgent's native evaluation features for full cloud support.
:::

## When to Use Viteval

Consider using Viteval if:

- Your team already uses Viteval for other projects
- You need Viteval-specific features not yet available in VoltAgent
- You're migrating from a Viteval-based evaluation system

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

### 1. Initialize Viteval

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
    "eval:viteval": "viteval"
  }
}
```

### 8. Run Your Evaluation

```bash
npm run eval:viteval
```

You'll see output like:

```
✓ Customer Support Agent (3/3 passed)
  ✓ answerCorrectness: 0.85
  ✓ answerRelevancy: 0.82
  ✓ moderation: 0.98
  Overall: 0.883 (threshold: 0.7) ✓
```

## Limitations

When using Viteval with VoltAgent, be aware of these limitations:

1. **No VoltOps Integration**: Results won't appear in your VoltOps dashboard
2. **Limited Scorer Support**: Not all VoltAgent scorers are available in Viteval
3. **No Live Evaluations**: Viteval only supports offline evaluations
4. **Dataset Format Differences**: Viteval datasets use a different format than VoltAgent datasets

## Migration to Native VoltAgent Evals

To migrate from Viteval to VoltAgent's native evaluation system:

1. Convert your Viteval datasets to VoltAgent format (see [Datasets Guide](/docs/evals/datasets))
2. Replace `viteval` commands with `volt eval` commands
3. Use `runExperiment` instead of `evaluate()` function
4. Update scorers to use VoltAgent's scorer definitions

## Next Steps

- **For Viteval Users**: [View Available Viteval Scorers](https://viteval.dev/api/scorers?ref=voltagent)
- **Recommended**: [VoltAgent CLI Reference](/docs/evals/cli-reference) - Use native VoltAgent evaluations
- **Recommended**: [Experiments Guide](/docs/evals/experiments) - Learn about VoltAgent's evaluation system
- **Coming Soon**: VoltOps integration for enhanced evaluation management
