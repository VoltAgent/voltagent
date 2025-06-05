---
title: Trace ID
---

VoltOps supports custom traceId, agentId, and conversationId for linking events across services. This enables full traceability in multi-agent and distributed systems.

## Custom Agent IDs

You can assign agentId as a UUID to group related spans under the same agent, just like in the example below:

```javascript
const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1", // can be a UUID
  input: { query: "How to reset password?" },
  userId: "user-123",
  conversationId: "conv-456",
  tags: ["support", "password-reset"],
  metadata: {
    priority: "high",
    source: "web-chat",
  },
});
```

## Traceability Benefits

VoltOps uses this metadata to correlate logs, visualize sessions, and track agent performance across your distributed AI systems.
