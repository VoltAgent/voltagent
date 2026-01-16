---
title: Model Router & Registry
slug: /getting-started/model-router
---

# Model Router & Registry

VoltAgent can resolve models from strings like `openai/gpt-4o-mini` without requiring you to import provider packages. This is powered by a bundled provider registry and a small model router in `@voltagent/core`.

For the full provider directory and model lists, see [Models](/models-docs/).

## Model String Format

Use the `provider/model` format:

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "router-demo",
  instructions: "Be concise.",
  model: "anthropic/claude-3-5-sonnet",
});
```

More examples:

```ts
const openaiAgent = new Agent({
  name: "openai-agent",
  instructions: "Summarize the text",
  model: "openai/gpt-4o-mini",
});

const geminiAgent = new Agent({
  name: "gemini-agent",
  instructions: "Respond in Turkish",
  model: "google/gemini-2.0-flash",
});
```

You can also generate strings dynamically:

```ts
const agent = new Agent({
  name: "dynamic-router",
  model: ({ context }) => {
    const provider = (context.get("provider") as string) || "openai";
    const model = (context.get("model") as string) || "gpt-4o-mini";
    return `${provider}/${model}`;
  },
});
```

## Registry Snapshot

VoltAgent ships with a registry snapshot generated from [models.dev](https://models.dev). The snapshot maps provider IDs to the correct ai-sdk provider packages and the environment variables they require.

In TypeScript, you can reference the `ModelRouterModelId` type for autocomplete and validation:

```ts
import type { ModelRouterModelId } from "@voltagent/core";

const modelId: ModelRouterModelId = "openai/gpt-4o-mini";
```

## Auto-refresh (Optional)

By default, VoltAgent uses the bundled snapshot. In non-production (`NODE_ENV` not equal to `production`), VoltAgent refreshes the in-memory registry from models.dev every 30 minutes to pick up newly added providers.

Auto-refresh updates the in-memory registry and also writes the refreshed registry and type definitions to a local cache (and to `node_modules/@voltagent/core/dist/registries` when writable).

## Environment Variables

The router reads provider API keys from the environment variables listed in the registry snapshot. If a key is missing, VoltAgent throws a clear error listing the required variable names.

OpenAI-compatible providers may also require a base URL. You can override it with:

```bash
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## When to Use ai-sdk Providers Directly

Use model strings for quick setup and dynamic routing. If you need provider-specific configuration or advanced options, pass a `LanguageModel` from an ai-sdk provider instead:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "custom-provider",
  instructions: "You are a helpful assistant",
  model: openai("gpt-4o-mini"),
});
```

## Related Docs

- [Providers & Models](/docs/getting-started/providers-models)
- [Using Models with Agents](/docs/agents/providers)
