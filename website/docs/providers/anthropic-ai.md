---
title: Anthropic AI (Claude)
slug: /providers/anthropic-ai
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::warning Deprecated Package
**This provider is deprecated.** We recommend using the [Vercel AI SDK's Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) instead with `@voltagent/vercel-ai`.

**Migration Guide:**

```typescript
// Old (deprecated)
import { AnthropicProvider } from "@voltagent/anthropic-ai";
const provider = new AnthropicProvider({ apiKey: "..." });

// New (recommended)
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";
const provider = new VercelAIProvider();
// Use with: model: anthropic("claude-opus-4-1")
```

For the latest models and features, please see our [Providers & Models guide](/docs/getting-started/providers-models).
:::

# Anthropic AI Provider (`@voltagent/anthropic-ai`)

The Anthropic AI Provider integrates VoltAgent with Anthropic's Claude models. It wraps the official [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) SDK.

**Key Characteristics:**

- **Claude Models:** Supports all Claude models through the Anthropic API.
- **Model Agnostic:** Accepts standard Claude model identifier strings (e.g., `'claude-opus-4-1'`, `'claude-3-opus-20240229'`).
- **Core Functionality:** Focuses on text generation, streaming, and structured object generation using the underlying Anthropic SDK.

## Installation

<Tabs>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @voltagent/core @voltagent/anthropic-ai zod
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @voltagent/core @voltagent/anthropic-ai zod
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm add @voltagent/core @voltagent/anthropic-ai zod
    ```
  </TabItem>
</Tabs>

_Note: `@anthropic-ai/sdk` is a peer dependency. `zod` is required if using `generateObject`._

## Configuration

The `AnthropicProvider` requires an API key, which can be provided directly or through an environment variable.

```typescript
import { AnthropicProvider } from "@voltagent/anthropic-ai";

// Option 1: Direct API Key
const anthropicProvider = new AnthropicProvider({
  apiKey: "YOUR_ANTHROPIC_API_KEY",
});

// Option 2: Environment Variable (ANTHROPIC_API_KEY)
// Ensure process.env.ANTHROPIC_API_KEY is set
const anthropicProvider = new AnthropicProvider({});
```

## Usage

Instantiate your `Agent` with the configured `AnthropicProvider`:

```typescript
import { Agent } from "@voltagent/core";
import { AnthropicProvider } from "@voltagent/anthropic-ai";

const anthropicProvider = new AnthropicProvider({ apiKey: "YOUR_ANTHROPIC_API_KEY" });

const agent = new Agent({
  name: "Claude Agent",
  instructions: "An agent powered by Claude",
  llm: anthropicProvider,
  model: "claude-opus-4-1", // Specify the desired Claude model
});

// Example call
async function run() {
  const response = await agent.generateText("What is the capital of France?");
  console.log(response.text);
}

run();
```

## Supported Methods

- **`generateText`**: ✅ Supported. Calls Anthropic SDK's `messages.create`.
- **`streamText`**: ✅ Supported. Calls Anthropic SDK's `messages.create` with `stream: true`.
- **`generateObject`**: ✅ Supported. Uses Anthropic's structured output capabilities with Zod schema validation.
- **`streamObject`**: ✅ Supported. Streams structured objects with schema validation.

## Tool Calling Support

✅ **Supported.**

The `@voltagent/anthropic-ai` provider supports tool calling through the MCP (Model Control Protocol) format:

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
  llm: new AnthropicProvider(),
  model: "claude-opus-4-1",
  tools: [weatherTool],
});
```

## Model Selection & Options

The specific Claude model (e.g., `'claude-opus-4-1'`, `'claude-3-opus-20240229'`) is set via the `model` property during `Agent` instantiation.

You can override or provide additional Anthropic-specific generation parameters (like `temperature`, `max_tokens`, `top_p`, `stop_sequences`, etc.) per-request using the `provider` key within the options object of `generateText`, `streamText`, or `generateObject`.

```typescript
// Example: Overriding temperature for a specific call
const response = await agent.generateText("Write a creative story.", {
  provider: {
    temperature: 0.9,
    max_tokens: 1024,
    // Any other valid Anthropic parameters
  },
});
```

Refer to the [Anthropic API documentation](https://docs.anthropic.com/claude/reference/messages_post) for the full list of available configuration parameters.
