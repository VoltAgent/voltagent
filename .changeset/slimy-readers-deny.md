---
"@voltagent/core": patch
---

feat: subAgents now share conversation steps and context with parent agents

SubAgents automatically inherit and contribute to their parent agent's operation context, including `userContext` and conversation history. This creates a unified workflow where all agents (supervisor + subagents) add steps to the same `conversationSteps` array, providing complete visibility and traceability across the entire agent hierarchy.

## Usage

```typescript
import { Agent, createHooks } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// SubAgent automatically receives parent's context
const translatorAgent = new Agent({
  name: "Translator Agent",
  hooks: createHooks({
    onStart: ({ context }) => {
      // Access parent's userContext automatically
      const projectId = context.userContext.get("projectId");
      const language = context.userContext.get("language");
      console.log(`Translating for project ${projectId} to ${language}`);
    },
  }),
  instructions: "You are a skilled translator",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Supervisor agent with context
const supervisorAgent = new Agent({
  name: "Supervisor Agent",
  subAgents: [translatorAgent],
  hooks: createHooks({
    onEnd: ({ context }) => {
      // Access complete workflow history from all agents
      const allSteps = context.conversationSteps;
      console.log(`Total workflow steps: ${allSteps.length}`);
      // Includes supervisor's delegate_task calls + subagent's processing steps
    },
  }),
  instructions: "Coordinate translation workflow",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Usage - context automatically flows to subagents
const response = await supervisorAgent.streamText("Translate this text", {
  userContext: new Map([
    ["projectId", "proj-123"],
    ["language", "Spanish"],
  ]),
});

// Final context includes data from both supervisor and subagents
console.log("Project:", response.userContext?.get("projectId"));
```
