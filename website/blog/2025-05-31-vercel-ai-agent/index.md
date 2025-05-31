---
title: Observability for Vercel AI SDK
description: How to track your LLM Agents built with Vercel AI SDK?
slug: vercel-ai-agent-observability
image: https://cdn.voltagent.dev/2025-05-30-vercel-ai-observability/social.png
authors: omeraplak
---

import ZoomableMermaid from '@site/src/components/blog-widgets/ZoomableMermaid';

## Tracking Vercel AI Agents in Production

[Vercel AI SDK](https://ai-sdk.dev/docs/introduction/) is today one of the most popular tools to create AI agents. That SDK is so popular among developers because of its TypeScript-first approach and inclusion of such cutting-edge AI features like streaming, tool usage, and multi-modal support right out of the box. We wrote about this [in our previous blog post](https://voltagent.dev/blog/vercel-ai-sdk/).

![Vercel AI SDK Integration](https://cdn.voltagent.dev/docs/vercel-ai-observability-demo/vercel-ai-demo-with-multi-agent.gif)

You can plug dozens of providers from OpenAI to Anthropic, Google to Groq with a single unified API. This _seriously_ speeds up development.

But check out the problem.

"I'm building awesome agents with Vercel AI SDK but I have _no clue what's happening in production_".

Sound familiar?

Building AI agents is easier with frameworks. You can do amazing things in a handful of lines of code with Vercel AI SDK. VoltAgent is the same; it is an AI agent framework on TypeScript where you can build production-strength agents with advanced capabilities like multi-agent systems, tool usage, and memory management.

But then comes the _production nightmare_: You don't know what tools your agent is executing, you can't see conversation flows, you can't monitor performance.

<!-- truncate -->

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

const voltAgentExporter = new VoltAgentExporter({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  debug: true, // for development
});

const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

That's it. Seriously.

## Level 1: Just Turn On Tracking

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

## Level 2: Name Your Agent

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

**What's the difference?**

- You see "weather-assistant" in the console rather than "ai-assistant"
- You see tool usage - which tool was applied when, inputs/outputs
- You can view instructions as documentation

Seriously, this is _very_ useful already.

## Level 3: Production-Ready Tracking

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

At this point you have _enterprise-level_ monitoring:

- User behavior analysis
- Conversation flow tracking
- Tag-based filtering and analytics
- Critical data for support

:::info Framework Flexibility
The best part? You can use this same approach with any AI framework. Whether your team uses Vercel AI SDK, LangChain, or direct OpenAI calls - all the tracking data appears in the same unified dashboard.
:::

## Level 4: Multi-Agent Coordination

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

## Framework Agnostic Approach

This is the _coolest_ thing I think. Not just Vercel AI:

- **Python apps** (LangChain, etc.)
- **Direct OpenAI API calls**
- **Custom agent frameworks**
- **Multi-language integration**

So your team member is implementing Python LangChain, you're implementing Vercel AI, another team member is implementing plain OpenAI. _All of them are on the same dashboard_.

This is indeed a game-changer. Since real companies always have hybrid tech stacks.

## Real-World Example: Customer Support Bot

Here is an example. You have a customer support chatbot:

```typescript
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: `Customer issue: ${customerIssue}`,
  tools: {
    ticketLookup: {
      /* lookup from ticket database */
    },
    knowledgeBase: {
      /* knowledge base search */
    },
    escalateToHuman: {
      /* escalate to human agent */
    },
  },
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "customer-support-bot",
      userId: customerId,
      conversationId: ticketId,
      tags: ["support", "customer-service", customerTier],
      // Custom business data
      ticketId,
      customerTier: "premium",
      department: "support",
    },
  },
});
```

Things you can view in the console:

- Which customers utilize support the most
- Which tools are utilized most
- Average resolution time
- Escalation patterns
- Agent performance metrics

_With this data_ you can optimize your support team. Which topics need more training, which tools need to be optimized, etc.

## Getting Started

If you are using Vercel AI SDK, you can literally deploy this in minutes:

1. **Install the packages**
2. **Get your API keys** ([console.voltagent.dev](https://console.voltagent.dev))
3. **Set up OpenTelemetry**
4. **Add `experimental_telemetry: { isEnabled: true }`**

That's it.

First, start with basic tracking. Then gradually add metadata, supply agent IDs, enable user tracking.

## Final Words

AI development is moving very fast. But we are still at the _stone age_ of monitoring.

The traditional APM tools are not enough for AI-specific needs. AI systems have their own share of challenges - tool calls, agent interactions, conversation flow, multi-modal data.

VoltAgent monitoring tries to fill this gap. And because it's framework-agnostic, you can use it on _your existing code_ with minimal alterations.

Test it and give feedback. We always discuss new features in our community ([Discord](https://s.voltagent.dev/discord)).

_Seeing what your AI agents do is no longer a dream. Go and see what your agents are really doing!_ ⚡
