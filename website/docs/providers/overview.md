---
title: Providers Overview
slug: /providers/overview
---

# Providers Overview

In VoltAgent, **Providers** (implementing the `LLMProvider` interface) are the essential components that bridge the gap between your `Agent` and the underlying Large Language Models (LLMs) or AI services. They handle the specifics of interacting with different APIs, managing authentication, formatting requests, and parsing responses.

This allows you to build your agent logic independently of the specific LLM service you choose initially, making it easy to switch models or services later.

:::tip Recommended Approach
**We strongly recommend using the Vercel AI SDK providers** through our `@voltagent/vercel-ai` integration. This gives you access to 30+ providers with consistent APIs, automatic updates, and a vibrant community ecosystem.

**[View all available providers and models](/docs/getting-started/providers-models)**
:::

## Available Providers

VoltAgent offers several providers, with our recommended approach being the Vercel AI SDK integration:

### Recommended Provider

- **[`@voltagent/vercel-ai`](./vercel-ai.md):** **RECOMMENDED**
  - Leverages the versatile [Vercel AI SDK](https://sdk.vercel.ai/docs) for broad compatibility with 30+ LLM providers
  - Access to OpenAI, Anthropic, Google, Groq, Mistral, Amazon Bedrock, Azure, and many more through a single interface
  - Consistent API across all providers with automatic updates for new models
  - Active community ecosystem with regular updates

### Lightweight Alternative

- **[`@voltagent/xsai`](./xsai.md):**
  - Uses the lightweight `xsai` library to connect to any OpenAI-compatible API endpoint
  - Ideal for flexibility and when targeting environments sensitive to bundle size (like edge functions)
  - Works with OpenAI, Groq, Together AI, Anyscale, Mistral, and local models via Ollama/LM Studio

### Legacy Providers (Deprecated)

:::caution Deprecated Packages
The following providers are deprecated in favor of the Vercel AI SDK providers. They will continue to work but will not receive new features or model updates.
:::

- **[`@voltagent/google-ai`](./google-ai.md):** **DEPRECATED**
  - Legacy integration for Google's Generative AI models (Gemini)
  - **Migrate to:** `@ai-sdk/google` or `@ai-sdk/google-vertex` with `@voltagent/vercel-ai`

- **[`@voltagent/groq-ai`](./groq-ai.md):** **DEPRECATED**
  - Legacy integration for Groq API
  - **Migrate to:** `@ai-sdk/groq` with `@voltagent/vercel-ai`

- **[`@voltagent/anthropic-ai`](./anthropic-ai.md):** **DEPRECATED**
  - Legacy integration for Anthropic's Claude models
  - **Migrate to:** `@ai-sdk/anthropic` with `@voltagent/vercel-ai`

## Custom Provider Implementation

VoltAgent supports creating **custom providers** for advanced use cases that require more control than what the Vercel AI SDK offers.

### When to Use Custom Providers

**Consider a custom provider when you need:**

- Integration with proprietary or internal LLM services
- Advanced control over API request/response handling
- Custom authentication or authorization mechanisms
- Specialized retry logic or rate limiting strategies
- Integration with legacy systems that don't follow standard APIs

### When to Use Vercel AI SDK (Recommended for Most Cases)

**The Vercel AI SDK providers are sufficient for most use cases:**

- Access to 30+ popular AI providers out of the box
- Consistent, well-tested implementations
- Regular updates with new models and features
- Active community support and contributions
- Standardized interfaces for streaming, tool calling, and structured outputs
- OpenAI-compatible provider for custom endpoints

### Implementing a Custom Provider

To create a custom provider, implement the `LLMProvider` interface from `@voltagent/core`:

```typescript
import { LLMProvider } from "@voltagent/core";

export class MyCustomProvider implements LLMProvider {
  // Implement required methods
  async generateText(/* ... */) {
    /* ... */
  }
  async streamText(/* ... */) {
    /* ... */
  }
  async generateObject(/* ... */) {
    /* ... */
  }
  // ... other required methods
}
```

> **Pro Tip:** Before building a custom provider, check if the [OpenAI-compatible provider](https://ai-sdk.dev/providers/openai-compatible-providers) can work with your custom endpoint. Many LLM services follow the OpenAI API specification, making integration much simpler.

Select the provider that best fits the LLM service or API you intend to use. See the individual provider pages linked above for detailed installation, configuration, and usage instructions.
