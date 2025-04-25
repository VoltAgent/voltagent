---
"@voltagent/core": minor
---

## Introducing Reasoning Tools Helper

This update introduces a new helper function, `createReasoningTools`, to easily add step-by-step reasoning capabilities to your agents. #24

### New `createReasoningTools` Helper

**Feature:** Easily add `think` and `analyze` tools for step-by-step reasoning.

We've added a new helper function, `createReasoningTools`, which makes it trivial to equip your agents with structured thinking capabilities, similar to patterns seen in advanced AI systems.

- **What it does:** Returns a pre-configured `Toolkit` named `reasoning_tools`.
- **Tools included:** Contains the `think` tool (for internal monologue/planning) and the `analyze` tool (for evaluating results and deciding next steps).
- **Instructions:** Includes detailed instructions explaining how the agent should use these tools iteratively to solve problems. You can choose whether these instructions are automatically added to the system prompt via the `addInstructions` option.

```typescript
import { createReasoningTools, type Toolkit } from "@voltagent/core";

// Get the reasoning toolkit (with instructions included in the system prompt)
const reasoningToolkit: Toolkit = createReasoningTools({ addInstructions: true });

// Get the toolkit without automatically adding instructions
const reasoningToolkitManual: Toolkit = createReasoningTools({ addInstructions: false });
```

### How to Use Reasoning Tools

Pass the `Toolkit` object returned by `createReasoningTools` directly to the agent's `tools` array.

```typescript
// Example: Using the new reasoning tools helper
import { Agent, createReasoningTools, type Toolkit } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const reasoningToolkit: Toolkit = createReasoningTools({
  addInstructions: true,
});

const agent = new Agent({
  name: "MyThinkingAgent",
  description: "An agent equipped with reasoning tools.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [reasoningToolkit], // Pass the toolkit
});

// Agent's system message will include reasoning instructions.
```

This change simplifies adding reasoning capabilities to your agents.
