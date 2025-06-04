# VoltAgent Observability SDK

Modern, type-safe, and developer-friendly SDK for tracking LLM agent workflows and observability.

## 🚀 Quick Start

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
  flushInterval: 3000,
});

// Start a trace (conversation/session)
const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  input: { query: "How to reset password?" },
  userId: "user-123",
  conversationId: "conv-456",
  tags: ["support", "password-reset"],
});

// Add an agent
const agent = await trace.addAgent({
  name: "Support Agent",
  input: { task: "Handle password reset request" },
  instructions: "You are a helpful customer support agent.",
  metadata: {
    modelParameters: { model: "gpt-4" },
  },
});

// Use a tool
const searchTool = await agent.addTool({
  name: "knowledge-base-search",
  input: { query: "password reset procedure" },
});

await searchTool.success({
  output: {
    results: ["Reset via email", "Reset via SMS"],
    relevanceScore: 0.89,
  },
});

// Complete the workflow
await agent.success({
  output: { response: "Password reset link sent!" },
  usage: { promptTokens: 150, completionTokens: 85, totalTokens: 235 },
});

await trace.end({
  output: { result: "Query resolved successfully" },
});
```

## 📋 Features

✅ **Trace-based Architecture** - Industry standard observability patterns  
✅ **Hierarchical Events** - Agent → Tool/Memory/Retriever relationships  
✅ **Type Safety** - Full TypeScript support with discriminated unions  
✅ **Fluent API** - Intuitive method chaining  
✅ **Multi-Agent Support** - Sub-agents and complex workflows  
✅ **Error Handling** - Built-in error tracking and reporting  
✅ **Auto-flushing** - Automatic event batching and sending  
✅ **Backward Compatible** - Existing code continues to work

## 🏗️ Architecture

### Core Concepts

- **Trace**: A complete conversation/session (the main execution context)
- **Agent**: An AI agent operating within a trace
- **Tool**: External service calls (APIs, databases, etc.)
- **Memory**: Data storage and retrieval operations
- **Retriever**: Information search and retrieval

### Event Hierarchy

```
Trace
├── Agent 1
│   ├── Tool 1 → success/error
│   ├── Memory 1 → success/error
│   ├── Sub-Agent 1.1
│   │   └── Tool 1.1.1 → success/error
│   └── Agent 1 → success/error
└── Agent 2
    └── Retriever 1 → success/error
```

## 📚 Step-by-Step Guide

### 1. Initialize the SDK

```typescript
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";

const sdk = new VoltAgentObservabilitySDK({
  baseUrl: "https://api.voltagent.dev",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
  autoFlush: true,
  flushInterval: 3000,
});
```

> **Prerequisites**: Create an account at [https://console.voltagent.dev/](https://console.voltagent.dev/) and set up an organization and project to get your API keys.

### 2. Create a Trace

A trace represents one complete agent execution session. Every agent operation must happen within a trace.

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

### 3. Add an Agent to the Trace

```typescript
const agent = await trace.addAgent({
  name: "Support Agent",
  input: { query: "User needs password reset help" },
  instructions:
    "You are a customer support agent specialized in helping users with account issues.",
  metadata: {
    modelParameters: {
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 1000,
    },
    role: "customer-support",
    specialization: "account-issues",
  },
});
```

### 4. Add Tools, Memory, and Retrievers

#### Tools (External API calls)

```typescript
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

// Tool success
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

// Tool error (if needed)
await searchTool.error({
  statusMessage: new Error("Database connection timeout"),
  metadata: {
    database: "support-kb",
    timeoutMs: 5000,
  },
});
```

#### Memory Operations

```typescript
const memoryOp = await agent.addMemory({
  name: "user-context-storage",
  input: {
    key: "user_123_context",
    value: {
      lastLogin: "2024-01-15",
      accountType: "premium",
    },
    ttl: 3600,
  },
  metadata: {
    type: "redis",
    region: "us-east-1",
  },
});

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

#### Retrieval Operations

```typescript
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

await retriever.success({
  output: {
    documents: [
      "Premium users can reset passwords instantly via email",
      "Password reset requires 2FA verification for premium accounts",
    ],
    relevanceScores: [0.95, 0.88],
  },
  metadata: {
    searchTime: "0.3s",
    documentsScanned: 1500,
  },
});
```

### 5. Working with Sub-Agents

Create hierarchical agent structures for complex workflows:

```typescript
// Create a sub-agent under the main agent
const policyChecker = await agent.addAgent({
  name: "Policy Checker",
  input: {
    userId: "user-123",
    requestType: "password-reset",
  },
  instructions: "You verify customer requests against company policies.",
  metadata: {
    role: "policy-verification",
    parentAgent: agent.id,
    modelParameters: {
      model: "gpt-4",
    },
  },
});

// Add a tool to the sub-agent
const verificationTool = await policyChecker.addTool({
  name: "policy-verification",
  input: { userId: "user-123", action: "password-reset" },
});

await verificationTool.success({
  output: { policyCompliant: true, requiredVerification: "2fa-sms" },
});

// Complete the sub-agent
await policyChecker.success({
  output: {
    policyCompliant: true,
    approvalGranted: true,
  },
  usage: {
    promptTokens: 85,
    completionTokens: 45,
    totalTokens: 130,
  },
  metadata: {
    policiesChecked: ["password-policy", "premium-user-policy"],
    complianceScore: 0.95,
  },
});
```

### 6. Complete the Agent and Trace

```typescript
// Complete the main agent
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

// Complete the trace
await trace.end({
  output: {
    result: "Customer support query resolved successfully",
    resolution: "password-reset-completed",
  },
  status: "completed",
  usage: {
    promptTokens: 150,
    completionTokens: 85,
    totalTokens: 235,
  },
  metadata: {
    totalAgents: 2,
    totalOperations: 4,
    successRate: 1.0,
  },
});
```

## 📚 API Reference

### SDK Initialization

```typescript
const sdk = new VoltAgentObservabilitySDK({
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  autoFlush?: boolean; // default: true
  flushInterval?: number; // default: 5000ms
});
```

### Creating Traces

```typescript
const trace = await sdk.trace({
  name: string;
  agentId: string; // The main agent identifier
  input?: any;
  userId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
});
```

### Trace Operations

```typescript
// Update trace metadata
await trace.update({
  status?: string;
  metadata?: Record<string, unknown>;
  // ... other trace fields
});

// End trace - Success
await trace.end({
  output?: any;
  status?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  metadata?: Record<string, unknown>;
});

// End trace - Error
await trace.end({
  output?: any;
  status: "error";
  metadata?: Record<string, unknown>;
});

// Add agents to trace
const agent = await trace.addAgent({
  name: string;
  input?: any;
  instructions?: string;
  metadata?: Record<string, unknown>;
});
```

### Agent Operations

```typescript
// Add sub-agents
const subAgent = await agent.addAgent(options);

// Add tools
const tool = await agent.addTool({
  name: string;
  input?: any;
  metadata?: Record<string, unknown>;
});

// Add memory operations
const memory = await agent.addMemory({
  name: string;
  input?: any;
  metadata?: Record<string, unknown>;
});

// Add retrieval operations
const retriever = await agent.addRetriever({
  name: string;
  input?: any;
  metadata?: Record<string, unknown>;
});

// Complete agent - Success
await agent.success({
  output?: any;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  metadata?: Record<string, unknown>;
});

// Complete agent - Error
await agent.error({
  statusMessage: Error | string | object;
  stage?: string;
  metadata?: Record<string, unknown>;
});
```

### Tool/Memory/Retriever Operations

```typescript
// Success completion
await tool.success({
  output?: any;
  metadata?: Record<string, unknown>;
});

await memory.success({
  output?: any;
  metadata?: Record<string, unknown>;
});

await retriever.success({
  output?: any;
  metadata?: Record<string, unknown>;
});

// Error handling
await tool.error({
  statusMessage: Error | string | object;
  metadata?: Record<string, unknown>;
});

await memory.error({
  statusMessage: Error | string | object;
  metadata?: Record<string, unknown>;
});

await retriever.error({
  statusMessage: Error | string | object;
  metadata?: Record<string, unknown>;
});
```

## 🔧 Usage Examples

### Simple Weather Agent

```typescript
const trace = await sdk.trace({
  name: "weather_query",
  agentId: "weather-agent-v1",
  input: { query: "Weather in Istanbul?" },
});

const agent = await trace.addAgent({
  name: "Weather Agent",
  instructions: "You provide accurate weather information.",
  metadata: { modelParameters: { model: "gpt-4" } },
});

// Call weather API
const weatherTool = await agent.addTool({
  name: "weather_api",
  input: { city: "Istanbul" },
});

await weatherTool.success({
  output: {
    temperature: 22,
    condition: "sunny",
    humidity: 65,
  },
});

// Save to memory
const memory = await agent.addMemory({
  name: "cache_weather",
  input: { key: "istanbul_weather", value: { temp: 22, condition: "sunny" } },
});

await memory.success({
  output: { cached: true, expiresIn: 3600 },
});

await agent.success({
  output: { response: "It's 22°C and sunny in Istanbul!" },
  usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
});

await trace.end({
  output: { result: "Weather query completed" },
  status: "completed",
});
```

