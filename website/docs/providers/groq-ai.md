---
title: Groq AI
slug: /providers/groq-ai
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Groq AI Provider (`@voltagent/groq-ai`)

The Groq AI Provider connects VoltAgent to the Groq API, enabling the use of language models hosted on Groq's high-performance infrastructure. It utilizes the [`groq-sdk`](https://github.com/groq/groq-typescript) Node.js library.

**Key Characteristics:**

- **High-Speed Inference:** Leverages Groq's LPU™ Inference Engine for fast response times.
- **API Key Authentication:** Uses Groq API keys for authentication.
- **OpenAI-Compatible API:** Primarily interacts with Groq's chat completions endpoint, which shares similarities with the OpenAI API structure.

## Installation

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash copy
    npm install @voltagent/core @voltagent/groq-ai zod
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash copy
    yarn add @voltagent/core @voltagent/groq-ai zod
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash copy
    pnpm add @voltagent/core @voltagent/groq-ai zod
    ```
  </TabItem>
</Tabs>

_Note: `groq-sdk` is a peer dependency. `zod` is required if using `generateObject`._

## Configuration

The `GroqProvider` requires your Groq API key.

You can provide the API key directly during instantiation or set the `GROQ_API_KEY` environment variable.

```typescript
import { GroqProvider } from "@voltagent/groq-ai";

// Option 1: Direct API Key
const groqProviderDirect = new GroqProvider({
  apiKey: "YOUR_GROQ_API_KEY",
});

