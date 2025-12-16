---
id: workflows
title: Workflows
slug: workflows
description: Build multi-step workflows with agents, conditions, and human-in-the-loop.
---

# Workflows

Workflows let you chain multiple steps together - combining AI agents, custom logic, and human approvals.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createWorkflowChain } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const analysisAgent = new Agent({
  name: "AnalysisAgent",
  model: openai("gpt-4o-mini"),
  instructions: "You are a data analyst.",
});

// Create a workflow
const orderWorkflow = createWorkflowChain({
  id: "order-processing",
  name: "Order Processing",
  purpose: "Process orders with validation and AI analysis",
  input: z.object({
    orderId: z.string(),
    amount: z.number(),
    items: z.array(z.string()),
  }),
  result: z.object({
    status: z.enum(["approved", "rejected"]),
    total: z.number(),
  }),
})
  // Step 1: Validate order
  .andThen({
    id: "validate",
    execute: async ({ data }) => {
      return {
        ...data,
        isValid: data.amount > 0 && data.items.length > 0,
      };
    },
  })
  // Step 2: AI analysis
  .andAgent(async ({ data }) => `Analyze order ${data.orderId} for fraud risk.`, analysisAgent, {
    schema: z.object({
      riskLevel: z.enum(["low", "medium", "high"]),
    }),
  })
  // Step 3: Final decision
  .andThen({
    id: "decide",
    execute: async ({ data, getStepData }) => {
      const validation = getStepData("validate")?.output;
      return {
        status: validation?.isValid && data.riskLevel === "low" ? "approved" : "rejected",
        total: validation?.amount || 0,
      };
    },
  });

new VoltAgent({
  agents: { analysisAgent },
  workflows: { orderWorkflow },
  server: honoServer({ port: 3141 }),
});
```

## Workflow Methods

| Method        | Purpose                 |
| ------------- | ----------------------- |
| `.andThen()`  | Execute custom logic    |
| `.andAgent()` | Use AI agent for a step |
| `.andTap()`   | Side effects (logging)  |
| `.andWhen()`  | Conditional branching   |

## Human-in-the-Loop (Suspend/Resume)

```typescript
.andThen({
  id: "manager-approval",
  resumeSchema: z.object({
    approved: z.boolean(),
    managerId: z.string(),
  }),
  execute: async ({ data, suspend, resumeData }) => {
    // If resuming with manager decision
    if (resumeData) {
      return { ...data, approved: resumeData.approved };
    }

    // Suspend for approval if amount > $500
    if (data.amount > 500) {
      await suspend("Manager approval required", {
        requestedAmount: data.amount,
      });
    }

    return { ...data, approved: true };
  },
})
```

## Full Example

See the complete example: [with-workflow on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-workflow)
