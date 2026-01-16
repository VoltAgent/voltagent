---
"@voltagent/core": patch
---

feat: PlanAgent supports dynamic systemPrompt functions with prompt merging

### What's New

- `systemPrompt` can now be a function that resolves per request (string or VoltOps prompt payload).
- Base PlanAgent instructions and extension prompts are appended consistently for dynamic prompts.

### Usage

```ts
import { PlanAgent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new PlanAgent({
  name: "DynamicPlanner",
  model: openai("gpt-4o"),
  systemPrompt: async ({ context }) => {
    const tenant = context.get("tenant") ?? "default";
    return `Tenant: ${tenant}. Keep answers concise.`;
  },
});

const context = new Map<string | symbol, unknown>();
context.set("tenant", "acme");

const result = await agent.generateText("Summarize the roadmap", { context });
console.log(result.text);
```

Chat-style prompt support:

```ts
const agent = new PlanAgent({
  name: "DynamicChatPlanner",
  model: openai("gpt-4o"),
  systemPrompt: async () => ({
    type: "chat",
    messages: [{ role: "system", content: "You are a precise planner." }],
  }),
});
```
