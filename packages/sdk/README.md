# VoltAgent SDK

Client SDK for interacting with VoltAgent API. This SDK provides type-safe methods for working with the VoltAgent API.

## Installation

```bash
npm install @voltagent/sdk
# or
yarn add @voltagent/sdk
# or
pnpm add @voltagent/sdk
```

## Usage

### High-Level API (Recommended)

The high-level API provides a more convenient way to work with histories and events:

```typescript
import { VoltAgentSDK } from "@voltagent/sdk";

const sdk = new VoltAgentSDK({
  baseUrl: "https://api.voltagent.com",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
  autoFlush: true, // Automatically sends queued events
  flushInterval: 5000, // Flush every 5 seconds
});

// Create a history with wrapper
const history = await sdk.createHistory({
  agent_id: "agent-123",
  userId: "user-456",
  status: "active",
  input: { query: "Hello, how can you help me?" },
  metadata: { source: "web-app" },
});

// Update history easily
await history.update({
  output: { response: "I can help you with various tasks!" },
});

// Add events to the history
await history.addEvent({
  name: "memory:read_success",
  type: "memory",
  startTime: new Date().toISOString(),
  status: "completed",
});

// End the history
await history.end();

// Shutdown SDK (flushes remaining events)
await sdk.shutdown();
```

### Batch Operations

```typescript
// Queue events for batch processing
sdk.queueEvent(history.id, {
  name: "tool:start",
  type: "tool",
  startTime: new Date().toISOString(),
});

sdk.queueEvent(history.id, {
  name: "tool:success",
  type: "tool",
  startTime: new Date().toISOString(),
  status: "completed",
});

// Manually flush queued events
await sdk.flush();
```

### Low-Level API (Advanced)

For more control, you can use the core client directly:

```typescript
import { VoltAgentClient } from "@voltagent/sdk";

const client = new VoltAgentClient({
  baseUrl: "https://api.voltagent.com",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
});

// Create a history
const history = await client.addHistory({
  agent_id: "agent-123",
  userId: "user-456",
  status: "active",
  input: { query: "Hello, how can you help me?" },
  metadata: { source: "web-app" },
});

// Update history
await client.updateHistory({
  id: history.id,
  status: "completed",
  output: { response: "I can help you with various tasks!" },
  completionStartTime: new Date().toISOString(),
});

// Add an event
await client.addEvent({
  historyId: history.id,
  event: {
    name: "memory:read_success",
    type: "memory",
    startTime: new Date().toISOString(),
    status: "completed",
  },
});
```

## API Reference

See [API Reference](https://docs.voltagent.com/sdk) for detailed documentation.

## License

MIT
