---
"@voltagent/core": patch
---

feat: add providerOptions support to tools for provider-specific features - #759

Tools can now accept `providerOptions` to enable provider-specific features like Anthropic's cache control. This aligns VoltAgent tools with the AI SDK's tool API.

## The Problem

Users wanted to use provider-specific features like Anthropic's prompt caching to reduce costs and latency, but VoltAgent's `createTool()` didn't support the `providerOptions` field that AI SDK tools have.

## The Solution

**What Changed:**

- Added `providerOptions?: ProviderOptions` field to `ToolOptions` type
- VoltAgent tools now accept and pass through provider options to the AI SDK
- Supports all provider-specific features: cache control, reasoning settings, etc.

**What Gets Enabled:**

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const cityAttractionsTool = createTool({
  name: "get_city_attractions",
  description: "Get tourist attractions for a city",
  parameters: z.object({
    city: z.string().describe("The city name"),
  }),
  providerOptions: {
    anthropic: {
      cacheControl: { type: "ephemeral" },
    },
  },
  execute: async ({ city }) => {
    return await fetchAttractions(city);
  },
});
```

## Impact

- **Cost Optimization:** Anthropic cache control reduces API costs for repeated tool calls
- **Future-Proof:** Any new provider features work automatically
- **Type-Safe:** Uses official AI SDK `ProviderOptions` type
- **Zero Breaking Changes:** Optional field, fully backward compatible

## Usage

Use with any provider that supports provider-specific options:

```typescript
const agent = new Agent({
  name: "Travel Assistant",
  model: anthropic("claude-3-5-sonnet"),
  tools: [cityAttractionsTool], // Tool with cacheControl enabled
});

await agent.generateText("What are the top attractions in Paris?");
// Tool definition cached by Anthropic for improved performance
```

Learn more: [Anthropic Cache Control](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic#cache-control)
