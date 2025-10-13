---
title: TypeScript AI Agent Framework - Voltagent
description: A TypeScript AI agent framework built from the ground up. Offers type safety, modern patterns, and better developer experience.
slug: typescript-ai-agent-framework
image: https://cdn.voltagent.dev/2025-07-29-ts-ai-agent/social.png
authors: necatiozmen
tags: [typescript, frameworks, ai-agents]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## The TypeScript Developer's AI Dilemma

When our team started working on AI agent projects, we kept running into issues with how existing tools fit into the TypeScript ecosystem. Most frameworks were designed Python-first, with JavaScript/TypeScript support feeling like an afterthought.

Working with popular tools like LangChain or AutoGen meant spending time adapting Python documentation to TypeScript. This not only slowed down development but also prevented us from fully leveraging TypeScript's type safety, modern language features, and IDE support.

This experience led us to build a TypeScript AI agent framework designed natively for the TypeScript ecosystem. [VoltAgent](https://github.com/VoltAgent/voltagent) was born from this need.

## Why TypeScript Matters for AI Development

### Type Safety in AI Applications

One of the biggest challenges when building AI applications is the unpredictability of LLM responses. Consider building a chatbot:

```typescript
// ❌ Untyped approach - runtime surprises
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ message: userInput }),
});
const data = await response.json(); // any type
console.log(data.message); // Runtime error if API response changes
```

Same operation with VoltAgent:

```typescript
// ✅ Fully typed approach - compile-time safety
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "customer-support",
  instructions: "Answer customer questions professionally",
  llm: new VercelAIProvider(), // Type-safe provider
  model: openai("gpt-4o"), // Type-safe model configuration
});

// generateText returns a fully typed response
const response = await agent.generateText("Where is my order?");
console.log(response.text); // Guaranteed to be string
```

### Structured Output with Zod Integration

An important feature in the framework is maintaining type safety when getting structured data from AI:

```typescript
import { z } from "zod";

// First, we define our schema
const customerSchema = z.object({
  name: z.string().describe("Customer's full name"),
  age: z.number().describe("Customer's age"),
  city: z.string().describe("City they live in"),
  preferences: z.array(z.string()).describe("Product preferences"),
});

// Request typed data from AI
const customerData = await agent.generateObject(
  "Create a profile for John, 28 years old, living in New York, loves tech products",
  customerSchema
);

// TypeScript provides automatic type inference
console.log(customerData.object.name); // Guaranteed to be string
console.log(customerData.object.preferences); // Guaranteed to be string[]
```

This approach is much safer and more maintainable than asking for "JSON format" and then trying to parse it.

## VoltAgent's TypeScript-First Architecture

### Core Design Principles

The main principles we focused on while developing the framework:

**1. Native TypeScript - Not a Port, Built Ground-up**

```typescript
// Everything in VoltAgent is TypeScript-native
import { Agent, createTool, LibSQLStorage } from "@voltagent/core";
// No Python remnants, modern ES modules
```

Unlike many AI frameworks that started in Python and later added TypeScript bindings, VoltAgent was designed from day one with TypeScript in mind. This means every API, every interface, and every pattern follows TypeScript conventions. You get proper generics, union types, and conditional types that make your code both safer and more expressive.

The import system uses modern ES modules, supports tree-shaking for optimal bundle sizes, and integrates seamlessly with existing TypeScript toolchains like Vite, Next.js, or plain tsc.

**2. Modular Design**

```typescript
// Load only what you need
import { Agent } from "@voltagent/core";
import { VoiceAgent } from "@voltagent/voice"; // If voice features needed
import { PostgreSQLStorage } from "@voltagent/postgres"; // If PostgreSQL needed
```

Each capability is packaged separately, allowing you to include only what your project actually needs. Building a simple text-based agent? You only need `@voltagent/core`. Need voice capabilities? Add `@voltagent/voice`. This approach keeps your bundle sizes small and your dependencies manageable.

The modular architecture also means each package can evolve independently. Voice features can get updates without affecting your core agent logic, and new integrations can be added without bloating the main framework.

**3. Zero Runtime Surprises**

```typescript
// What you type is what you get - compile time guarantees
const agent = new Agent({
  name: "assistant", // string
  instructions: "Helpful assistant", // string
  tools: [calculatorTool], // Tool[] - typed
  memory: new LibSQLStorage(), // Memory interface - typed
});
```

TypeScript's compile-time type checking catches errors before they reach production. When you pass a tool to an agent, TypeScript knows it's a `Tool` type. When you configure memory, it knows it implements the `Memory` interface. This eliminates entire classes of runtime errors that plague dynamically typed AI applications.

The framework's APIs are designed to be discoverable through IntelliSense, making development faster and reducing the need to constantly reference documentation.

## Real-World TypeScript Patterns

### Type-Safe Tool Development

The tool system plays a central role in the framework. You can create type-safe tools with the `createTool` helper:

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get weather information for a specified city",
  parameters: z.object({
    city: z.string().describe("City name"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().describe("Temperature unit"),
  }),
  execute: async (args) => {
    // args automatically typed: { city: string; unit?: "celsius" | "fahrenheit" }
    const { city, unit = "celsius" } = args;

    // API call would go here...
    return {
      city,
      temperature: 22,
      condition: "sunny",
      unit,
    };
  },
});
```

Using the tool with an agent is straightforward:

```typescript
const agent = new Agent({
  name: "Weather Assistant",
  instructions: "Helpful assistant that provides weather information",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [weatherTool],
});

