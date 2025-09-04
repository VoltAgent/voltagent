---
title: xsAI
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# xsAI Integration

VoltOps LLM Observability now works framework-agnostic and provides direct integration with [xsAI](https://xsai.js.org/docs/). This allows you to add observability to your existing xsAI applications with minimal changes.

<!-- ![xsAI Integration](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-multi-agent.gif) -->

## Installation

First, install the required packages:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm install @voltagent/xsai-exporter @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm add @voltagent/xsai-exporter @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @voltagent/xsai-exporter @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
    ```
  </TabItem>
</Tabs>

## Configuration

### Get Your API Keys

You'll need to get your API keys from VoltOps LLM Observability Platform:

1. **Sign up** at [console.voltagent.dev](https://console.voltagent.dev)
2. **Create an organization** for your team/company
3. **Create a project** within your organization
4. **Get your keys** from the project settings:
   - `VOLTAGENT_PUBLIC_KEY` - For client identification
   - `VOLTAGENT_SECRET_KEY` - For secure server communication

### Setup VoltAgent Exporter

Set up VoltAgent exporter in your application (typically in your main file):

```typescript
import { VoltAgentExporter } from "@voltagent/xsai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

// Create VoltAgent exporter
const voltAgentExporter = new VoltAgentExporter({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  baseUrl: "https://api.voltagent.dev", // default
  debug: true, // set to true for development
});

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

## Basic Telemetry

Start with the minimal setup - just replace your `xsai` package with `@xsai-ext/telemetry`:

```typescript
import { createOpenAI } from "@xsai-ext/providers-cloud";
import { generateText } from "@xsai-ext/telemetry"; // That's it! VoltAgent will track this with a default agent

const openai = createOpenAI(process.env.OPENAI_API_KEY);

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

console.log("Assistant:", result.text);
```

<!-- ![xsAI Integration Basic Example](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-basic.gif) -->

**✅ What you get:**

- AI calls tracked in VoltOps LLM Observability Platform
- Basic execution flow visibility
- All activities grouped under "ai-assistant" (default)

:::tip You'll see this helpful message

```
📋 VoltAgent: Using default agent for tracking.
💡 For better tracking, add agentId to your metadata:
   telemetry: {
     metadata: { agentId: 'my-agent' }
   }
```

This is completely normal! VoltAgent automatically uses a default agent when no `agentId` is provided. We'll show you how to customize this in the next sections.
:::

<!-- GIF placeholder: Basic telemetry showing default agent in console -->
<!-- ![Basic Telemetry](placeholder-basic-telemetry.gif) -->

## With Tools

Same minimal setup, but now with tools to see how tool usage is tracked:

```typescript
import { createOpenAI } from "@xsai-ext/providers-cloud";
import { generateText } from "@xsai-ext/telemetry";
import { z } from "zod";

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
        location: z.string().describe("The location to get the weather for"),
      }),
      execute: async ({ location }) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        };
      },
    })
  ],
  maxSteps: 5,
});

console.log("Assistant:", result.text);
```

**✅ What you get additionally:**

- Tool calls tracked and visualized
- Tool inputs and outputs visible
- Tool execution timeline
- Still grouped under default agent

<!-- ![Vercel AI SDK Integration Basic Example](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-tools.gif) -->

## With Metadata

Now make tracking much more powerful by adding an agent identifier:

```typescript
import { createOpenAI } from "@xsai-ext/providers-cloud";
import { generateText } from "@xsai-ext/telemetry";
import { z } from "zod";

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
        location: z.string().describe("The location to get the weather for"),
      }),
      execute: async ({ location }) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        };
      },
    })
  ],
  maxSteps: 5,
  telemetry: {
    metadata: {
      agentId: "weather-assistant",
      instructions: "You are a helpful weather assistant",
    },
  },
});

console.log("Assistant:", result.text);
```

<!-- ![Vercel AI SDK Integration Basic Example](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-agentid.gif) -->

**✅ What you get additionally:**

- Your agent is now tracked under "weather-assistant" name
- Instructions are visible in the console
- Better organized execution history
- More meaningful tracking data

## With Additional Metadata

You can provide additional context about the execution:

```typescript
import { createOpenAI } from "@xsai-ext/providers-cloud";
import { generateText } from "@xsai-ext/telemetry";

const openai = createOpenAI(process.env.OPENAI_API_KEY);

const result = await generateText({
  model: openai.chat("gpt-4o-mini"),
  messages: [
    {
      role: "user",
      content: "Tell me a joke",
    },
  ],
  telemetry: {
    metadata: {
      agentId: "comedy-assistant",
      instructions: "You are a fun comedian assistant",
      userId: "user123",
      sessionId: "session456",
      // Any additional context you want to track
      environment: "production",
      version: "1.2.0",
    },
  },
});

console.log("Assistant:", result.text);
```

<!-- ![Vercel AI SDK Integration Basic Example](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-metadata.gif) -->

**✅ What you get additionally:**

- User and session tracking
- Environment context
- Version information
- Custom metadata for filtering and analysis

## Multi-Agent Workflows

Track different agent roles within the same application:

```typescript
import { createOpenAI } from "@xsai-ext/providers-cloud";
import { generateText } from "@xsai-ext/telemetry";

const openai = createOpenAI(process.env.OPENAI_API_KEY);

// Research agent
const researchResult = await generateText({
  model: openai.chat("gpt-4o-mini")
  messages: [{
    role: "user",
    content: "Research information about renewable energy trends",
  }],
  telemetry: {
    metadata: {
      agentId: "research-agent",
      instructions: "You are a research specialist focused on gathering factual information",
      role: "researcher",
    },
  },
});

// Writing agent
const articleResult = await generateText({
  model: openai.chat("gpt-4o-mini")
  messages: [{
    role: "user",
    content: `Write an article based on this research: ${researchResult.text}`,
  }],
  telemetry: {
    metadata: {
      agentId: "writing-agent",
      instructions: "You are a professional writer who creates engaging articles",
      role: "writer",
    },
  },
});

// Review agent
const reviewResult = await generateText({
  model: openai.chat("gpt-4o-mini")
  messages: [{
    role: "user",
    content: `Review and improve this article: ${articleResult.text}`,
  }],
  telemetry: {
    metadata: {
      agentId: "review-agent",
      instructions: "You are an editor who reviews and improves content",
      role: "editor",
    },
  },
});

console.log("Final article:", reviewResult.text);
```

<!-- ![Vercel AI SDK Integration Basic Example](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-multi-agent.gif) -->

**✅ What you get with multi-agent tracking:**

- Each agent tracked separately in the console
- Clear visualization of agent interactions
- Role-based organization
- Workflow understanding across agents

## Complete Example

Here's a complete example showing the progression:

```typescript
import { createOpenAI } from "@xsai-ext/providers-cloud";
import { generateText, tool } from "@xsai-ext/telemetry";
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { z } from "zod";

const openai = createOpenAI(process.env.OPENAI_API_KEY);

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

// Run examples
async function main() {
  console.log("🚀 VoltAgent + xsAI Examples\n");

  // Basic Telemetry
  console.log("🔷 Basic Telemetry");
  await generateText({
    model: openai.chat("gpt-4o-mini"),
    messages: [
      {
        role: "user",
        content: "Hello, how are you?",
      },
    ],
  });

  // With Tools
  console.log("🔷 With Tools");
  await generateText({
    model: openai.chat("gpt-4o-mini"),
    messages: [
      {
        role: "user",
        content: "What's the weather like in Tokyo?",
      },
    ],
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
      }),
    ],
  });

  // With Metadata
  console.log("🔷 With Metadata");
  await generateText({
    model: openai.chat("gpt-4o-mini"),
    messages: [
      {
        role: "user",
        content: "What's the weather like in Paris?",
      },
    ],
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
      }),
    ],
    telemetry: {
      metadata: {
        agentId: "weather-assistant",
        instructions: "You are a helpful weather assistant",
      },
    },
  });

  // More Metadata
  console.log("🔷 More Metadata");
  await generateText({
    model: openai.chat("gpt-4o-mini"),
    messages: [
      {
        role: "user",
        content: "What's the weather like in Berlin?",
      },
    ],
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
      }),
    ],
    telemetry: {
      metadata: {
        agentId: "weather-assistant",
        instructions: "You are a helpful weather assistant",
        userId: "demo-user",
        conversationId: "weather-chat",
        tags: ["weather", "demo", "production"],
      },
    },
  });

  // Multi-Agent Example
  console.log("🔷 Multi-Agent Example");
  await runMultiAgentExample();

  await sdk.shutdown();
}

main();
```

<!-- :::tip Complete Working Example
You can find a complete working example with all the code above in our GitHub repository:
📂 **[VoltAgent + Vercel AI SDK Example](https://github.com/VoltAgent/vercel-ai-sdk-observability)**

This includes:

- Ready-to-run code
- Environment setup instructions
- Different example scenarios
- Best practices implementation
  ::: -->

## Complete Metadata Reference

```typescript
telemetry: {
  metadata: {
    // 🎯 Core Identification
    agentId: "my-agent",              // Agent identifier
    userId: "user-123",               // User identifier
    conversationId: "conv-456",       // Conversation grouping

    // 📋 Documentation
    instructions: "Agent instructions visible in console",

    // 🏷️ Organization
    tags: ["category", "priority", "team"],

    // 🔗 Multi-Agent Support
    parentAgentId: "parent-agent",    // Parent-child relationships

    // 📊 Custom Business Data
    projectId: "proj-001",
    department: "engineering",
    version: "1.0.0",
    environment: "dev",
    // ... any custom fields
  },
}
```

## Best Practices

### Implementation Steps

1. **Start**: Enable telemetry (`isEnabled: true`)
2. **Identify**: Add `agentId` for better tracking
3. **Organize**: Add `userId` and `conversationId`
4. **Enhance**: Add `tags` and custom metadata

### Production Tips

- **Always use meaningful `agentId` names**

  ```typescript
  // ❌ Bad: Generic names
  agentId: ("agent1", "my-agent", "assistant");

  // ✅ Good: Descriptive names
  agentId: ("customer-support-bot", "content-writer", "code-reviewer");
  ```

- **Include `userId` for user behavior analysis**

  ```typescript
  telemetry: {
    metadata: {
      agentId: "customer-support-bot",
      userId: req.user.id, // or session.userId, auth.userId
      // Now you can filter and analyze by user
    },
  }
  ```

- **Use `conversationId` for multi-turn conversations**

  ```typescript
  // Generate once per conversation, reuse for related messages
  const conversationId = `conv_${Date.now()}_${userId}`;

  telemetry: {
    metadata: {
      agentId: "chat-assistant",
      userId: "user-123",
      conversationId, // Same ID for all messages in this conversation
    },
  }
  ```

- **Add `tags` for filtering and analytics**

  ```typescript
  telemetry: {
    metadata: {
      agentId: "content-assistant",
      tags: [
        "content-creation",  // Feature category
        "high-priority",     // Priority level
        "marketing-team",    // Department
        "blog-post",         // Content type
      ],
    },
  }
  ```

- **Include business metadata for insights**
  ```typescript
  telemetry: {
    metadata: {
      agentId: "order-processor",
      userId: "customer-456",
      // Business context
      orderId: "order_123",
      customerTier: "premium",
      region: "us-west",
      version: "v2.1.0",
      environment: process.env.NODE_ENV,
      feature: "checkout-flow",
    },
  }
  ```

## Error Handling

```typescript
// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await sdk.shutdown();
  process.exit(0);
});
```

## Next Steps

- Explore [VoltOps Platform](/docs/observability/developer-console) features
- Check out [Multi-agent examples](https://github.com/voltagent/examples)
- Learn about production monitoring setup
