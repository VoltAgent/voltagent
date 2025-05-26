# @voltagent/vercel-ai-exporter

OpenTelemetry exporter for VoltAgent observability with Vercel AI SDK.

## Installation

```bash
npm install @voltagent/vercel-ai-exporter
# or
pnpm add @voltagent/vercel-ai-exporter
# or
yarn add @voltagent/vercel-ai-exporter
```

## Quick Start

```typescript
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Initialize VoltAgent exporter
const voltAgentExporter = new VoltAgentExporter({
  publicKey: "pk_your_public_key",
  secretKey: "sk_your_secret_key",
  baseUrl: "https://api.voltagent.com", // optional
  debug: true, // optional
});

// Set up OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Use Vercel AI SDK as normal
async function main() {
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "What is the meaning of life?",
    experimental_telemetry: {
      isEnabled: true,
      functionId: "my-ai-function",
      metadata: {
        userId: "user-123",
        sessionId: "session-456",
      },
    },
  });

  console.log(result.text);

  await sdk.shutdown(); // Ensures events are flushed to VoltAgent
}

main().catch(console.error);
```

## Multi-Agent Tracking

Track multiple AI agents working together in the same workflow using a shared `historyId`:

```typescript
import { randomUUID } from "node:crypto";

async function multiAgentWorkflow() {
  // Generate a shared history ID for all agents
  const sharedHistoryId = randomUUID();

  // Marketing Agent
  const { text: copy } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: "Write marketing copy for a new product",
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        historyId: sharedHistoryId, // Shared history
        agentId: "marketing-agent",
        userId: "user-123",
      },
    },
  });

  // Quality Check Agent
  const { object: qualityCheck } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      score: z.number(),
      recommendation: z.string(),
    }),
    prompt: `Evaluate this marketing copy: ${copy}`,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        historyId: sharedHistoryId, // Same shared history
        agentId: "quality-checker",
        parentAgentId: "marketing-agent", // Hierarchy
        userId: "user-123",
      },
    },
  });

  // Improvement Agent (if needed)
  if (qualityCheck.score < 7) {
    const { text: improvedCopy } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Improve this copy: ${copy}. ${qualityCheck.recommendation}`,
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          historyId: sharedHistoryId, // Same shared history
          agentId: "improvement-agent",
          parentAgentId: "marketing-agent", // Hierarchy
          userId: "user-123",
        },
      },
    });
  }
}
```

### Agent Hierarchy

Use `parentAgentId` to create agent hierarchies in VoltAgent dashboard:

```typescript
experimental_telemetry: {
  isEnabled: true,
  metadata: {
    historyId: "shared-workflow-id",
    agentId: "child-agent",
    parentAgentId: "parent-agent", // Creates hierarchy
    agentDisplayName: "Custom Agent Name", // Optional display name
  },
}
```

## Configuration Options

```typescript
interface VoltAgentExporterOptions {
  // VoltAgent SaaS backend
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;

  // Custom backend endpoint
  customEndpoint?: string;
  authToken?: string;

  // SDK options
  autoFlush?: boolean; // Default: true
  flushInterval?: number; // Default: 5000ms
  debug?: boolean; // Default: false

  // Filtering options
  enabledEventTypes?: string[]; // Default: all event types

  // Default agent configuration
  defaultAgentId?: string; // Default: "vercel-ai-agent"
  defaultUserId?: string;
  defaultConversationId?: string;
}
```

## Event Types

The exporter automatically converts Vercel AI SDK telemetry into VoltAgent timeline events:

- **Generation spans** → `agent:start`, `agent:success`, `agent:error` events
- **Tool call spans** → `tool:start`, `tool:success`, `tool:error` events
- **Embedding spans** → `retriever:start`, `retriever:success`, `retriever:error` events

## Custom Metadata

You can add custom metadata to your traces using Vercel AI SDK's telemetry:

```typescript
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Hello world",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      // Standard VoltAgent metadata
      historyId: "my-workflow-123",
      agentId: "my-custom-agent",
      parentAgentId: "parent-agent", // Optional hierarchy
      agentDisplayName: "My Custom Agent", // Optional display name
      userId: "user-123",
      conversationId: "session-456",
      tags: ["marketing", "automation"], // Custom tags

      // Any custom metadata
      "custom.feature": "experimental",
    },
  },
});
```

## Self-Hosted Backend

You can use VoltAgent exporter with your own backend:

```typescript
const exporter = new VoltAgentExporter({
  customEndpoint: "https://your-backend.com/api/voltagent",
  authToken: "your-auth-token",
  debug: true,
});
```

## Features

- ✅ **Type-safe**: Full TypeScript support with proper event types
- ✅ **Multi-agent support**: Track multiple agents in the same workflow
- ✅ **Agent hierarchies**: Create parent-child agent relationships
- ✅ **Framework-agnostic**: Uses OpenTelemetry standard for compatibility
- ✅ **Automatic mapping**: Converts Vercel AI spans to VoltAgent events
- ✅ **Batch processing**: Efficient event batching and flushing
- ✅ **Error handling**: Robust error handling with proper status reporting
- ✅ **Custom backends**: Support for both SaaS and self-hosted solutions
- ✅ **Filtering**: Configurable event type filtering
- ✅ **Usage tracking**: Automatic token usage and cost tracking

## Supported Vercel AI SDK Features

- `generateText()` and `streamText()`
- `generateObject()` and `streamObject()`
- Tool calls and tool results
- Embedding generations
- Multi-step conversations
- Custom metadata injection
- Multi-agent workflows

## Advanced Usage

### Filtering Event Types

```typescript
const exporter = new VoltAgentExporter({
  publicKey: "pk_...",
  secretKey: "sk_...",
  enabledEventTypes: ["agent:start", "agent:success", "tool:start", "tool:success"], // Only track these event types
});
```

### Custom Agent Configuration

```typescript
const exporter = new VoltAgentExporter({
  publicKey: "pk_...",
  secretKey: "sk_...",
  defaultAgentId: "my-ai-assistant",
  defaultUserId: "default-user",
  defaultConversationId: "main-conversation",
});
```

## Requirements

- Node.js 18+ or Edge Runtime
- Vercel AI SDK 3.0+ or 4.0+
- OpenTelemetry SDK

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.
