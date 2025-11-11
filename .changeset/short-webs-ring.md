---
"@voltagent/core": patch
---

fix: ensure sub-agent metadata is persisted alongside supervisor history so supervisor conversations know which sub-agent produced each tool event and memory record. You can now filter historical events the same way you handle live streams:

```ts
const memoryMessages = await memory.getMessages(userId, conversationId);

const formatterSteps = memoryMessages.filter(
  (message) => message.metadata?.subAgentId === "Formatter"
);

for (const message of formatterSteps) {
  console.log(`[${message.metadata?.subAgentName}]`, message.parts);
}
```

The same metadata also exists on live `fullStream` chunks, so you can keep the streaming UI and the historical memory explorer in sync.