### Multi-Agent Research Workflow

```typescript
const trace = await sdk.trace({
  name: "research_workflow",
  agentId: "orchestrator",
  input: { topic: "AI trends 2024" },
});

// Research agent
const researcher = await trace.addAgent({
  name: "Research Agent",
  instructions: "You research and gather information on given topics.",
  metadata: { modelParameters: { model: "gpt-4" } },
});

const search = await researcher.addRetriever({
  name: "web_search",
  input: { query: "AI trends 2024", maxResults: 10 },
});

await search.success({
  output: {
    documents: ["AI trend doc 1", "AI trend doc 2"],
    relevanceScores: [0.9, 0.8],
    totalResults: 10,
  },
});

await researcher.success({
  output: { researchComplete: true, documentsFound: 10 },
  usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
});

// Summary agent
const summarizer = await trace.addAgent({
  name: "Summary Agent",
  instructions: "You create comprehensive summaries from research data.",
  metadata: { modelParameters: { model: "gpt-4" } },
});

// Translation sub-agent
const translator = await summarizer.addAgent({
  name: "Translation Agent",
  instructions: "You translate content to different languages.",
  metadata: { modelParameters: { model: "gpt-3.5-turbo" } },
});

const translateTool = await translator.addTool({
  name: "translate_api",
  input: { text: "AI trends summary", targetLanguage: "tr" },
});

await translateTool.success({
  output: { translatedText: "AI eğilimleri özeti..." },
});

await translator.success({
  output: { translation: "Turkish translation completed" },
  usage: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
});

await summarizer.success({
  output: { summary: "Comprehensive AI trends summary with translation" },
  usage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 },
});

await trace.end({
  output: { result: "Research workflow completed successfully" },
  status: "completed",
});
```

### Error Handling

```typescript
const trace = await sdk.trace({
  name: "error_handling_example",
  agentId: "test-agent",
});

const agent = await trace.addAgent({
  name: "Risky Agent",
  instructions: "You handle operations that might fail.",
});

const riskyTool = await agent.addTool({
  name: "external_api",
  input: { endpoint: "https://unreliable-api.com" },
});

try {
  // Simulate API call that might fail
  const result = await callExternalAPI();
  await riskyTool.success({
    output: result,
    metadata: { responseTime: "1.2s" },
  });

  await agent.success({
    output: { result: "Operation completed successfully" },
  });
} catch (error) {
  // Handle tool error
  await riskyTool.error({
    statusMessage: error,
    metadata: {
      errorCode: "API_TIMEOUT",
      retryAttempts: 3,
    },
  });

  // Handle agent error
  await agent.error({
    statusMessage: new Error("Agent failed due to tool error"),
    stage: "tool_execution",
    metadata: {
      failedTool: "external_api",
      errorType: "TIMEOUT",
    },
  });

  // End trace with error
  await trace.end({
    output: { error: "Workflow failed" },
    status: "error",
    metadata: { errorStage: "tool_execution" },
  });
}
```

## 🏷️ Event Types

### Agent Events

- `agent:start` - Agent begins processing
- `agent:success` - Agent completes successfully
- `agent:error` - Agent encounters an error

### Tool Events

- `tool:start` - Tool call begins
- `tool:success` - Tool call succeeds
- `tool:error` - Tool call fails

### Memory Events

- `memory:read_start` / `memory:read_success` / `memory:read_error`
- `memory:write_start` / `memory:write_success` / `memory:write_error`

### Retriever Events

- `retriever:start` - Retrieval begins
- `retriever:success` - Retrieval succeeds
- `retriever:error` - Retrieval fails

## 💡 Best Practices

1. **Always call `sdk.flush()`** before your application exits to ensure all events are sent
2. **Use meaningful names** for traces, agents, tools, and operations to improve debugging
3. **Include relevant metadata** for debugging and analytics, but avoid sensitive data
4. **Track token usage** in the `usage` field, not metadata, for proper cost tracking
5. **Handle errors properly** with descriptive error messages and relevant context
6. **Use hierarchical agents** for complex workflows to maintain clear operation flow
7. **Set appropriate tags** on traces for easy filtering and search in the dashboard
8. **Use structured error objects** instead of plain strings for better error analysis
9. **Include timing metadata** for performance monitoring and optimization
10. **Group related operations** under the same agent for logical organization

## 🧪 Testing

```bash
npm test
```

Run examples:

```bash
npm run examples
```

## 🔗 Links

- [Documentation](https://voltagent.dev/docs-observability/)
- [Console Dashboard](https://console.voltagent.dev)
- [API Reference](https://voltagent.dev/docs-observability/)

## 📄 License

MIT License - see LICENSE file for details.
