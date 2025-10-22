---
title: What is Vercel AI SDK?
description: A technical look at Vercel AI SDK 5, a toolkit for building AI-powered applications, and how it integrates with VoltAgent. Updated for AI SDK 5.0 (July 2025).
tags: [llm]
slug: vercel-ai-sdk
image: https://cdn.voltagent.dev/2025-05-21-vercel-ai-sdk/social.png
authors: necatiozmen
---

import VercelAiSdkFeatureMatcher from '@site/src/components/blog-widgets/VercelAiSdkFeatureMatcher';
import IntegrationScenarioSelector from '@site/src/components/blog-widgets/IntegrationScenarioSelector';
import ZoomableMermaid from '@site/src/components/blog-widgets/ZoomableMermaid';

This article examines Vercel AI SDK, a TypeScript library for building AI-powered user interfaces and applications and its integration with VoltAgent.

**Updated: October 14, 2025** — This article reflects AI SDK 5.0, covering typed chat messages, agentic loop control, SSE-based streaming, dynamic tooling, speech APIs, and the global provider system.

---

### A Quick Look at Vercel AI SDK

Vercel AI SDK provides a unified toolkit for working with Large Language Models (LLMs) from multiple providers (OpenAI, Anthropic, Google Gemini, etc.) using a single API.

> Instead of writing separate integrations for each model provider, you can use one consistent API.

:::tip When to Use What
For simple AI features like chat or text completion, Vercel AI SDK alone may be enough.
For autonomous agents with memory and decision-making, combine it with VoltAgent.
:::

For building autonomous AI agents that make decisions and interact with tools, frameworks like VoltAgent provide the necessary architecture. We'll examine this combination in detail.

<VercelAiSdkFeatureMatcher />

### Core Features (Updated for AI SDK 5)

Vercel released **AI SDK 5** on **July 31, 2025**, introducing major architectural changes and new capabilities.

#### Key Additions

- **Typed chat messages** — `UIMessage` vs. `ModelMessage`. Convert UI messages to model messages before streaming for persistence and type safety.
- **Agentic Loop Control** — fine-tune or stop multi-step tool calls using `stopWhen` and `prepareStep`. Includes a lightweight `Agent` class that wraps `generateText` and `streamText`.
- **SSE-based Streaming** — Server-Sent Events replace WebSockets for stable real-time responses and partial data streaming.
- **Dynamic Tooling** — define tools dynamically with `inputSchema` and `outputSchema` instead of `parameters` and `result`. Runtime-defined tools and improved schema validation.
- **Speech & Audio APIs** — experimental text-to-speech and transcription support for OpenAI, ElevenLabs, Deepgram.
- **Global Provider System** — models can be referenced simply as `"openai/gpt-4o"`; provider setup is handled automatically.
- **Zod 4 + MCP V2 Support** — upgraded schema and protocol for reasoning, sources, and image generation.

<ZoomableMermaid chart={`graph LR
VAISDK[Vercel AI SDK v5] --> MODELS[Model Providers]
VAISDK --> FEATURES[Features]
VAISDK --> UI[UI Hooks]

MODELS --> OPENAI[OpenAI]
MODELS --> ANTHROPIC[Anthropic]
MODELS --> GOOGLE[Google Gemini]
MODELS --> HF[Hugging Face]

FEATURES --> STREAM[Streaming]
FEATURES --> TOOLS[Dynamic Tools]
FEATURES --> SPEECH[Speech APIs]
FEATURES --> AGENTIC[Agentic Loop Control]
FEATURES --> GLOBAL[Global Provider]
FEATURES --> SCHEMA[Zod 4 Schema]

UI --> USECHAT[useChat]
UI --> USECOMPLETION[useCompletion]

style VAISDK fill:#121E1B,stroke:#50C878,stroke-width:2px,color:#50C878
style MODELS fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
style FEATURES fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
style UI fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878`} />

#### Core SDK Functions

**Model Provider Support**
The SDK supports multiple model providers (OpenAI, Anthropic, Google Gemini, Hugging Face) through a single API. This eliminates provider-specific integration code for each model.

**Streaming**
The SDK supports streaming responses for both text and structured data (JSON). For Next.js applications, React hooks like `useChat` and `useCompletion` handle common UI patterns.

**Additional Components:**

