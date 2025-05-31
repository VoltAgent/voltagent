---
title: JavaScript/TypeScript SDK
---

# JavaScript/TypeScript SDK

Track your AI agents with full observability - traces, sub-agents, tools, memory operations, and more.

## Installation

```bash
npm install @voltagent/sdk
```

## Quick Start

### 1. Initialize SDK

```typescript
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";

const sdk = new VoltAgentObservabilitySDK({
  baseUrl: "https://api.voltagent.dev",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
  autoFlush: true, // Auto-send events
  flushInterval: 3000, // Send every 3 seconds
});
```

### 2. Create a Trace

A trace represents one complete agent execution session.

```typescript
const trace = await sdk.trace({
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

### 3. Add Main Agent

```typescript
const agent = await trace.addAgent({
  name: "Support Agent",
  input: { query: "User needs password reset help" },
  model: "gpt-4",
  metadata: {
    role: "customer-support",
    specialization: "account-issues",
  },
});
```

## Working with Tools

### Add and Execute Tools

```typescript
// Start tool
const searchTool = await agent.addTool({
  name: "knowledge-base-search",
  input: {
    query: "password reset procedure",
    maxResults: 5,
  },
  metadata: {
    searchType: "semantic",
    database: "support-kb",
  },
});

// Tool succeeds
await searchTool.success({
  output: {
    results: ["Reset via email", "Reset via SMS", "Contact support"],
    count: 3,
    relevanceScore: 0.89,
  },
  metadata: {
    searchTime: "0.2s",
    indexUsed: "support-kb-v2",
  },
});

// Tool fails with Error object
await searchTool.error({
  statusMessage: new Error("Database connection timeout"),
  metadata: {
    database: "support-kb",
    timeoutMs: 5000,
  },
});

// Tool fails with custom structured error
await searchTool.error({
  statusMessage: {
    message: "Database connection timeout",
    code: "DB_TIMEOUT",
    details: { timeoutMs: 5000 },
  },
  metadata: {
    database: "support-kb",
    timeoutMs: 5000,
  },
});
```

## Working with Memory

### Add Memory Operations

```typescript
// Start memory operation
const memoryOp = await agent.addMemory({
  name: "user-context-storage",
  input: {
    key: "user_123_context",
    value: {
      lastLogin: "2024-01-15",
      accountType: "premium",
      preferences: { language: "en" },
    },
    ttl: 3600, // 1 hour
  },
  metadata: {
    storageType: "redis",
    region: "us-east-1",
  },
});

// Memory operation succeeds
await memoryOp.success({
  output: {
    stored: true,
    key: "user_123_context",
    expiresAt: "2024-01-15T15:00:00Z",
  },
  metadata: {
    cacheHit: false,
    storageLatency: "2ms",
  },
});
```

## Working with Retrievers

### Add Retrieval Operations

```typescript
// Start retriever
const retriever = await agent.addRetriever({
  name: "policy-document-retriever",
  input: {
    query: "password reset policy for premium users",
    maxDocuments: 3,
    threshold: 0.8,
  },
  metadata: {
    vectorStore: "pinecone",
    embeddingModel: "text-embedding-ada-002",
  },
});

// Retrieval succeeds
await retriever.success({
  output: {
    documents: [
      "Premium users can reset passwords instantly via email",
      "Password reset requires 2FA verification for premium accounts",
      "Premium users have 24/7 phone support for password issues",
    ],
    relevanceScores: [0.95, 0.88, 0.82],
  },
  metadata: {
    searchTime: "0.3s",
    documentsScanned: 1500,
  },
});
```

## Working with Sub-Agents

### Create Agent Hierarchies

```typescript
// Main coordinator agent
const coordinator = await trace.addAgent({
  name: "Support Coordinator",
  input: { task: "Handle complex password reset case" },
  model: "gpt-4",
});

// Sub-agent for policy checking
const policyChecker = await coordinator.addAgent({
  name: "Policy Checker",
  input: {
    userId: "user-123",
    requestType: "password-reset",
  },
  model: "gpt-4",
  metadata: {
    role: "policy-verification",
    parentAgent: coordinator.id,
  },
});

// Sub-sub-agent for verification
const verifier = await policyChecker.addAgent({
  name: "2FA Verifier",
  input: { userId: "user-123" },
  model: "gpt-3.5-turbo",
  metadata: {
    role: "two-factor-auth",
    parentAgent: policyChecker.id,
  },
});

// Complete sub-agents in order
await verifier.success({
  output: {
    verified: true,
    method: "sms",
    timestamp: new Date().toISOString(),
  },
});

