---
"@voltagent/core": patch
---

feat: add agent.toTool() for converting agents into tools

Agents can now be converted to tools using the `.toTool()` method, enabling multi-agent coordination where one agent uses other specialized agents as tools. This is useful when the LLM should dynamically decide which agents to call based on the request.

## Usage Example

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Create specialized agents
const writerAgent = new Agent({
  id: "writer",
  purpose: "Writes blog posts",
  model: openai("gpt-4o-mini"),
});

const editorAgent = new Agent({
  id: "editor",
  purpose: "Edits content",
  model: openai("gpt-4o-mini"),
});

// Coordinator uses them as tools
const coordinator = new Agent({
  tools: [writerAgent.toTool(), editorAgent.toTool()],
  model: openai("gpt-4o-mini"),
});

// LLM decides which agents to call
await coordinator.generateText("Create a blog post about AI");
```

## Key Features

- **Dynamic agent selection**: LLM intelligently chooses which agents to invoke
- **Composable agents**: Reuse agents as building blocks across multiple coordinators
- **Type-safe**: Full TypeScript support with automatic type inference
- **Context preservation**: Automatically passes through userId, conversationId, and operation context
- **Customizable**: Optional custom name, description, and parameter schema

## Customization

```typescript
const customTool = agent.toTool({
  name: "professional_writer",
  description: "Writes professional blog posts",
  parametersSchema: z.object({
    topic: z.string(),
    style: z.enum(["formal", "casual"]),
  }),
});
```

## When to Use

- **Use `agent.toTool()`** when the LLM should decide which agents to call (e.g., customer support routing)
- **Use Workflows** for deterministic, code-defined pipelines (e.g., always: Step A → Step B → Step C)
- **Use Sub-agents** for fixed sets of collaborating agents

See the [documentation](https://docs.voltagent.ai/agents) and [`examples/with-agent-tool`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-agent-tool) for more details.
