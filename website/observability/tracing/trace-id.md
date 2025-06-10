---
title: Trace ID
---

VoltOps supports custom traceId, agentId, and conversationId for linking events across services. This enables full traceability in multi-agent and distributed systems.

## Custom IDs

You can assign agentId as a UUID to group related spans under the same agent, just like in the example below:

**JavaScript/TypeScript**

```javascript
const trace = await sdk.trace({
  id: "ac4a4570-6433-4095-982b-f662f7f12d28" // can be a UUID
  name: "Customer Support Query",
  agentId: "support-agent-v1",
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

**Python**

```python
async with sdk.trace(
    id="ac4a4570-6433-4095-982b-f662f7f12d28", // can be a UUID
    agentId="support-agent-v1",
    input={"query": "How to reset password?"},
    userId="user-123",
    conversationId="conv-456",
    tags=["support", "password-reset"],
    metadata={
        "priority": "high",
        "source": "web-chat",
    },
) as trace:
    print(f"Trace created: {trace.id}")
    # Trace automatically ends when exiting context
```
