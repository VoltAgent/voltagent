---
title: Providers
slug: /agents/providers
---

# Providers (LLMProvider)

Providers are the crucial connection layer between your VoltAgent `Agent` and the underlying Large Language Models (LLMs) or AI services. They abstract away the complexities of specific vendor APIs, handling tasks like authentication, request formatting, response parsing, and error mapping.

VoltAgent uses implementations of the `LLMProvider` interface to communicate with different AI services, allowing you to switch LLMs without changing your core agent logic.

## Available Providers

VoltAgent comes with built-in support for popular provider interfaces:

### `@voltagent/vercel-ai` (Vercel AI Provider)

Leverages the powerful [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction) to provide broad compatibility with numerous LLMs (OpenAI, Anthropic, Google Gemini, Mistral, Cohere, Groq, etc.) through a unified SDK.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
// Import model definitions from the Vercel AI SDK
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

// Instantiate the provider (usually requires no options)
const vercelProvider = new VercelAIProvider();

// Create an agent using an OpenAI model via Vercel AI SDK
const agentOpenAI = new Agent({
  name: "Vercel OpenAI Assistant",
  description: "A helpful assistant powered by OpenAI via Vercel SDK",
  llm: vercelProvider,
  // Pass the model object from the Vercel AI SDK
  model: openai("gpt-4o"),
});

// Create another agent using an Anthropic model via Vercel AI SDK
const agentAnthropic = new Agent({
  name: "Vercel Anthropic Assistant",
  description: "A helpful assistant powered by Anthropic via Vercel SDK",
  llm: vercelProvider, // Can reuse the same provider instance
  // Pass a different model object
  model: anthropic("claude-3-5-sonnet-20240620"),
});
```

**Choose `@voltagent/vercel-ai` when:** You want access to the widest range of models supported by the Vercel AI SDK and benefit from its features.

### `@voltagent/xsai` (xsAI Provider)

Provides a lightweight, minimal interface specifically designed for OpenAI and OpenAI-compatible APIs (like local models served via Ollama or LM Studio). Ideal for edge functions where bundle size is critical. See the [xsAI documentation](https://xsai.js.org/) for more.

```ts
import { Agent } from "@voltagent/core";
import { XsAIProvider } from "@voltagent/xsai";

// Instantiate the provider, passing necessary options like API keys or baseURL
const xsaiProvider = new XsAIProvider({
  // Example for OpenAI:
  apiKey: process.env.OPENAI_API_KEY,
  // Example for a local Ollama server:
  // baseURL: "http://localhost:11434/v1",
  // apiKey: "ollama", // Often required, even if not used by the server
});

