---
"@voltagent/core": patch
"@voltagent/server-core": patch
---

feat: persist selected assistant message metadata to memory

You can enable persisted assistant message metadata at the agent level or per request.

```ts
const result = await agent.streamText("Hello", {
  memory: {
    userId: "user-1",
    conversationId: "conv-1",
    options: {
      messageMetadataPersistence: {
        usage: true,
        finishReason: true,
      },
    },
  },
});
```

With this enabled, fetching messages from memory returns assistant `UIMessage.metadata`
with fields like `usage` and `finishReason`, not just stream-time metadata.
