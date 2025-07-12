---
"@voltagent/core": patch
---

feat(core): Add ability to pass hooks into the generate functions (i.e. streamText) that do not update/mutate the agent hooks

### Usage

```ts
const agent = new Agent({
  name: "My Agent with Hooks",
  instructions: "An assistant demonstrating hooks",
  llm: provider,
  model: openai("gpt-4o"),
  hooks: myAgentHooks,
});

// both the myAgentHooks and the hooks passed in the generateText method will be called
await agent.generateText("Hello, how are you?", {
  hooks: {
    onEnd: async ({ context }) => {
      console.log("End of generation but only on this invocation!");
    },
  },
});
```