const agent = new Agent({
  name: "xsAI Assistant",
  description: "A helpful assistant using a lightweight provider",
  llm: xsaiProvider,
  // Pass the model name as a string recognized by the target API
  model: "gpt-4o-mini", // Example for OpenAI
  // model: "llama3", // Example for Ollama
});
```

**Choose `@voltagent/xsai` when:** You need to connect specifically to OpenAI or compatible APIs and prioritize minimal bundle size.

### `@voltagent/google-ai` (Google AI Provider)

Connects to Google's Generative AI models (like Gemini) using the official [`@google/genai`](https://github.com/google/generative-ai-js) SDK.

```ts
import { Agent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";

// Ensure your API key is stored securely, e.g., in environment variables
const googleApiKey = process.env.GOOGLE_API_KEY;

// Instantiate the provider
const googleProvider = new GoogleGenAIProvider({
  apiKey: googleApiKey,
});

// Create an agent using a Google model
const agent = new Agent({
  name: "Google Assistant",
  description: "A helpful assistant powered by Google Gemini",
  llm: googleProvider,
  model: "gemini-1.5-pro-latest", // Specify the desired Google model name
});
```

Using the Google AI provider with Vertex AI has specific requirements:

1.  **Authentication:** Authentication must be handled using the [`google-auth-library`](https://www.npmjs.com/package/google-auth-library). You'll need to configure it with your service account credentials.
2.  **SDK Limitations:** Be aware of potential ongoing issues with Vertex AI authentication in the official Google AI SDK ([link](https://github.com/googleapis/js-genai/issues/426), [link-2](https://github.com/googleapis/js-genai/issues/417)).

```typescript
import { Agent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";
// Required for Vertex AI auth
import { GoogleAuth } from "google-auth-library";

// Ensure your service account credentials are secure and accessible
const credentials = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
};

const googleVertexProvider = new GoogleGenAIProvider({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT_ID, // Your project ID
  location: process.env.GOOGLE_CLOUD_LOCATION, // Your project location (e.g., "us-central1")
  googleAuthOptions: {
    credentials,
  },
});

const agentVertex = new Agent({
  name: "Google Vertex Assistant",
  description: "A helpful assistant powered by Google Gemini via Vertex AI",
  llm: googleVertexProvider,
  model: "gemini-1.5-pro-latest", // Specify the desired Google model
});
```

<br/>

**Choose `@voltagent/google-ai` when:** You specifically want to use Google's Gemini models via their dedicated SDK. It also supports Vertex AI configurations but only for server-side usage.

### `@voltagent/groq-ai` (Groq Provider)

Implements the [groq-sdk](https://github.com/groq/groq-typescript) as a provider to allow inferencing [supported models](https://console.groq.com/docs/models).

```ts
import { Agent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";

// Instantiate the provider, optionally passing the API key to overwrite the default process.env.GROQ_API_KEY
const groqProvider = new GroqProvider({
  apiKey: process.env.GROQ_API_KEY,
});

const agent = new Agent({
  name: "Groq Assistant",
  description: "A helpful assistant using the groq-ai provider",
  llm: groqProvider,
  // Pass the model name as a string recognized by the target API
  model: "meta-llama/llama-4-scout-17b-16e-instruct", //Example for Ollama
  //See groq documentation for others
});
```

**Choose `@voltagent/groq-ai` when:** You need to connect specifically to Groq API used for fast inferencing of supported models.

## The `model` Parameter

When creating an `Agent`, the `model` parameter's value is interpreted _by the selected `llm` provider_. Each provider uses its `getModelIdentifier` method to process this value.

- **`VercelAIProvider`**: Expects AI SDK model objects (e.g., `openai(...)`, `anthropic(...)`). It uses these objects directly with the underlying Vercel AI SDK functions.
- **`XsAIProvider`**: Expects a string representing the model name (e.g., `"gpt-4o-mini"`, `"llama3"`). It passes this string directly in the API calls.

This design allows providers to handle model specification in the way that best suits their underlying service or SDK.

## Why the Provider Architecture?

The provider architecture is a core design principle in VoltAgent, creating an abstraction layer between your application and various language models. This offers significant advantages:

- **Model Agnosticism:** Easily switch between different LLMs or vendors (e.g., from OpenAI to Anthropic) by simply changing the provider and model configuration, without altering your agent's core logic.
- **Unified Interface:** Interact with all supported LLMs using the same consistent agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`).
- **Flexibility & Control:** Manage provider-specific configurations (like API keys or base URLs) cleanly during provider instantiation.
- **Extensibility:** Integrate new or custom LLMs by creating new provider implementations. Keep your applications current with the evolving AI landscape.

## Creating a Custom Provider

For specialized needs, such as connecting to internal LLMs, niche cloud providers, or adding unique pre/post-processing logic, you can create a custom provider by implementing the `LLMProvider` interface from `@voltagent/core`.

Here's a structural overview of the required implementation:

```ts
import type {
  BaseMessage,
  GenerateObjectOptions,
  GenerateTextOptions,
  LLMProvider,
  ProviderObjectResponse,
  ProviderTextResponse,
  StreamObjectOptions,
  StreamTextOptions,
  // Import necessary types for streaming results if applicable
} from "@voltagent/core";
import { z } from "zod";

// Define the type for your provider's specific model representation
// (e.g., string, or a custom object if needed)
type MyModelType = string;
// Define the type for your provider's internal message format
type MyProviderMessageType = { role: string; text: string /* other fields */ };
// Define the raw response type from your provider's API
type MyProviderResponseType = any; // Replace 'any' with a more specific type

export class MyCustomProvider implements LLMProvider<MyModelType, MyProviderMessageType> {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // It's often good practice to bind methods if needed, although sometimes optional
    // this.generateText = this.generateText.bind(this);
    // ... bind other methods ...
  }

  /**
   * Returns a string identifier for the given model, used internally and for logging.
   */
  getModelIdentifier(model: MyModelType): string {
    return model; // Assuming model is already a string identifier
  }

  /**
   * Converts VoltAgent's standard BaseMessage format to the format expected by your LLM API.
   */
  toMessage(message: BaseMessage): MyProviderMessageType {
    // Map role and content, handle potential differences
    return {
      role: message.role === "assistant" ? "model" : message.role, // Example mapping
      text: message.content as string, // Assuming content is always string for this provider
    };
  }

  /**
   * Handles non-streaming text generation calls.
   */
  async generateText(
    options: GenerateTextOptions<MyModelType, MyProviderMessageType>
  ): Promise<ProviderTextResponse<MyProviderResponseType>> {
    const providerMessages = options.messages.map(this.toMessage);

    // --- Your API Call Logic Here ---
    console.log(`Calling custom API for model: ${options.model}`);
    const response = await fetch("https://my-custom-llm-api.com/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: providerMessages /*, other params */,
      }),
      signal: options.signal, // Pass the AbortSignal
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    const result: MyProviderResponseType = await response.json();
    // --- End API Call Logic ---

    // Map the raw API response back to VoltAgent's standard ProviderTextResponse format
    return {
      provider: result, // Store the original provider response
      text: result.generated_text || "", // Extract the text response
      usage: result.token_usage
        ? {
            // Map usage statistics
            promptTokens: result.token_usage.input,
            completionTokens: result.token_usage.output,
            totalTokens: result.token_usage.total,
          }
        : undefined,
      finishReason: result.stop_reason || "unknown", // Map finish reason
      // Include other fields like logprobs if available and needed
    };
  }

  /**
   * Handles streaming text generation calls.
   * Must return an object containing a readable stream (`result.stream`).
   */
  async streamText(
    options: StreamTextOptions<MyModelType, MyProviderMessageType>
  ): Promise<{ stream: ReadableStream<any>; provider: MyProviderResponseType }> {
    // Implementation involves making a streaming API call (e.g., using EventSource or fetch with ReadableStream)
    // and transforming the provider's stream chunks into VoltAgent's stream format.
    console.log(`Streaming from custom API for model: ${options.model}`);
    // ... Implementation details omitted for brevity ...
    throw new Error("streamText not implemented in this example");
  }

  /**
   * Handles non-streaming structured object generation calls.
   */
  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<MyModelType, TSchema, MyProviderMessageType>
  ): Promise<ProviderObjectResponse<MyProviderResponseType, z.infer<TSchema>>> {
    // Implementation involves sending the prompt and schema to an LLM API that supports
    // structured output or function calling, then parsing the result.
    console.log(`Generating object with custom API for model: ${options.model}`);
    // ... Implementation details omitted for brevity ...
    throw new Error("generateObject not implemented in this example");
  }

  /**
   * Handles streaming structured object generation calls.
   * Must return an object containing a readable stream (`result.objectStream`).
   */
  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<MyModelType, TSchema, MyProviderMessageType>
  ): Promise<{ objectStream: ReadableStream<any>; provider: MyProviderResponseType }> {
    // Implementation involves making a streaming API call and parsing partial object chunks.
    console.log(`Streaming object with custom API for model: ${options.model}`);
    // ... Implementation details omitted for brevity ...
    throw new Error("streamObject not implemented in this example");
  }
}

// --- Usage with your custom provider ---
// const customProvider = new MyCustomProvider("my-secret-api-key");
// const agent = new Agent({
//   name: "Custom Provider Agent",
//   description: "Using my custom provider",
//   llm: customProvider,
//   model: "my-custom-model-v1",
// });

// const response = await agent.generateText("Hello custom world!");
```

When creating a custom provider, ensure you correctly handle mapping between VoltAgent's standard formats (`BaseMessage`, `ProviderTextResponse`, etc.) and your target API's specific formats, including potential error conditions.