- **`generateText` / `streamText`**: Functions for text generation with streaming support.
- **`generateObject` / `streamObject`**: Generate structured data (JSON) with schema validation using Zod. Model output conforms to the defined schema structure. Model support for structured output varies by provider.
- **Function Calling**: Models can invoke predefined functions or tools. An agent can fetch data from an API or execute actions during conversation.
- **Multi-modal Support**: Process inputs beyond text, such as images. The SDK passes multi-modal messages to models that support this capability.
- **Provider-Specific Options**: Pass provider-specific parameters directly to underlying SDK functions through the `provider` object for model-specific features.

:::important Performance Note
When using `streamObject()` with large response structures, implement progressive UI rendering to maintain responsiveness. Schema validation can introduce delays with complex nested structures.
:::

---

### Example Code (AI SDK 5)

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Explain what an agentic loop is in one sentence.",
});
console.log(result.text);
```

This structure now supports typed responses, streamed outputs, and custom data chunks.

:::note API Key Management
The SDK looks for environment variables like `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Set these in your development environment or deployment configuration.
:::

---

## VoltAgent: Building Autonomous AI Agents

VoltAgent is a TypeScript framework for creating autonomous AI agents. While Vercel AI SDK focuses on model communication, VoltAgent provides the agent architecture tools, memory, reasoning, and coordination.

Refer to [Vercel AI SDK docs](https://voltagent.dev/docs/integrations/vercel-ai/) on Voltagent.

### Core VoltAgent Concepts

- **Instructions** — define behavior and purpose
- **Tools** — external actions or APIs
- **Memory** — state and context
- **Sub-agents** — task delegation
- **Providers** — model connection layer

---

### Integration with Vercel AI SDK

VoltAgent integrates with AI SDK 5 through the `@voltagent/vercel-ai` provider. This allows agents to use Vercel's model APIs (`generateText`, `streamText`, `generateObject`) directly.

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Vercel Powered Assistant",
  instructions: "Use OpenAI model via Vercel AI SDK.",
  model: openai("gpt-4o"),
});

async function run() {
  const res = await agent.generateText("Hello from VoltAgent!");
  console.log(res.text);
}
```

:::tip Installation

```bash
npm install @voltagent/core @ai-sdk/openai
```

:::

This setup lets VoltAgent use AI SDK 5's advanced features (typed streaming, tool calls, agentic loops) while adding memory and observability via VoltOps.

---

### Observability and VoltOps Integration

VoltAgent integrates telemetry from VoltOps, enabling traceable AI calls:

```typescript
import { withTelemetry } from "@voltagent/vercel-ai-exporter";
import { generateText } from "ai";

await withTelemetry({
  traceName: "order_agent",
  metadata: { agentId: "123", session: "abc" },
})(async () => {
  const result = await generateText({
    model: openai("gpt-4o"),
    prompt: "Hi!",
  });
});
```

VoltOps collects structured traces, tool call timing, and metadata for debugging and optimization.

---

<IntegrationScenarioSelector />

### Use Cases

**Streaming Chatbots**
For chatbots handling customer service or queries, streaming responses improves user experience. VoltAgent with `VercelAIProvider` uses the `streamText` function to stream responses as they generate.

**Structured Data Extraction**
Extract specific information (keywords, technical specifications) from text into JSON format. VoltAgent uses Vercel AI SDK's `generateObject` with Zod schemas to enforce output structure.

:::danger Schema Complexity
When using `generateObject` with schema validation, start with simple structures. Deeply nested schemas can cause validation errors that are difficult to debug. Add complexity incrementally.
:::

**Agentic Automation**
VoltAgent orchestrates multiple AI SDK tools dynamically for complex workflows. The Vercel AI Provider supports passing provider-specific configuration options through VoltAgent when needed.

---

### Migration Notes

If upgrading from AI SDK 4 → 5:

- Update packages to `ai@5.0.0` and `@ai-sdk/provider@2.0.0`
- Replace deprecated `parameters` with `inputSchema`
- Update UI states (`partial-call` → `input-streaming`, `result` → `output-available`)
- Run Vercel's codemods for automatic refactoring

---

### Summary

- **Vercel AI SDK 5** adds a new typed protocol, agentic loops, SSE streaming, speech APIs, dynamic tools, and global providers.
- **VoltAgent** builds on top, adding autonomous behavior, memory, and VoltOps observability.

Together, they form a complete ecosystem for modern AI agents — from LLM communication to full agent orchestration.

---

### References

- [Vercel AI SDK 5 Blog](https://vercel.com/blog/ai-sdk-5)
- [AI SDK Migration Guide 5.0](https://sdk.vercel.ai/docs/ai-sdk-core/migrating-to-5.0)
- [VoltAgent Docs](https://voltagent.dev/docs/)
