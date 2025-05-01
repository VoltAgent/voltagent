---
title: xsAI (OpenAI Compatible)
slug: /providers/xsai
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# xsAI Provider (`@voltagent/xsai`)

The xsAI Provider acts as a versatile connector between VoltAgent and any OpenAI-compatible API endpoint. It leverages the [`xsai`](https://www.npmjs.com/package/xsai) library, providing a unified interface for interacting with various services like OpenAI, Groq, Together AI, Anyscale Endpoints, Mistral AI (via compatible endpoints), and more.

**Key Characteristics:**

- **OpenAI Compatibility:** Designed to work seamlessly with APIs adhering to the OpenAI specification.
- **Endpoint Flexibility:** Allows specifying a custom `baseURL`, enabling connection to various self-hosted or alternative LLM providers.
- **Full Functionality:** Supports text generation, object generation, streaming for both, and robust tool usage.
- **Dynamic Imports:** Uses dynamic imports for the `xsai` library, potentially reducing initial load times.

## Installation

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash copy
    npm install @voltagent/core @voltagent/xsai xsai zod
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash copy
    yarn add @voltagent/core @voltagent/xsai xsai zod
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash copy
    pnpm add @voltagent/core @voltagent/xsai xsai zod
    ```
  </TabItem>
</Tabs>

_Note: `xsai` is a required peer dependency. `zod` is needed for `generateObject` and `streamObject`._

## Configuration

The `XsAIProvider` requires an API key compatible with the target endpoint.

```typescript
import { XsAIProvider } from "@voltagent/xsai";

// Example using OpenAI API key from environment variables
const openaiProvider = new XsAIProvider({
  apiKey: process.env.OPENAI_API_KEY!, // Assumes OPENAI_API_KEY is set
});

// Example connecting to a different OpenAI-compatible endpoint (like Groq)
const groqProvider = new XsAIProvider({
  apiKey: process.env.GROQ_API_KEY!, // Assumes GROQ_API_KEY is set
  baseURL: "https://api.groq.com/openai/v1/", // Groq's OpenAI-compatible endpoint
});

// Example connecting to a local endpoint (like Ollama with an OpenAI adapter)
const localProvider = new XsAIProvider({
  apiKey: "ollama", // Often not required or a placeholder for local models
  baseURL: "http://localhost:11434/v1/", // Default Ollama endpoint
});
```

- `apiKey`: Your API key for the service.
- `baseURL` (Optional): The base URL of the OpenAI-compatible API endpoint. Defaults to `https://api.openai.com/v1/`.

## Full Runnable Example

For a complete, runnable example demonstrating basic use with OpenAI, please see:

- **xsAI (with OpenAI):** [`examples/with-xsai`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-xsai)

## Usage

Instantiate your `Agent` with the configured `XsAIProvider`.

```typescript
import { Agent } from "@voltagent/core";
import { XsAIProvider } from "@voltagent/xsai";

// Using OpenAI configuration from above
const xsaiProvider = new XsAIProvider({ apiKey: process.env.OPENAI_API_KEY! });

const agent = new Agent({
  name: "Compatible Agent",
  description: "An agent using an OpenAI-compatible API via xsAI",
  llm: xsaiProvider,
  // Model identifier specific to the target API (e.g., OpenAI, Groq, local)
  model: "gpt-4o-mini",
});

// Example call
async function run() {
  const response = await agent.generateText("What is the capital of Canada?");
  console.log(response.text);
}

run();
```

## Supported Methods

- **`generateText`**: Supported. Can include tool usage.
- **`streamText`**: Supported. Can include tool usage streaming.
- **`generateObject`**: Supported. Uses the underlying API's JSON mode if available.
- **`streamObject`**: Supported. Streams partial JSON object updates.
- **Tool Usage:** Supported via the `tools` parameter in `generateText` and `streamText`.

## Multi-modal Support

❌ **Not Supported.**

The provider currently only handles text content. Image or other multi-modal inputs are not processed by this provider.

## Model Selection & Options

The `model` property during `Agent` instantiation should be the specific model identifier recognized by the target API endpoint (e.g., `'gpt-4o-mini'` for OpenAI, `'llama3-70b-8192'` for Groq, etc.).

You can pass provider-specific options (like `temperature`, `max_tokens`, `top_p`, `frequency_penalty`, etc.) compatible with the OpenAI API specification using the `provider` key in the method options.

```typescript
const response = await agent.generateText("Tell me a joke.", {
  provider: {
    temperature: 0.9,
    max_tokens: 100,
    // Other OpenAI-compatible parameters
  },
});
```

Refer to the API documentation of your specific endpoint provider (e.g., [OpenAI API Reference](https://platform.openai.com/docs/api-reference/chat/create)) for available parameters.

## Code Examples

### Text Generation (`generateText`)

```typescript
import { Agent } from "@voltagent/core";
import { XsAIProvider } from "@voltagent/xsai";

async function main() {
  // Assumes OPENAI_API_KEY is set
  const provider = new XsAIProvider({ apiKey: process.env.OPENAI_API_KEY! });

  const agent = new Agent({
    name: "xsAI Text Agent",
    description: "Generates text using an OpenAI-compatible API",
    llm: provider,
    model: "gpt-4o-mini",
  });

  const prompt = "Explain the concept of Large Language Models simply.";

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
import { XsAIProvider } from "@voltagent/xsai";

async function main() {
  const provider = new XsAIProvider({ apiKey: process.env.OPENAI_API_KEY! });

  const agent = new Agent({
    name: "xsAI Streaming Agent",
    description: "Streams text using an OpenAI-compatible API",
    llm: provider,
    model: "gpt-4o-mini",
  });

  const prompt = "Write a short paragraph about the future of AI.";

  try {
    const streamResponse = await agent.streamText(prompt);

    console.log(`Streaming agent response to "${prompt}":`);
    for await (const chunk of streamResponse.textStream) {
      process.stdout.write(chunk);
    }
    console.log("\n--- Stream Finished ---");
    // Usage and finish reason might be available via callbacks
  } catch (error) {
    console.error("Error streaming text:", error);
  }
}

main();
```

### Generating Structured Objects (`generateObject`)

```typescript
import { Agent } from "@voltagent/core";
import { XsAIProvider } from "@voltagent/xsai";
import { z } from "zod";

const recipeSchema = z.object({
  dishName: z.string(),
  ingredients: z.array(z.object({ name: z.string(), quantity: z.string() })),
  steps: z.array(z.string()),
});

async function main() {
  const provider = new XsAIProvider({ apiKey: process.env.OPENAI_API_KEY! });

  const agent = new Agent({
    name: "xsAI Object Agent",
    description: "Generates structured objects",
    llm: provider,
    model: "gpt-4o", // Use a model known for good JSON output
  });

  const prompt = "Generate a simple recipe for pancakes as a JSON object.";

  try {
    const response = await agent.generateObject(prompt, recipeSchema);
    console.log("Generated Object:");
    console.log(JSON.stringify(response.object, null, 2));
    console.log("Usage:", response.usage);
    console.log("Finish Reason:", response.finishReason);
  } catch (error) {
    console.error("Error generating object:", error);
  }
}

main();
```

### Streaming Structured Objects (`streamObject`)

```typescript
import { Agent } from "@voltagent/core";
import { XsAIProvider } from "@voltagent/xsai";
import { z } from "zod";

const travelPlanSchema = z.object({
  destination: z.string(),
  durationDays: z.number().int(),
  activities: z.array(z.string()),
  budget: z.string().optional(),
});

async function main() {
  const provider = new XsAIProvider({ apiKey: process.env.OPENAI_API_KEY! });

  const agent = new Agent({
    name: "xsAI Object Streaming Agent",
    description: "Streams structured objects",
    llm: provider,
    model: "gpt-4o",
  });

  const prompt = "Generate a 3-day travel plan for Tokyo.";

  try {
    const response = await agent.streamObject(prompt, travelPlanSchema);
    console.log("Streaming Object Updates:");
    for await (const partialObject of response.objectStream) {
      console.log("Partial:", partialObject);
    }
    // Final object/usage might be available via callbacks or provider result
    console.log("\n--- Object Stream Finished ---");
  } catch (error) {
    console.error("Error streaming object:", error);
  }
}

main();
```
