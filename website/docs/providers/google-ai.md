---
title: Google AI (Gemini & Vertex AI)
slug: /providers/google-ai
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Google AI Provider (`@voltagent/google-ai`)

The Google AI Provider integrates VoltAgent with Google's Generative AI capabilities, supporting both the Gemini API (via API Key) and Vertex AI (via project/location configuration). It wraps the [`@google/genai`](https://github.com/googleapis/js-genai) SDK.

**Key Characteristics:**

- **Dual API Support:** Works seamlessly with both Google AI Studio's Gemini API (using an API key) and Google Cloud's Vertex AI platform.
- **Model Agnostic (within Google):** Accepts standard Google model identifier strings (e.g., `'gemini-1.5-pro'`, `'gemini-1.5-flash'`).
- **Core Functionality:** Focuses on text generation, streaming, and structured object generation using the underlying Google SDK.

## Installation

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash copy
    npm install @voltagent/core @voltagent/google-ai zod
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash copy
    yarn add @voltagent/core @voltagent/google-ai zod
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash copy
    pnpm add @voltagent/core @voltagent/google-ai zod
    ```
  </TabItem>
</Tabs>

_Note: `@google/genai` is a peer dependency. `zod` is required if using `generateObject`._

## Configuration

The `GoogleGenAIProvider` requires configuration either for the Gemini API or Vertex AI.

**1. Using Gemini API Key:**

Provide your API key directly or set the `GEMINI_API_KEY` environment variable.

```typescript
import { GoogleGenAIProvider } from "@voltagent/google-ai";

// Option 1: Direct API Key
const googleProviderApiKey = new GoogleGenAIProvider({
  apiKey: "YOUR_GEMINI_API_KEY",
});

// Option 2: Environment Variable (GEMINI_API_KEY)
// Ensure process.env.GEMINI_API_KEY is set
const googleProviderEnv = new GoogleGenAIProvider({});
```

**2. Using Vertex AI:**

Provide your Google Cloud project ID and location. Ensure your environment is authenticated (e.g., via `gcloud auth application-default login`). **Note:** The `vertexai: true` flag is required alongside `project` and `location`.

```typescript
import { GoogleGenAIProvider } from "@voltagent/google-ai";

