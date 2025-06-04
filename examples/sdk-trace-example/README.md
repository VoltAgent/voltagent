# VoltAgent SDK Trace Example

This example demonstrates how to use the VoltAgent Observability SDK to track AI agents with full observability - traces, sub-agents, tools, memory operations, and more.

## Quick Start

```bash
npm install @voltagent/sdk
```

```typescript
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";

const sdk = new VoltAgentObservabilitySDK({
  baseUrl: "https://api.voltagent.dev",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
  autoFlush: true,
});

// Create a trace
const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  input: { query: "How to reset password?" },
});

// Add an agent
const agent = await trace.addAgent({
  name: "Support Agent",
  input: { query: "User needs password reset help" },
  instructions: "You are a customer support agent.",
});

// Complete the agent
await agent.success({
  output: { response: "Password reset instructions sent" },
  usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
});

// Complete the trace
await trace.end({
  output: { result: "Query resolved successfully" },
  status: "completed",
});
```

## Full Documentation

For complete setup instructions, detailed examples, and advanced features, visit:
**[📖 VoltAgent JavaScript/TypeScript SDK Documentation](https://voltagent.dev/docs-observability/js-ts-sdk/)**

## Prerequisites

Create an account at [https://console.voltagent.dev/](https://console.voltagent.dev/) to get your API keys.
