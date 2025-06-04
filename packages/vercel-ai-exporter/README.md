# @voltagent/vercel-ai-exporter

OpenTelemetry exporter for VoltAgent observability with Vercel AI SDK.

![VoltAgent + Vercel AI SDK Integration](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-multi-agent.gif)

## Installation

```bash
npm install @voltagent/vercel-ai-exporter @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
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
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  debug: true,
});

// Set up OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Use Vercel AI SDK as normal
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Hello, how are you?",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "my-assistant",
      userId: "user-123",
    },
  },
});

console.log(result.text);
```

## With Tools

```typescript
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "What's the weather like in Tokyo?",
  tools: {
    weather: {
      description: "Get weather information",
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { location, temperature: 22 };
      },
    },
  },
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "weather-assistant",
      userId: "user-123",
    },
  },
});
```

## Multi-Agent Example

```typescript
// Main agent
const { text: plan } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Create a marketing plan",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "planning-agent",
      userId: "user-123",
      conversationId: "marketing-workflow",
    },
  },
});

// Child agent (with parent relationship)
const { text: execution } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: `Execute this plan: ${plan}`,
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "execution-agent",
      parentAgentId: "planning-agent", // Parent relationship
      userId: "user-123",
      conversationId: "marketing-workflow",
    },
  },
});
```

## Features

- ✅ **Automatic Tracking**: AI calls and tool usage are automatically tracked
- ✅ **Multi-Agent Support**: Track multiple agents in the same workflow
- ✅ **Parent-Child Relationships**: Create agent hierarchies
- ✅ **TypeScript Support**: Full type safety
- ✅ **Vercel AI SDK Compatibility**: All features supported
- ✅ **Flexible Metadata**: Add custom metadata

## Metadata Options

```typescript
experimental_telemetry: {
  isEnabled: true,
  metadata: {
    agentId: "my-agent",              // Agent identifier
    parentAgentId: "parent-agent",    // Parent agent (optional)
    userId: "user-123",               // User ID
    conversationId: "conv-456",       // Conversation ID
    tags: ["marketing", "ai"],        // Tags
    instructions: "Agent instructions", // Agent description
    // ... other custom metadata
  },
}
```

## Learn More

**📖 For complete documentation and detailed examples:**  
👉 **[VoltAgent Vercel AI SDK Integration Guide](https://voltagent.dev/docs-observability/vercel-ai/)**

What you'll find in the guide:

- Step-by-step setup instructions
- How to get API keys
- Multi-agent workflow examples
- Production best practices
- Troubleshooting guide

## Requirements

- Node.js 18+
- Vercel AI SDK 3.0+
- OpenTelemetry SDK

## License

MIT