// Agent automatically knows when to use the tool
const response = await agent.generateText("How's the weather in London?");
```

### Memory Management - Conversation History

VoltAgent's memory system is fully TypeScript-compatible. You can start with zero-config or customize as needed:

```typescript
// Zero-config: Automatically creates .voltagent/memory.db file
const agent = new Agent({
  name: "Memory Assistant",
  instructions: "Assistant that remembers previous conversations",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // Uses LibSQLStorage automatically if memory not specified
});

// First conversation
await agent.generateText("My name is John and I love pizza", {
  userId: "user-123",
  conversationId: "chat-1",
});

// Next conversation - will remember the previous one
const response = await agent.generateText("What's my favorite food?", {
  userId: "user-123",
  conversationId: "chat-1",
});
// "Based on our previous conversation, you love pizza!"
```

You can also use custom memory providers:

```typescript
import { LibSQLStorage, PostgreSQLStorage, InMemoryStorage } from "@voltagent/core";

// PostgreSQL for production
const prodAgent = new Agent({
  // ... other config
  memory: new PostgreSQLStorage({
    connectionString: process.env.DATABASE_URL,
  }),
});

// In-memory for testing
const testAgent = new Agent({
  // ... other config
  memory: new InMemoryStorage(),
});
```

## Quick Start Experience

Getting started with the framework is kept simple:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm create voltagent-app@latest my-ai-app
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn create voltagent-app my-ai-app
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm create voltagent-app my-ai-app
```

  </TabItem>
</Tabs>

The CLI guides you through the setup process:

1. **Project name** selection
2. **AI Provider** choice (OpenAI, Anthropic, Google, Groq, etc.)
3. **API Key** setup (optional)
4. **Package manager** selection
5. **IDE configuration**

After setup is complete:

```bash
cd my-ai-app
npm run dev
```

You'll see the VoltAgent server startup message in your terminal:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  VoltOps Platform:    https://console.voltagent.dev
══════════════════════════════════════════════════
```

![VoltOps LLM Observability Platform](https://cdn.voltagent.dev/readme/demo.gif)

You can start chatting with your agent right away through the VoltOps Console!

## Multi-Agent Systems - Delegated Agents

The framework's sub-agent system allows complex tasks to be divided among specialized agents:

```typescript
// Research specialist agent
const researchAgent = new Agent({
  name: "Researcher",
  instructions: "Conducts detailed research using web search",
  tools: [webSearchTool],
});

// Writing specialist agent
const writerAgent = new Agent({
  name: "Writer",
  instructions: "Creates engaging content based on research data",
  tools: [contentGeneratorTool],
});

// Coordinator agent
const coordinator = new Agent({
  name: "Coordinator",
  instructions: "Coordinates research and writing tasks",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  subAgents: [researchAgent, writerAgent], // Automatic delegate_task tool
});

// Complex workflow in a single call
await coordinator.generateText("Write a blog post about quantum computing");
// Coordinator will delegate research to researcher, writing to writer
```

## Voice Features

VoltAgent's voice integration is also designed with a TypeScript-first approach:

```typescript
import { ElevenLabsVoiceProvider, OpenAIVoiceProvider } from "@voltagent/voice";

// Realistic voice with ElevenLabs
const elevenLabsVoice = new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY,
  voice: "Rachel",
  ttsModel: "eleven_multilingual_v2",
});

const voiceAgent = new Agent({
  name: "Voice Assistant",
  instructions: "Assistant that helps with voice responses",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  voice: elevenLabsVoice,
});

// Generate text response
const response = await voiceAgent.generateText("Tell me a short story");

// Convert to voice
if (voiceAgent.voice && response.text) {
  const audioStream = await voiceAgent.voice.speak(response.text);

  // Save to file
  import { createWriteStream } from "node:fs";
  import { pipeline } from "node:stream/promises";

  const fileStream = createWriteStream("story.mp3");
  await pipeline(audioStream, fileStream);
  console.log("Audio file ready!");
}
```

## Production-Ready Features

### Error Handling & Resilience

```typescript
import { createHooks } from "@voltagent/core";