const googleProviderVertex = new GoogleGenAIProvider({
  vertexai: true, // Required for Vertex AI
  project: "YOUR_GCP_PROJECT_ID",
  location: "YOUR_GCP_LOCATION", // e.g., 'us-central1'
});
```

**Important:** You cannot provide both an `apiKey` and Vertex AI configuration (`project`/`location`) simultaneously.

## Full Runnable Examples

For complete, runnable examples demonstrating the use of this provider, please see:

- **Google AI (Gemini API Key):** [`examples/with-google-ai`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-ai)
- **Google Vertex AI:** [`examples/with-google-vertex-ai`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-vertex-ai)

## Usage

Instantiate your `Agent` with the configured `GoogleGenAIProvider`:

```typescript
import { Agent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";

// Using API Key configuration from above
const googleProvider = new GoogleGenAIProvider({ apiKey: "YOUR_GEMINI_API_KEY" });
// Or using Vertex AI configuration
// const googleProvider = new GoogleGenAIProvider({ project: '...', location: '...' });

const agent = new Agent({
  name: "Google Gemini Agent",
  instructions: "An agent powered by Google Gemini",
  llm: googleProvider,
  model: "gemini-1.5-flash", // Specify the desired Google model ID
});

// Example call
async function run() {
  const response = await agent.generateText(
    "Explain the difference between Google Gemini and Vertex AI."
  );
  console.log(response.text);
}

run();
```

## Supported Methods

- **`generateText`**: Supported. Calls Google GenAI SDK's `generateContent`.
- **`streamText`**: Supported. Calls Google GenAI SDK's `generateContentStream`.
- **`generateObject`**: Supported. Calls Google GenAI SDK's `generateContent` with `responseMimeType: 'application/json'` and a derived `responseSchema`. Requires a `z.ZodObject` schema.
- **`streamObject`**: ❌ **Not Supported.** The underlying Google SDK streams partial text chunks, which cannot be reliably converted into partial JSON objects during the stream.

## Multi-modal Support

❌ **Not Supported.**

Currently, the provider only processes the `text` parts of `BaseMessage` content arrays. Other modalities (like images) are ignored. Future versions may add support if the underlying Google SDK allows straightforward integration.

## Tool Calling Support

✅ **Supported!**

The `@voltagent/google-ai` provider now supports native tool calling and function calling features directly through VoltAgent's `generateText` or `streamText` methods with tool definitions. This allows you to define tools (functions) that the Google AI models can invoke as part of their response generation.

This functionality was added in [PR #99](https://github.com/VoltAgent/voltagent/pull/99) by [@luixaviles](https://github.com/luixaviles). Thanks for the contribution!

For examples and further details on how to define and use tools with VoltAgent, please refer to the general VoltAgent documentation on [Tool Calling](../tools/overview.md).

## Model Selection & Options

The specific Google model (e.g., `'gemini-1.5-pro'`, `'gemini-1.5-flash'`) is set via the `model` property during `Agent` instantiation.

You can override or provide additional Google-specific generation parameters (like `temperature`, `topP`, `seed`, `stopSequences`, etc.) per-request using the `provider` key within the options object of `generateText`, `streamText`, or `generateObject`.

```typescript
// Example: Overriding temperature for a specific call
const response = await agent.generateText("Write a creative story.", {
  provider: {
    temperature: 0.9,
    topK: 40, // Google-specific parameter
    // Any other valid GenerateContentConfig options
  },
});

// Example: Using thinkingConfig to control thinking budget
const response = await agent.generateText("Write a creative story.", {
  provider: {
    thinkingConfig: {
      thinkingBudget: 0,
    },
  },
});
```

Refer to the [`@google/genai` documentation](https://github.com/googleapis/js-genai) for the full list of available configuration parameters within `GenerateContentConfig`.

## Code Examples

### Text Generation (`generateText`)

```typescript
import { Agent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";

async function main() {
  const googleProvider = new GoogleGenAIProvider({
    apiKey: process.env.GEMINI_API_KEY, // Ensure GEMINI_API_KEY is set
  });

  const agent = new Agent({
    name: "Google Text Agent",
    instructions: "Generates text using Google AI",
    llm: googleProvider,
    model: "gemini-1.5-flash",
  });

  const prompt = "What are the main features of the Gemini 1.5 Pro model?";

  try {
    const response = await agent.generateText(prompt);
    console.log(`Agent response to "${prompt}":`);
    console.log(response.text);
    console.log("Usage:", response.usage);
  } catch (error) {
    console.error("Error generating text:", error);
  }
}

main();
```

### Streaming Text (`streamText`)

```typescript
import { Agent } from '@voltagent/core';
import { GoogleGenAIProvider } from '@voltagent/google-ai';

async function main() {
  const googleProvider = new GoogleGenAIProvider({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const agent = new Agent({
    name: 'Google Streaming Agent',
    instructions: 'Streams text using Google AI',
    llm: googleProvider,
    model: 'gemini-1.5-flash',
  });

  const prompt = "Write a short poem about the evolution of AI.";

  try {
    const streamResponse = await agent.streamText(prompt);

    console.log(`Streaming agent response to "${prompt}":`);
    for await (const chunk of streamResponse.textStream) {
      process.stdout.write(chunk);
    }
    console.log('
--- Stream Finished ---');
    // Note: Usage info might not be available until the stream completes
    // and is accessed via callbacks (onFinish, onStepFinish) or potentially
    // attached to the stream result object in future updates.
  } catch (error) {
    console.error("Error streaming text:", error);
  }
}

main();
```

### Generating Structured Objects (`generateObject`)

```typescript
import { Agent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";
import { z } from "zod"; // Import Zod

// Define a Zod schema for the desired object structure
const characterSchema = z.object({
  name: z.string().describe("The character's name"),
  species: z.string().describe("The character's species"),
  abilities: z.array(z.string()).describe("List of key abilities"),
  homePlanet: z.string().optional().describe("The character's home planet (if known)"),
});

async function main() {
  const googleProvider = new GoogleGenAIProvider({
    apiKey: process.env.GEMINI_API_KEY,
  });

  // Ensure the model supports function calling/JSON mode
  const agent = new Agent({
    name: "Google Object Agent",
    instructions: "Generates structured data using Google AI",
    llm: googleProvider,
    model: "gemini-1.5-pro", // Models like Pro are generally better for structured output
  });

  const prompt =
    "Generate details for a sci-fi character: a veteran space pilot named Commander Valerius, who is human and known for exceptional navigation skills and piloting expertise.";

  try {
    // Call generateObject with the prompt and Zod schema
    const response = await agent.generateObject(prompt, characterSchema, {
      provider: {
        temperature: 0.2, // Lower temperature often helps with structured formats
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
