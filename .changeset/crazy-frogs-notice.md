---
"@voltagent/core": patch
---

- preserve Anthropic-compatible providerOptions on system messages - #593

```ts
const agent = new Agent({
  name: "Cacheable System",
  model: anthropic("claude-3-7-sonnet-20250219"),
  instructions: {
    type: "chat",
    messages: [
      {
        role: "system",
        content: "remember to use cached context",
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral", ttl: "5m" } },
        },
      },
    ],
  },
});

await agent.generateText("ping"); // providerOptions now flow through unchanged
```