// Option 2: Environment Variable (GROQ_API_KEY)
// Ensure process.env.GROQ_API_KEY is set
const groqProviderEnv = new GroqProvider();
```

Get your API key from the [GroqCloud Console](https://console.groq.com/keys).

## Full Runnable Example

For a complete, runnable example demonstrating the use of this provider, please see:

- **Groq AI:** [`examples/with-groq-ai`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-groq-ai)

## Usage

Instantiate your `Agent` with the configured `GroqProvider`:

```typescript
import { Agent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";

// Using environment variable configuration from above
const groqProvider = new GroqProvider();

const agent = new Agent({
  name: "Groq Speed Agent",
  instructions: "An agent powered by Groq's fast inference",
  llm: groqProvider,
  // Specify the desired Groq model ID (e.g., Llama3, Mixtral)
  // Find available models: https://console.groq.com/docs/models
  model: "llama3-8b-8192",
});

// Example call
async function run() {
  const response = await agent.generateText("Explain what makes Groq's inference engine fast.");
  console.log(response.text);
}

run();
```

## Supported Methods

- **`generateText`**: Supported. Calls Groq SDK's `chat.completions.create`.
- **`streamText`**: Supported. Calls Groq SDK's `chat.completions.create` with `stream: true`.
- **`generateObject`**: Supported. Calls Groq SDK's `chat.completions.create` with `response_format: { type: 'json_object' }`. Requires a `z.ZodObject` schema and a model that supports JSON mode.
- **`streamObject`**: ❌ **Not Supported.** This provider currently does not implement object streaming.

## Multi-modal Support

❌ **Not Supported.**

The provider currently only handles string content within `BaseMessage` objects. Multi-modal inputs (like images) are not processed.

## Tool Calling Support

✅ **Supported!**

Native tool calling support for the `@voltagent/groq-ai` provider is now available as of version `0.1.4`. This allows you to define tools (functions) that Groq AI models can invoke as part of their response generation, using VoltAgent's `generateText` or `streamText` methods with tool definitions.

This functionality was made possible by the contributions from [@TheEmi](https://github.com/TheEmi) in [Release v0.1.4](https://github.com/VoltAgent/voltagent/releases/tag/%40voltagent%2Fgroq-ai%400.1.4).

For examples and further details on how to define and use tools with VoltAgent, please refer to the general VoltAgent documentation on [Tool Calling](../tools/overview.md).

Make sure your `@voltagent/groq-ai` package is updated to `0.1.4` or later to use this feature.

## Model Selection & Options

The specific Groq model ID (e.g., `'llama3-70b-8192'`, `'mixtral-8x7b-32768'`) is set via the `model` property during `Agent` instantiation. Refer to the [Groq Models Documentation](https://console.groq.com/docs/models) for available model IDs.

You can override or provide additional Groq-specific generation parameters (like `temperature`, `max_tokens`, `top_p`, `stop`, etc.) per-request using the `provider` key within the options object of `generateText`, `streamText`, or `generateObject`.

```typescript
// Example: Overriding temperature and max_tokens for a specific call
const response = await agent.generateText("Write a short story about a futuristic city.", {
  provider: {
    temperature: 0.8,
    maxTokens: 500,
    // Other Groq-specific parameters (max_tokens, top_p, etc.)
  },
});
```

Refer to the [`groq-sdk` documentation](https://github.com/groq/groq-typescript) or the [Groq API Reference](https://console.groq.com/docs/api-reference#chat-create) for the full list of available parameters.

## Code Examples

### Text Generation (`generateText`)

```typescript
import { Agent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";

async function main() {
  // Assumes GROQ_API_KEY is set in environment variables
  const groqProvider = new GroqProvider();

  const agent = new Agent({
    name: "Groq Text Agent",
    instructions: "Generates text using Groq AI",
    llm: groqProvider,
    model: "mixtral-8x7b-32768", // Example model
  });

  const prompt = "What is the capital of France?";

  try {
    const response = await agent.generateText(prompt);
    console.log(`Agent response to "${prompt}":`);
    console.log(response.text);
    console.log("Usage:", response.usage);
    console.log("Finish Reason:", response.finishReason);
  } catch (error) {
    console.error("Error generating text:", error);
  }
}

main();
```

### Streaming Text (`streamText`)

```typescript
import { Agent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";

async function main() {
  const groqProvider = new GroqProvider({
    // Or provide apiKey directly
    // apiKey: 'YOUR_GROQ_API_KEY'
  });

  const agent = new Agent({
    name: "Groq Streaming Agent",
    instructions: "Streams text using Groq AI",
    llm: groqProvider,
    model: "llama3-8b-8192", // Example model
  });

  const prompt = "Write a haiku about speed.";

  try {
    const streamResponse = await agent.streamText(prompt);

    console.log(`Streaming agent response to "${prompt}":`);
    let fullText = "";
    for await (const chunk of streamResponse.textStream) {
      fullText += chunk;
      process.stdout.write(chunk);
    }
    console.log("\n--- Stream Finished ---");
    // Note: Usage info might be available via callbacks (onFinish/onStepFinish)
    // or attached to the stream result in the provider implementation.
    // Check GroqProvider source for specifics if needed.
  } catch (error) {
    console.error("Error streaming text:", error);
  }
}

main();
```

### Generating Structured Objects (`generateObject`)

_Requires a model that supports JSON mode (e.g., Llama3 models on Groq)._ Find compatible models on the [Groq models page](https://console.groq.com/docs/models).

```typescript
import { Agent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";
import { z } from "zod"; // Import Zod

// Define a Zod schema for the desired object structure
const citySchema = z.object({
  name: z.string().describe("The city name"),
  country: z.string().describe("The country the city is in"),
  population: z.number().int().positive().describe("Estimated population"),
  landmarks: z.array(z.string()).describe("List of famous landmarks"),
});

async function main() {
  const groqProvider = new GroqProvider();

  // Use a model supporting JSON mode
  const agent = new Agent({
    name: "Groq Object Agent",
    instructions: "Generates structured data using Groq AI",
    llm: groqProvider,
    model: "llama3-70b-8192",
  });

  const prompt = "Generate details for Paris, France.";

  try {
    // Call generateObject with the prompt and Zod schema
    const response = await agent.generateObject(prompt, citySchema, {
      provider: {
        temperature: 0.1, // Low temperature for JSON mode
      },
    });

    console.log("Generated Object:");
    console.log(response.object);
    console.log("Usage:", response.usage);
    console.log("Finish Reason:", response.finishReason);
  } catch (error) {
    console.error("Error generating object:", error);
  }
}

main();
```
