---
title: Observability for Vercel AI SDK
description: How to track your LLM Agents built with Vercel AI SDK?
slug: vercel-ai-llm-observability
image: https://cdn.voltagent.dev/2025-05-31-vercel-ai-observability/social.png
authors: omeraplak
---

import ZoomableMermaid from '@site/src/components/blog-widgets/ZoomableMermaid';

## Tracking LLM Agents built with Vercel AI SDK in Production

[Vercel AI SDK](https://ai-sdk.dev/docs/introduction/) is today one of the most popular tools to create AI agents. That SDK is so popular among developers because of its TypeScript-first approach and inclusion of such cutting-edge AI features like streaming, tool usage, and multi-modal support right out of the box.

We wrote about this [in our previous blog post](https://voltagent.dev/blog/vercel-ai-sdk/).

![Vercel AI SDK Integration](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-multi-agent.gif)

You can plug dozens of providers from OpenAI to Anthropic, Google to Groq with a single unified API. This _seriously_ speeds up development.

But check out the problem.

"I'm building awesome agents with Vercel AI SDK but I have _no clue what's happening in production_".

Sound familiar?

Building AI agents is easier with frameworks. You can do amazing things in a handful of lines of code with Vercel AI SDK. VoltAgent is the same; it is an AI agent framework on TypeScript where you can build production-strength agents with advanced capabilities like multi-agent systems, tool usage, and memory management.

But then comes the _production nightmare_: You don't know what tools your agent is executing, you can't see conversation flows, you can't monitor performance.

When we're building VoltAgent, I kept asking myself "What's my agent doing now?" Traditional monitoring tools? Not so effective for AI applications.

So we built the VoltAgent LLM monitoring platform. And today I have an _awesome_ announcement.

## What is Framework-Independent Monitoring

VoltAgent is actually two:

1. Open source TypeScript framework to create AI Agents
2. **Monitoring platform independent of frameworks**

The latter is quite crucial. You may be using Vercel AI SDK, someone else may be using LangChain, somebody else may be making plain vanilla OpenAI API calls.

_We can monitor them all._

So you don't need to write the VoltAgent framework for monitoring. You can have end-to-end visibility with literally zero modifications to your existing code.

## Why Framework-Independent Approach?

Honestly, we started by thinking about just the VoltAgent framework. But then we thought that _everyone has different tastes_:

- Some are just crazy about Vercel AI (for fast development)
- Some prefer LangChain (for Python universe)
- Some use pure OpenAI API (for full control)

And businesses usually have mixed strategies. Compelling everyone to use the same framework... _that's unrealistic_.

So we said "Let's make monitoring framework-independent". You use whatever framework you like, we'll do the monitoring.

## 1-Minute Setup: No Kidding

Now let me demonstrate how to set this up for Vercel AI SDK.

### Installation

```bash
npm install @voltagent/vercel-ai-exporter @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

Just 3 packages. That's all.

### API Keys

Go to [console.voltagent.dev](https://console.voltagent.dev), create an organization, create a project, get your keys:

- `VOLTAGENT_PUBLIC_KEY`
- `VOLTAGENT_SECRET_KEY`

:::warning Security Note
Keep your secret key safe! Never commit it to your repository. Always use environment variables in production.
:::

### OpenTelemetry Setup

In your main file, do this:

```typescript
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
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

:::note
Complete working example: https://github.com/VoltAgent/vercel-ai-sdk-observability
Track AI calls, tool usage, and multi-agent workflows with minimal code changes.
:::

## Basic Telemetry

Insert a single line in your current Vercel AI code:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Hello, how are you?",
  experimental_telemetry: {
    isEnabled: true, // ← That's it!
  },
});
```

![Vercel AI SDK Integration Basic Exampla](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-basic.gif)

And done! 🎉

You may look at your agent in the VoltAgent console. It will be displayed by default as "ai-assistant" but _no problems_. For the moment, your calls to AI are being tracked, you can look at the execution flow.

You'll have a message like this in the console:

```
📋 VoltAgent: Using default agent for tracking.
💡 For improved tracking, add agentId to your metadata
```

:::tip Don't Worry!
This message is completely normal! VoltAgent automatically uses a default agent when no `agentId` is provided. This is actually helpful for getting started quickly. You can always customize it later.
:::

Don't worry about this, this is normal. Let's move on to the next step for improved tracking.

## Name Your Agent & Tool Usage

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "What's the weather in Tokyo?",
  tools: {
    weather: {
      description: "Get the weather in a place",
      parameters: z.object({
        location: z.string().describe("The place to get the weather for"),
      }),
      execute: async ({ location }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        };
      },
    },
  },
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "weather-assistant", // ← Now it has a name!
      instructions: "You are a helpful weather assistant",
    },
  },
});
```

