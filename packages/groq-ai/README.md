# @voltagent/groq-ai

> ⚠️ **DEPRECATED**: This package is deprecated. Please use the [Vercel AI SDK's Groq provider](https://ai-sdk.dev/providers/ai-sdk-providers/groq) with `@voltagent/vercel-ai` instead.
>
> **Migration Guide:**
>
> ```typescript
> // Old (deprecated)
> import { GroqProvider } from "@voltagent/groq-ai";
> const provider = new GroqProvider({ apiKey: "..." });
>
> // New (recommended)
> import { VercelAIProvider } from "@voltagent/vercel-ai";
> import { groq } from "@ai-sdk/groq";
> const provider = new VercelAIProvider();
> // Use with: model: groq("llama-3.3-70b-versatile")
> ```

VoltAgent Groq AI provider integration using the Groq SDK (`@groq-sdk`).

This package allows you to use Groq's fast inferencing models within your VoltAgent agents.

## Installation

```bash
npm install @voltagent/groq-ai
# or
yarn add @voltagent/groq-ai
# or
pnpm add @voltagent/groq-ai
```

## Usage

You need to provide your Groq API key. You can get one from [Groq](https://groq.com/) after signing up.

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";

const agent = new Agent({
  name: "finance",
  instructions: "A helpful assistant that answers questions without using tools",
  llm: new GroqProvider(),
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
});

new VoltAgent({
  agents: {
    agent,
  },
});
```

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.
