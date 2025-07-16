---
"@voltagent/core": patch
---

This update adds a powerful, type-safe workflow engine to `@voltagent/core`. You can now build complex, multi-step processes that chain together your code, AI models, and conditional logic with full type-safety and built-in observability.

Here is a quick example of what you can build:

```typescript
import { createWorkflowChain, Agent, VoltAgent } from "@voltagent/core";
import { z } from "zod";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define an agent to use in the workflow
const analyzerAgent = new Agent({
  name: "Analyzer",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a text analyzer.",
});

// 1. Define the workflow chain
const workflow = createWorkflowChain({
  id: "greeting-analyzer",
  name: "Greeting Analyzer",
  input: z.object({ name: z.string() }),
  result: z.object({ greeting: z.string(), sentiment: z.string() }),
})
  .andThen({
    id: "create-greeting",
    execute: async ({ name }) => ({ greeting: `Hello, ${name}!` }),
  })
  .andAgent((data) => `Analyze the sentiment of this greeting: "${data.greeting}"`, analyzerAgent, {
    schema: z.object({ sentiment: z.string().describe("e.g., positive") }),
  });

// You can run the chain directly
const result = await workflow.run({ name: "World" });
```

To make your workflow runs visible in the **VoltOps Console** for debugging and monitoring, register both the workflow and its agents with a `VoltAgent` instance:

![VoltOps Workflow Observability](https://cdn.voltagent.dev/docs/workflow-observability-demo.gif)

```typescript
// 2. Register the workflow and agent to enable observability
new VoltAgent({
  agents: {
    analyzerAgent,
  },
  workflows: {
    workflow,
  },
});

// Now, when you run the workflow, its execution will appear in VoltOps.
await workflow.run({ name: "Alice" });
```

This example showcases the fluent API, data flow between steps, type-safety, and integration with Agents, which are the core pillars of this new feature.
