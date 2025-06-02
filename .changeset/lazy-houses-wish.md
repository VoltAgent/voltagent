---
"@voltagent/sdk": patch
---

feat: initial release of VoltAgent Observability SDK

A TypeScript SDK for monitoring AI agents and conversations with automatic event batching and structured tracing.

**Basic Usage:**

```typescript
const sdk = new VoltAgentObservabilitySDK({
  baseUrl: "https://api.voltagent.dev",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
  autoFlush: true,
  flushInterval: 3000,
});

const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  input: { query: "How to reset password?" },
  userId: "user-123",
  conversationId: "conv-456",
});

const agent = await trace.addAgent({
  name: "Support Agent",
  model: "gpt-4",
  input: { query: "User needs password reset help" },
});
```

Supports nested agent workflows, custom metadata, and automatic performance metrics collection.