![Vercel AI SDK Integration Basic Exampla](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-tools.gif)

**What's the difference?**

- You see "weather-assistant" in the console rather than "ai-assistant"
- You see tool usage - which tool was applied when, inputs/outputs
- You can view instructions as documentation

Seriously, this is _very_ useful already.

## Production-Ready Tracking

In production, you have users and conversations. You'd like to track those as well:

```typescript
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "What's the weather like in Berlin?",
  tools: {
    weather: {
      // identical weather tool
    },
  },
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "weather-assistant",
      instructions: "You are a helpful weather assistant",
      userId: "demo-user", // ← User tracking
      conversationId: "weather-chat", // ← Conversation grouping
      tags: ["weather", "demo", "production"], // ← Categorization
    },
  },
});
```

![Vercel AI SDK Integration Basic Exampla](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-metadata.gif)

At this point you have _enterprise-level_ monitoring:

- User behavior analysis
- Conversation flow tracking
- Tag-based filtering and analytics
- Critical data for support

:::info Framework Flexibility
The best part? You can use this same approach with any AI framework. Whether your team uses Vercel AI SDK, LangChain, or direct OpenAI calls - all the tracking data appears in the same unified dashboard.
:::

## Multi-Agent Coordination

Most advanced section. When multiple agents collaborate:

```typescript
// Main agent: Planning
const { text: plan } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Write a plan for team meeting",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "planning-agent",
      userId: "team-lead",
      conversationId: "meeting-organization",
      instructions: "You develop meeting plans and agendas",
      tags: ["planning", "meetings"],
    },
  },
});

// Child agent: Execution
const { text: execution } = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: `Execute this plan: ${plan}`,
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "execution-agent",
      parentAgentId: "planning-agent", // ← Parent relationship!
      userId: "team-lead",
      conversationId: "meeting-organization",
      instructions: "You handle meeting logistics and execution",
      tags: ["execution", "logistics"],
    },
  },
});
```

![Vercel AI SDK Integration Basic Exampla](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-multi-agent.gif)

**What does this give you?**

- You can see agent hierarchies
- Parent-child relationships
- Complex workflow tracking
- Cross-agent context

In the console you have _a whole diagram_ of how agents are talking to each other.

## What Do You See in the Console?

Now my favorite part. When you launch the VoltAgent console:

- **Real-time agent activity dashboard** - You can view what the agents are doing currently, in real time
- **Conversation flows** - Timeline of all conversations, tool usage
- **Performance analytics** - Response times, token usage, cost tracking
- **Error debugging** - Where it stopped, which tool was failing
- **User analytics** - Who uses it how often

There was a bug over the weekend in production. Usually I would spend hours debugging. Caught it in the console in 2 minutes - there was a timeout on a specific tool call. _Life saver_ indeed.

## What Makes VoltAgent Observability Different

Unlike traditional monitoring tools that focus on model metrics, VoltAgent is designed specifically for **agent workflows**. Here's what makes it unique:

### 🎯 Agent-Centric Approach

VoltAgent shows you what your **agent is doing**, not just how your model is performing:

- **Conversation flows** - See the complete dialogue thread
- **Tool usage patterns** - Which tools are called when and why
- **Multi-agent interactions** - How different agents collaborate
- **Decision tracking** - Why did the agent make that choice?

### ⚡ Live Visualization & Immediate Debugging

**Real-time insights while your agent runs:**

- Developer Console connects directly to your local agent (`localhost:3141`)
- Watch execution flow as it happens - no waiting for batch processing
- Spot problems instantly instead of discovering them hours later
- Zero latency between agent action and console visualization

### 🔍 What You Actually See

