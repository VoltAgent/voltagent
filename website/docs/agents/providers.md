---
title: Using LLM Providers
slug: /agents/providers
---

# Using LLM Providers with Agents

In VoltAgent, **Providers** are the connection layer between your `Agent` and the underlying Large Language Model (LLM) or AI service. They implement the `LLMProvider` interface and handle the complexities of specific APIs, such as authentication, request formatting, and response parsing.

This abstraction allows you to build agents that are **model agnostic**. You can easily switch the underlying LLM (e.g., from OpenAI to Groq, or from a cloud service to a local model) often just by changing the provider configuration, without needing to modify your core agent logic.

## Available Providers

VoltAgent offers built-in providers for various popular services and SDKs. This allows you to connect your agents to different LLMs with minimal code changes.

- **[Vercel AI Provider](../providers/vercel-ai.md):** Integrates with the Vercel AI SDK, allowing you to use various models supported by Vercel.
- **[Google AI Provider](../providers/google-ai.md):** Connects to Google's AI models, including Gemini and Vertex AI, via their official SDK.
- **[Groq AI Provider](../providers/groq-ai.md):** Leverages the Groq API for extremely fast inference on supported models like Llama and Mixtral.
- **[Anthropic AI Provider](../providers/anthropic-ai.md):** Connects directly to Anthropic's AI models (Claude) using the official Anthropic AI SDK.
- **[xsAI (OpenAI-Compatible) Provider](../providers/xsai.md):** Provides compatibility with any OpenAI-compatible API endpoint, including self-hosted models or other third-party services.

Choose the provider that best suits the LLM or service you want to use. Detailed configuration and usage instructions can be found on each provider's specific documentation page linked above.

For a general overview of all available providers, see the [Providers Overview](../providers/overview.md).

## Configuring an Agent with a Provider

When you create an `Agent` instance, you assign a configured provider instance to the `llm` property and specify the desired model identifier using the `model` property.

```typescript
import { Agent } from "@voltagent/core";

// 1. Import your chosen provider
// Example: using the VercelAIProvider
import { VercelAIProvider } from "@voltagent/vercel-ai";
// Import the model definition from the Vercel AI SDK
import { openai } from "@ai-sdk/openai";

// 2. Instantiate and configure the provider
// VercelAIProvider often requires no constructor arguments (relies on env vars)
const myProvider = new VercelAIProvider();

// 3. Create the Agent, passing the provider and model ID
const agent = new Agent({
  name: "My Configured Agent",
  instructions: "An agent ready to interact via the specified provider",
  llm: myProvider, // Assign the provider instance
  model: openai("gpt-4o-mini"), // Pass the model object from Vercel AI SDK
});

// 4. Now you can use the agent's methods (generateText, streamText, etc.)
async function run() {
  const response = await agent.generateText("How does the provider architecture help?");
  console.log(response.text);
}

run();
```

### `@voltagent/zhipu-ai` (Zhipu AI Provider)

Provides integration with Zhipu AI's powerful language modelsr. This provider offers a robust interface for Chinese language models and supports advanced features like streaming responses and tool integration.

```ts
import { Agent } from "@voltagent/core";
import { ZhipuProvider } from "@voltagent/zhipu-ai";

// Instantiate the provider with your API key
const zhipuProvider = new ZhipuProvider({
  apiKey: process.env.ZHIPU_API_KEY,
  // Optional configuration
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 2000,
});

// Create an agent using Zhipu AI's GLM-4-Air model
const agent = new Agent({
  name: "Zhipu AI Assistant",
  description: "A helpful assistant powered by Zhipu AI",
  llm: zhipuProvider,
  model: {
    id: "glm-4-air",
    provider: "zhipu",
    modelId: "glm-4-air",
  },
});
```

**Choose `@voltagent/zhipu-ai` when:** You need to work with Chinese language models

## The `model` Parameter

It's important to understand that the value you provide for the `model` parameter is interpreted _by the specific `llm` provider_ you have configured for the agent.

- Some providers (like `@voltagent/xsai`, `@voltagent/google-ai`, `@voltagent/groq-ai`) expect a **string** identifier (e.g., `'gpt-4o-mini'`, `'gemini-1.5-pro'`, `'llama3-70b-8192'`) that corresponds to a model available on the target API.
- Other providers (like `@voltagent/vercel-ai`) expect a **model object** imported from their corresponding SDK (e.g., `openai('gpt-4o')`, `anthropic('claude-3-5-sonnet-20240620')`).

Always refer to the documentation for the specific provider you are using to know what format is expected for the `model` parameter.
