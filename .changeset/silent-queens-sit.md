---
"@voltagent/core": patch
---

feat: auto-inherit VoltAgent spans for wrapped agent calls

Agent calls now attach to the active VoltAgent workflow/agent span by default when `parentSpan` is not provided. This keeps wrapper logic (like `andThen` + `generateText`) inside the same trace without needing `andAgent`. Ambient framework spans are still ignored; only VoltAgent workflow/agent spans are eligible.

Example:

```ts
const contentAgent = new Agent({
  name: "ContentAgent",
  model: "openai/gpt-4o-mini",
  instructions: "Write concise summaries.",
});

const wrappedAgentWorkflow = createWorkflowChain({
  id: "wrapped-agent-call",
  name: "Wrapped Agent Call Workflow",
  input: z.object({ topic: z.string() }),
  result: z.object({ summary: z.string() }),
}).andThen({
  id: "maybe-call-agent",
  execute: async ({ data }) => {
    const { text } = await contentAgent.generateText(
      `Write a single-sentence summary about: ${data.topic}`
    );
    return { summary: text.trim() };
  },
});
```

Opt out when you want a fresh trace:

```ts
await contentAgent.generateText("...", { inheritParentSpan: false });
```
