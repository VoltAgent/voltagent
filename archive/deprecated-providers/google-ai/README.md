# Google AI Provider (`@voltagent/google-ai`)

> ⚠️ **DEPRECATED**: This package is deprecated. Please use the [Vercel AI SDK's Google providers](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) with `@voltagent/vercel-ai` instead.
>
> **Migration Guide:**
>
> ```typescript
> // Old (deprecated)
> import { GoogleAIProvider } from "@voltagent/google-ai";
> const provider = new GoogleAIProvider({ apiKey: "..." });
>
> // New (recommended) - for Gemini API
> import { VercelAIProvider } from "@voltagent/vercel-ai";
> import { google } from "@ai-sdk/google";
> const provider = new VercelAIProvider();
> // Use with: model: google("gemini-1.5-pro")
>
> // New (recommended) - for Vertex AI
> import { VercelAIProvider } from "@voltagent/vercel-ai";
> import { vertex } from "@ai-sdk/google-vertex";
> const provider = new VercelAIProvider();
> // Use with: model: vertex("gemini-1.5-pro")
> ```

The Google AI Provider integrates VoltAgent with Google's Generative AI capabilities, supporting both the Gemini API (via API Key) and Vertex AI (via project/location configuration). It wraps the [`@google/genai`](https://github.com/googleapis/js-genai) SDK.

**Key Characteristics:**

- **Dual API Support:** Works seamlessly with both Google AI Studio's Gemini API (using an API key) and Google Cloud's Vertex AI platform.
- **Model Agnostic (within Google):** Accepts standard Google model identifier strings (e.g., `'gemini-1.5-pro'`, `'gemini-1.5-flash'`).
- **Core Functionality:** Focuses on text generation, streaming, and structured object generation using the underlying Google SDK.

## Installation

```bash
npm install @voltagent/core @voltagent/google-ai zod
```

_Note: `@google/genai` is a peer dependency. `zod` is required if using `generateObject`._

## Configuration

### Option 1: Gemini API (API Key)

```typescript
import { GoogleAIProvider } from "@voltagent/google-ai";

// Direct API Key
const googleProvider = new GoogleAIProvider({
  apiKey: "YOUR_GOOGLE_API_KEY",
});

// Or via Environment Variable (GOOGLE_GENERATIVE_AI_API_KEY)
const googleProvider = new GoogleAIProvider({});
```

### Option 2: Vertex AI (Project & Location)

```typescript
import { GoogleAIProvider } from "@voltagent/google-ai";

const googleProvider = new GoogleAIProvider({
  project: "YOUR_GCP_PROJECT_ID",
  location: "us-central1", // or your preferred region
});
```

## Usage

```typescript
import { Agent } from "@voltagent/core";
import { GoogleAIProvider } from "@voltagent/google-ai";

const googleProvider = new GoogleAIProvider({ apiKey: "YOUR_API_KEY" });

const agent = new Agent({
  name: "Gemini Agent",
  instructions: "An agent powered by Google's Gemini",
  llm: googleProvider,
  model: "gemini-1.5-flash", // or "gemini-1.5-pro"
});

// Example call
async function run() {
  const response = await agent.generateText("What is the capital of France?");
  console.log(response.text);
}

run();
```

## Supported Methods

- **`generateText`**: ✅ Supported
- **`streamText`**: ✅ Supported
- **`generateObject`**: ✅ Supported
- **`streamObject`**: ❌ Not supported

## Tool Calling Support

✅ **Supported.**

The provider supports tool calling:

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_current_weather",
  description: "Get the current weather in a location",
  parameters: z.object({
    location: z.string().describe("The location to get weather for"),
  }),
  execute: async (input) => {
    return {
      location: input.location,
      temperature: 72,
      condition: "sunny",
    };
  },
});

const agent = new Agent({
  name: "weather-agent",
  instructions: "A helpful weather assistant",
  llm: new GoogleAIProvider(),
  model: "gemini-1.5-flash",
  tools: [weatherTool],
});
```

## Model Selection & Options

Set the model via the `model` property during `Agent` instantiation:

```typescript
const response = await agent.generateText("Write a creative story.", {
  provider: {
    temperature: 0.9,
    maxTokens: 1024,
    // Other Google-specific parameters
  },
});
```

Refer to the [Google AI documentation](https://ai.google.dev/api/rest) for available configuration parameters.