const hooks = createHooks({
  onStart: async ({ agent, context }) => {
    const requestId = `req-${Date.now()}`;
    context.context.set("requestId", requestId);
    console.log(`[${agent.name}] Request started: ${requestId}`);
  },
  onToolStart: async ({ agent, tool, context }) => {
    const reqId = context.context.get("requestId");
    console.log(`[${reqId}] Tool starting: ${tool.name}`);
  },
  onToolEnd: async ({ agent, tool, output, context }) => {
    const reqId = context.context.get("requestId");
    console.log(`[${reqId}] Tool completed: ${tool.name}`, output);
  },
  onError: async ({ agent, error, context }) => {
    const reqId = context.context.get("requestId");
    console.error(`[${reqId}] Error occurred:`, error);
    // Error tracking services integration
  },
});

const productionAgent = new Agent({
  name: "Production Agent",
  // ... other config
  hooks, // Full observability
});
```

## Real Project Examples

### E-commerce Customer Support Bot

```typescript
import { createTool } from "@voltagent/core";

const orderQueryTool = createTool({
  name: "query_order",
  description: "Query order status by order number",
  parameters: z.object({
    orderNumber: z.string().describe("Order number"),
  }),
  execute: async ({ orderNumber }) => {
    // Database query
    const order = await database.orders.findOne({ id: orderNumber });
    return {
      status: order.status,
      trackingCode: order.trackingCode,
      estimatedDelivery: order.estimatedDelivery,
    };
  },
});

const supportAgent = new Agent({
  name: "customer-support",
  instructions: "E-commerce customer support that can track orders",
  tools: [orderQueryTool, refundTool, humanHandoffTool],
  memory: new LibSQLStorage(),
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
});
```

Results with this system:

- 35% less human intervention
- 60% faster response time
- 24/7 availability

### Content Generation Pipeline

```typescript
// Research → Writing → Review → Publishing workflow
const contentPipeline = new Agent({
  name: "Content Creator",
  instructions: "Coordinator that researches, writes, and reviews blog posts",
  subAgents: [researchAgent, writerAgent, editorAgent],
  tools: [seoAnalyzer, plagiarismChecker, publishTool],
});

const result = await contentPipeline.generateText(
  "Write an SEO-optimized blog post about new features in React 19"
);
```

## Debugging & Monitoring: VoltOps Console

Visual debugging console integrated with the framework:

```bash
npm run dev
# VoltOps Console: https://console.voltagent.dev
```

What you can do from the console:

- **Real-time conversation monitoring**
- **Tool execution tracing**
- **Memory state inspection**
- **Performance metrics**
- **Error debugging**

![VoltOps Workflow Observability](https://cdn.voltagent.dev/docs/workflow-observability-demo.gif)

This visual-first approach makes the debugging process more understandable.

## Migration Guide

### Migration from Python Frameworks

If you're coming from Python, the concepts are similar but the implementation differs:

```python
# LangChain (Python)
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory

llm = OpenAI(temperature=0.7)
memory = ConversationBufferMemory()
chain = LLMChain(llm=llm, memory=memory)
```

```typescript
// VoltAgent (TypeScript) - typed approach
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "Helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // Memory automatic - no configuration needed
});
```

### Migration from Manual API Integration

```typescript
// Old approach - manual API calls
const response = await openai.chat.completions.create({
  messages: [{ role: "user", content: userInput }],
  tools: [
    /* manual tool definitions */
  ],
  // Manual memory management...
});

// With VoltAgent - framework handles everything
const response = await agent.generateText(userInput, {
  userId: "user-123",
  conversationId: "chat-1",
});
```

## Community & Ecosystem

Advantages of VoltAgent's TypeScript-first community:

### TypeScript-First Community

- **NPM packages** built specifically for VoltAgent
- **Learning resources** TypeScript-specific documentation
- **Support channels** Active community on Discord, GitHub Discussions

### Enterprise Features

- **Security & compliance** built-in
- **Performance monitoring** with VoltOps
- **Type-safe configurations** compile-time validation

### TypeScript Advantages

- **Developer productivity**: Faster development cycles
- **Code quality**: Fewer bugs, better maintainability
- **Team collaboration**: Better code reviews and onboarding
- **Ecosystem maturity**: Rich tooling and libraries

### Get Started Now

- **Try VoltAgent**: Build your first TypeScript AI agent
- **Join the community**: Connect with other TypeScript AI developers
- **Contribute**: Help shape the future of TypeScript AI development

VoltAgent offers an alternative designed for AI agent development in the TypeScript ecosystem.