await policyChecker.success({
  output: {
    policyCompliant: true,
    requiredVerification: "2fa-sms",
    approvalGranted: true,
  },
});

await coordinator.success({
  output: {
    resolution: "Password reset approved and processed",
    subAgentsUsed: 2,
    totalProcessingTime: "3.2s",
  },
});
```

## Agent Success and Error Handling

### Agent Success with Usage Tracking

```typescript
await agent.success({
  output: {
    response: "Password reset link sent to user's email",
    actionTaken: "email-reset-link",
    userSatisfied: true,
  },
  usage: {
    promptTokens: 150,
    completionTokens: 85,
    totalTokens: 235,
  },
  metadata: {
    responseTime: "2.1s",
    confidenceScore: 0.95,
  },
});
```

### Agent Error Handling

```typescript
// Using Error object
await agent.error({
  statusMessage: new Error("Unable to send reset email"),
  stage: "email_delivery",
  metadata: {
    emailProvider: "sendgrid",
    userEmail: "user@example.com",
  },
});

// Using custom structured error
await agent.error({
  statusMessage: {
    message: "Unable to send reset email",
    code: "EMAIL_DELIVERY_FAILED",
    details: {
      provider: "sendgrid",
      errorCode: "SMTP_TIMEOUT",
    },
  },
  stage: "email_delivery",
  metadata: {
    emailProvider: "sendgrid",
    userEmail: "user@example.com",
    errorCode: "SMTP_TIMEOUT",
  },
});
```

## Completing Traces

### Successful Trace Completion

```typescript
await trace.end({
  output: {
    result: "Password reset completed successfully",
    userSatisfaction: "high",
    resolutionTime: "45 seconds",
  },
  status: "completed",
  usage: {
    promptTokens: 450,
    completionTokens: 280,
    totalTokens: 730,
  },
  metadata: {
    totalAgents: 3,
    totalOperations: 6,
    successRate: 1.0,
  },
});
```

### Failed Trace Completion

```typescript
await trace.end({
  output: {
    statusMessage: {
      message: "Could not complete password reset",
      code: "RESET_FAILED",
      details: { reason: "Email delivery service unavailable" },
    },
  },
  status: "error",
  metadata: {
    totalErrors: 2,
    lastErrorTime: new Date().toISOString(),
  },
});
```

## Complete Example

```typescript
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";

const sdk = new VoltAgentObservabilitySDK({
  baseUrl: process.env.VOLTAGENT_BASE_URL,
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  autoFlush: true,
});

async function handleUserQuery() {
  // 1. Start trace
  const trace = await sdk.trace({
    name: "User Query Processing",
    agentId: "query-processor-v1",
    input: { query: "What's the weather in Tokyo?" },
  });

  try {
    // 2. Add main agent
    const agent = await trace.addAgent({
      name: "Query Processor",
      input: { query: "What's the weather in Tokyo?" },
      model: "gpt-4",
    });

    // 3. Add tool for weather API
    const weatherTool = await agent.addTool({
      name: "weather-api",
      input: { city: "Tokyo" },
    });

    // 4. Simulate API call and report success
    const weatherData = await callWeatherAPI("Tokyo");
    await weatherTool.success({
      output: {
        temperature: weatherData.temperature,
        condition: weatherData.condition,
      },
    });

    // 5. Complete agent
    await agent.success({
      output: {
        response: `Weather in Tokyo is ${weatherData.temperature}°C and ${weatherData.condition}`,
      },
      usage: {
        promptTokens: 45,
        completionTokens: 25,
        totalTokens: 70,
      },
    });

    // 6. Complete trace
    await trace.end({
      output: {
        result: "Query processed successfully",
      },
      status: "completed",
    });
  } catch (error) {
    // Handle errors
    await trace.end({
      output: {
        error: "Query processing failed",
      },
      status: "error",
    });
  } finally {
    // 7. Cleanup
    await sdk.flush();
    await sdk.shutdown();
  }
}
```

## Environment Setup

Create a `.env` file:

```bash
VOLTAGENT_BASE_URL=https://api.voltagent.dev
VOLTAGENT_PUBLIC_KEY=your-public-key
VOLTAGENT_SECRET_KEY=your-secret-key
```

## Best Practices

1. **Always call `sdk.flush()`** before your application exits
2. **Use meaningful names** for traces, agents, tools, and operations
3. **Include relevant metadata** for debugging and analytics
4. **Track token usage** in the `usage` field, not metadata
5. **Handle errors properly** with descriptive error messages
6. **Use hierarchical agents** for complex workflows
7. **Set appropriate tags** for easy filtering and search

## API Reference

See our [API documentation](/api-reference) for complete type definitions and advanced usage patterns.