VoltAgent visualizes the agent-specific data that matters:

🔀 **Multi-agent coordination** - Parent-child relationships and hierarchies  
🛠️ **Tool execution flows** - Complete tool call sequences with inputs/outputs  
💬 **Conversation threading** - How messages connect across interactions  
🧠 **Agent decision making** - The reasoning behind each step

This is fundamentally different from traditional LLM monitoring that focuses on token counts, response times, and model accuracy. VoltAgent shows you the _behavior_ of your intelligent system.

## How It All Works Together

Here's what happens behind the scenes when you add VoltAgent observability to your Vercel AI calls:

<ZoomableMermaid
chart={`
%%{init: {'theme':'base', 'themeVariables': {'primaryColor': '#10b981', 'primaryTextColor': '#10b981', 'primaryBorderColor': '#10b981', 'lineColor': '#10b981', 'secondaryColor': '#ecfdf5', 'tertiaryColor': '#d1fae5', 'background': '#ffffff', 'mainBkg': '#ecfdf5', 'secondBkg': '#d1fae5', 'tertiaryBkg': '#a7f3d0'}}}%%
sequenceDiagram
participant Dev as Developer
participant App as Your App
participant VAI as Vercel AI SDK
participant OTel as OpenTelemetry
participant VE as VoltAgent Exporter
participant VP as VoltAgent Platform
participant Console as VoltAgent Console

    Dev->>App: Write AI code with experimental_telemetry
    App->>VAI: generateText() with telemetry enabled
    VAI->>VAI: Execute LLM call
    VAI->>OTel: Send telemetry data

    alt Tool Usage
        VAI->>VAI: Execute tool calls
        VAI->>OTel: Send tool execution data
    end

    OTel->>VE: Forward telemetry data
    VE->>VP: Send to VoltAgent Platform
    VP->>VP: Process & store data

    Dev->>Console: Open VoltAgent Console
    Console->>VP: Request agent data
    VP->>Console: Return real-time data
    Console->>Dev: Display agent activity, flows, metrics

    Note over Dev,Console: Real-time monitoring & debugging

`}
/>

This flow happens automatically once you add the `experimental_telemetry` flag. No additional code changes needed!

## Production Best Practices

Some _real life_ tips:

### Use Meaningful Agent IDs

```typescript
// ❌ Bad examples:
agentId: "agent1", "my-agent", "assistant";

// ✅ Good examples:
agentId: "customer-support-bot", "content-writer", "code-reviewer";
```

### Don't Forget User ID

```typescript
experimental_telemetry: {
  isEnabled: true,
  metadata: {
    agentId: "customer-support-bot",
    userId: req.user.id, // Or session.userId, auth.userId
  },
}
```

:::caution Critical for Analytics
Without user ID tracking, you can't do user behavior analysis, can't identify power users, and can't debug user-specific issues. This metadata is crucial for production applications!
:::

Without this you can't do user behavior analysis.

### Conversation ID Strategy

```typescript
// Generate once at conversation start, then reuse
const conversationId = `conv_${Date.now()}_${userId}`;

experimental_telemetry: {
  isEnabled: true,
  metadata: {
    agentId: "chat-assistant",
    userId: "user-123",
    conversationId, // Same ID for all the messages in this conversation
  },
}
```

### Use Tags Strategically

```typescript
tags: [
  "content-creation", // Feature category
  "high-priority", // Priority level
  "marketing-team", // Department
  "blog-post", // Content type
];
```

Then in the console you can say "Show me all high-priority content-creation activities".

First, start with basic tracking. Then gradually add metadata, supply agent IDs, enable user tracking.

## Final Words

AI development is moving very fast. But we are still at the _stone age_ of monitoring.

The traditional APM tools are not enough for AI-specific needs. AI systems have their own share of challenges - tool calls, agent interactions, conversation flow, multi-modal data.

VoltAgent monitoring tries to fill this gap. And because it's framework-agnostic, you can use it on _your existing code_ with minimal alterations.

Test it and give feedback. We always discuss new features in our community ([Discord](https://s.voltagent.dev/discord)).

_Seeing what your AI agents do is no longer a dream. Go and see what your agents are really doing!_ ⚡
