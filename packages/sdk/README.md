# VoltAgent Observability SDK

Modern, type-safe, and developer-friendly SDK for tracking LLM agent workflows and observability.

## 🚀 Quick Start

```typescript
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";

const sdk = new VoltAgentObservabilitySDK({
  baseUrl: "https://api.voltagent.ai",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
});

// Start a trace (conversation/session)
const trace = await sdk.trace({
  name: "weather_query",
  agentId: "weather-agent-v1",
  input: { query: "What's the weather today?" },
  userId: "user_123",
});

// Add an agent
const agent = await trace.addAgent({
  name: "weather_processing",
  model: "gpt-4",
});

// Use tools
const weatherTool = await agent.addTool({
  name: "weather_api",
  input: { city: "Istanbul" },
});

await weatherTool.success({
  temperature: 22,
  condition: "sunny",
});

await agent.success({
  response: "It's 22°C and sunny!",
});

await trace.end("Query completed successfully");
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

- **Trace**: A complete conversation/session (creates a History record)
- **Agent**: An AI agent operating within a trace
- **Tool**: External service calls (APIs, databases, etc.)
- **Memory**: Data storage and retrieval operations
- **Retriever**: Information search and retrieval

### Event Hierarchy

```
Trace (History)
├── Agent 1
│   ├── Tool 1 → success/error
│   ├── Memory 1 → success/error
│   ├── Sub-Agent 1.1
│   │   └── Tool 1.1.1 → success/error
│   └── Agent 1 → success/error
└── Agent 2
    └── Retriever 1 → success/error
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
  // ... other History fields
});

// End trace
await trace.end(output?: any, status?: string);

// Add agents to trace
const agent = await trace.addAgent({
  name: string;
  input?: any;
  model?: string;
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

// Complete agent
await agent.success(output?: any);
await agent.error(error: Error);
```

### Tool/Memory/Retriever Operations

```typescript
// Success completion
await tool.success(output?: any);
await memory.success(output?: any);
await retriever.success(output?: any);

// Error handling
await tool.error(error: Error);
await memory.error(error: Error);
await retriever.error(error: Error);
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
  name: "weather_processing",
  model: "gpt-4",
});

// Call weather API
const weatherTool = await agent.addTool({
  name: "weather_api",
  input: { city: "Istanbul" },
});

await weatherTool.success({
  temperature: 22,
  condition: "sunny",
});

// Save to memory
const memory = await agent.addMemory({
  name: "cache_weather",
  input: { key: "istanbul_weather" },
});

await memory.success();

await agent.success({
  response: "It's 22°C and sunny in Istanbul!",
});

await trace.end();
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
  name: "researcher",
});

const search = await researcher.addRetriever({
  name: "web_search",
  input: { query: "AI trends 2024" },
});

await search.success({
  documents: ["doc1", "doc2"],
  relevance: [0.9, 0.8],
});

await researcher.success();

// Summary agent
const summarizer = await trace.addAgent({
  name: "summarizer",
});

// Translation sub-agent
const translator = await summarizer.addAgent({
  name: "translator",
});

const translateTool = await translator.addTool({
  name: "translate_api",
});

await translateTool.success({
  translatedText: "Türkçe özet...",
});

await translator.success();
await summarizer.success();
await trace.end();
```

### Error Handling

```typescript
const trace = await sdk.trace({
  name: "error_example",
  agentId: "test-agent",
});

const agent = await trace.addAgent({
  name: "risky_agent",
});

const riskyTool = await agent.addTool({
  name: "external_api",
});

try {
  // API call that might fail
  const result = await callExternalAPI();
  await riskyTool.success(result);
} catch (error) {
  await riskyTool.error(error);
  await agent.error(error);
  await trace.end(null, "error");
}
```

## 🔄 Migration from Old SDK

The new SDK is backward compatible. Existing code will continue to work:

```typescript
// Old way (still works)
const history = await sdk.createHistory({...});
await sdk.addEventToHistory(history.id, {...});

// New way (recommended)
const trace = await sdk.trace({...});
const agent = await trace.addAgent({...});
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

## 🧪 Testing

```bash
npm test
```

Run examples:

```bash
npm run examples
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Please read CONTRIBUTING.md for contribution guidelines.

## 🔗 Links

- [Documentation](https://docs.voltagent.ai)
- [API Reference](https://api.voltagent.ai/docs)
- [Examples](./examples/)
- [Changelog](./CHANGELOG.md)
