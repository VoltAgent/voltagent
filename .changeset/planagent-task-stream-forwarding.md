---
"@voltagent/core": patch
---

feat: allow PlanAgent task tool to forward subagent stream events via supervisorConfig

Example:

```ts
const agent = new PlanAgent({
  name: "Supervisor",
  systemPrompt: "Delegate when helpful.",
  model: "openai/gpt-4o",
  task: {
    supervisorConfig: {
      fullStreamEventForwarding: {
        types: ["tool-call", "tool-result", "text-delta"],
      },
    },
  },
});
```
