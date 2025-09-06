# @voltagent/xsai-exporter

OpenTelemetry exporter for VoltAgent observability with xsAI.

<!-- ![VoltAgent + Vercel AI SDK Integration](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-multi-agent.gif) -->

## Installation

```bash
npm install @voltagent/xsai-exporter @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

## Quick Start

```typescript
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { createOpenAI } from "@xsai-ext/providers-cloud";
import { generateText } from "@xsai-ext/telemetry";

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

// Initialize OpenAI Provider
const openai = createOpenAI(process.env.OPENAI_API_KEY);

// Use xsAI as normal
const result = await generateText({
  model: openai.chat("gpt-4o-mini")
  messages: [{
    role: "user",
    content: "Hello, how are you?",
  }],
  telemetry: {
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
  model: openai.chat("gpt-4o-mini")
  messages: [{
    role: "user",
    content: "What's the weather like in Tokyo?",
  }],
  tools: [
    await tool({
      name: "weather",
      description: "Get weather information",
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { location, temperature: 22 };
      },
    })
  ],
  telemetry: {
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
  model: openai.chat("gpt-4o-mini")
  messages: [{
    role: "user",
    content: "Create a marketing plan",
  }],
  telemetry: {
    metadata: {
      agentId: "planning-agent",
      userId: "user-123",
      conversationId: "marketing-workflow",
    },
  },
});

// Child agent (with parent relationship)
const { text: execution } = await generateText({
  model: openai.chat("gpt-4o-mini")
  messages: [{
    role: "user",
    content: `Execute this plan: ${plan}`,
  }],
  telemetry: {
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
telemetry: {
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
👉 **[VoltAgent xsAI Integration Guide](https://voltagent.dev/voltops-llm-observability-docs/xsai/)**

What you'll find in the guide:

- Step-by-step setup instructions
- How to get API keys
- Multi-agent workflow examples
- Production best practices
- Troubleshooting guide

## Requirements

- Node.js 20+
- xsAI 0.4+
- OpenTelemetry SDK

## License

MIT
