---
title: Vercel AI
slug: /providers/vercel-ai
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Vercel AI Provider (`@voltagent/vercel-ai`)

The Vercel AI Provider acts as a bridge between VoltAgent and the [Vercel AI SDK](https://sdk.vercel.ai/docs), allowing your agents to leverage models deployed or accessible via Vercel's infrastructure. It essentially wraps the Vercel AI SDK's `generateText` and `streamText` functions (and potentially others in the future).

**Key Characteristics:**

- **Model Agnostic (at Provider Level):** The specific LLM used (e.g., OpenAI, Anthropic, Cohere, Hugging Face) is determined by the model identifier string you pass during generation calls, which the Vercel AI SDK then routes accordingly.
- **Focus on Text Generation:** Primarily designed for text-based generation and streaming via Vercel AI SDK's core functions.

## Installation

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash copy
    npm install @voltagent/core @voltagent/vercel-ai
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash copy
    yarn add @voltagent/core @voltagent/vercel-ai
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash copy
    pnpm add @voltagent/core @voltagent/vercel-ai
    ```
  </TabItem>
</Tabs>

## Configuration

The `VercelProvider` itself doesn't require any constructor arguments, as it relies on the environment configuration recognized by the Vercel AI SDK.

```typescript
import { VercelProvider } from "@voltagent/vercel-ai";

const vercelProvider = new VercelProvider();
```

Ensure your environment variables (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, etc.) are set up correctly for the models you intend to use. The Vercel AI SDK automatically reads these keys from your environment (like a `.env` file or system variables).

The Vercel AI SDK supports a wide array of providers beyond OpenAI and Anthropic. For a comprehensive list and setup instructions for each, please refer to the [official Vercel AI SDK Provider documentation](https://sdk.vercel.ai/docs/foundations/providers-and-models).

## Usage

Instantiate your `Agent` with the `VercelProvider`:

```typescript
import { Agent } from "@voltagent/core";
import { VercelProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const vercelProvider = new VercelProvider();

const agent = new Agent({
  name: "Vercel Chat Agent",
  description: "An agent powered by models via Vercel AI SDK",
  llm: vercelProvider,
  model: openai("gpt-4o"),
});
```

## Supported Methods

- **`generateText`**: Supported. Calls Vercel AI SDK's `generateText`.
- **`streamText`**: Supported. Calls Vercel AI SDK's `streamText`.
- **`generateObject`**: ⚠️ **Partially Supported.** Uses Vercel AI SDK's `generateObject` function. Support depends on the underlying model's capability to generate structured JSON output reliably based on the provided Zod schema. Check Vercel AI SDK documentation for model compatibility.
- **`streamObject`**: ⚠️ **Partially Supported.** Uses Vercel AI SDK's `streamObject` function. Support depends on the underlying model and Vercel AI SDK's ability to stream partial object updates.

## Multi-modal Support

⚠️ **Conditional Support.**

The `@voltagent/vercel-ai` provider will pass multi-modal `BaseMessage` structures (containing text and image parts in the `content` array) to the underlying Vercel AI SDK functions.

Actual multi-modal support **depends entirely** on whether the specific model identifier you provide (e.g., `'gpt-4o-mini'`, `'gpt-4o'`) corresponds to a model that Vercel AI SDK can route to and that supports image input.

Refer to the [Multi-modal Agents](../agents/multi-modal.md) guide and the [Vercel AI SDK documentation](https://sdk.vercel.ai/docs) for details on configuring and using multi-modal models.

```typescript
// Make sure to import the model definition (e.g., openai)
import { openai } from "@ai-sdk/openai";
// Example: Sending multi-modal input (requires Vercel AI SDK setup for a vision model)
const messages = [
  {
    role: "user",
    content: [
      { type: "text", text: "Describe this image:" },
      { type: "image", image: "data:image/png;base64,..." },
    ],
  },
];

// Ensure the model identifier matches a vision-capable model configured in Vercel AI SDK
const response = await agent.generateText(messages, { model: openai("gpt-4-vision-preview") });
```

## Model Selection

The model used by the agent is specified during its instantiation using the `model` property. Currently, the model **cannot** be overridden dynamically per-request in the `generateText` or `streamText` options. To use different models, you would typically create separate `Agent` instances.

The `model` identifier should be created using the functions provided by the Vercel AI SDK's model packages (e.g., `@ai-sdk/openai`, `@ai-sdk/anthropic`).

```typescript
// Make sure to import model definitions
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

// Example: Agent configured with OpenAI model
const openAIAgent = new Agent({
  id: "openai-agent",
  llm: new VercelProvider(),
  model: openai("gpt-4o"),
  description: "Uses OpenAI",
});

// Example: Agent configured with Anthropic model
const anthropicAgent = new Agent({
  id: "anthropic-agent",
  llm: new VercelProvider(),
  model: anthropic("claude-3-sonnet-20240229"),
  description: "Uses Anthropic",
});

// Example: Using generateText with the configured agent
const response = await openAIAgent.generateText("Translate 'hello' to French.");

console.log(response);

// Example: Streaming with a different configured agent
const streamResponse = await anthropicAgent.streamText("Write a poem about clouds.");

for await (const chunk of streamResponse.textStream) {
  process.stdout.write(chunk);
}
```

## Code Examples

### Text Generation

```ts
import { Agent } from "@voltagent/core";
import { VercelProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

async function main() {
  const vercelProvider = new VercelProvider();

  const agent = new Agent({
    name: "Simple Vercel Agent",
    description: "A simple agent powered by Vercel AI SDK",
    llm: vercelProvider,
    model: openai("gpt-4o-mini"),
  });

  const prompt = "What is the capital of France?";

  try {
    const response = await agent.generateText(prompt);
    console.log(`Agent response to "${prompt}":`);
    console.log(response);
  } catch (error) {
    console.error("Error generating text:", error);
  }
}

main();
```

### Streaming Text

```typescript
import { Agent } from "@voltagent/core";
import { VercelProvider } from "@voltagent/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";

async function main() {
  const vercelProvider = new VercelProvider();

  const agent = new Agent({
    name: "Vercel Streaming Agent",
    description: "A streaming agent powered by Vercel AI SDK",
    llm: vercelProvider,
    model: anthropic("claude-3-haiku-20240307"),
  });

  const prompt = "Write a short story about a robot learning to paint.";

  try {
    const streamResponse = await agent.streamText(prompt);

    console.log(`Streaming agent response to "${prompt}":`);
    for await (const chunk of streamResponse.textStream) {
      process.stdout.write(chunk);
    }
    console.log();
  } catch (error) {
    console.error("Error streaming text:", error);
  }
}

main();
```

### Generating Structured Objects (`generateObject`)

```typescript
import { Agent } from "@voltagent/core";
import { VercelProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod"; // Import Zod

// Define a schema for the desired object structure
const personSchema = z.object({
  name: z.string().describe("The person's full name"),
  age: z.number().describe("The person's age"),
  city: z.string().describe("The city they live in"),
});

async function main() {
  const vercelProvider = new VercelProvider();

  // Ensure the model supports object generation (e.g., gpt-4o)
  const agent = new Agent({
    name: "Vercel Object Agent",
    description: "An agent that generates structured data via Vercel AI SDK",
    llm: vercelProvider,
    model: openai("gpt-4o"),
  });

  const prompt =
    "Generate details for a software engineer named Alex who is 30 years old and lives in London.";

  try {
    // Call generateObject with the prompt and schema
    const response = await agent.generateObject(prompt, personSchema);

    console.log("Generated Object:");
    console.log(response.object);
    console.log("Usage:", response.usage);
  } catch (error) {
    console.error("Error generating object:", error);
  }
}

main();
```

### Streaming Structured Objects (`streamObject`)

_Note: `streamObject` support is highly dependent on the specific model and provider implementation._

```typescript
import { Agent } from "@voltagent/core";
import { VercelProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod"; // Import Zod

// Define a schema for the desired object structure
const recipeSchema = z.object({
  dishName: z.string().describe("Name of the dish"),
  ingredients: z.array(z.string()).describe("List of ingredients"),
  steps: z.array(z.string()).describe("Cooking steps"),
});

async function main() {
  const vercelProvider = new VercelProvider();

  // Ensure the model supports object streaming (e.g., gpt-4o)
  const agent = new Agent({
    name: "Vercel Object Streaming Agent",
    description: "An agent that streams structured data via Vercel AI SDK",
    llm: vercelProvider,
    model: openai("gpt-4o"),
  });

  const prompt = "Generate a simple recipe for pancakes.";

  try {
    // Call streamObject with the prompt and schema
    const response = await agent.streamObject(prompt, recipeSchema);

    console.log("Streaming Object Updates:");
    // Stream partial object updates
    for await (const partialObject of response.objectStream) {
      console.log("Partial:", partialObject);
    }

    // Get the final object once streaming is complete
    const finalObject = await response.object;
    console.log("\nFinal Streamed Object:");
    console.log(finalObject);
    console.log("Usage:", response.usage);
  } catch (error) {
    console.error("Error streaming object:", error);
  }
}

main();
```

### Provider-Specific Options

You can pass provider-specific options directly to the underlying Vercel AI SDK functions (`generateText`, `streamText`, `generateObject`, `streamObject`) using the `provider` property within the options object. This allows you to leverage features or configurations specific to the Vercel AI SDK or the underlying model provider that might not be part of the standard VoltAgent options.

For example, to use an experimental Vercel AI SDK feature:

```typescript
agent.streamText("Tell me a joke", {
  provider: {
    // Pass any Vercel AI SDK compatible option here
    experimental_activeTools: ["tool1", "tool2"], // Example Vercel AI SDK option
    // otherProviderOptions...
  },
});
```

Refer to the [Vercel AI SDK documentation](https://sdk.vercel.ai/docs) for the available options for each function and model provider.
