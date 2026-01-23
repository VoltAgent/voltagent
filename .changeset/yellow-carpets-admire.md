---
"@voltagent/core": patch
---

feat: add tool routing for agents with router tools, pool/expose controls, and embedding routing.

Embedding model strings also accept provider-qualified IDs like `openai/text-embedding-3-small` using the same model registry as agent model strings.

Basic embedding router:

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const getWeather = createTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => ({ location, temperatureC: 22 }),
});

const agent = new Agent({
  name: "Tool Routing Agent",
  instructions: "Use tool_router for tools. Pass the user request as the query.",
  model: "openai/gpt-4o-mini",
  tools: [getWeather],
  toolRouting: {
    embedding: openai.embedding("text-embedding-3-small"),
    topK: 2,
  },
});
```

Pool and expose:

```ts
const agent = new Agent({
  name: "Support Agent",
  instructions: "Use tool_router for tools.",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    embedding: "text-embedding-3-small",
    pool: [getWeather],
    expose: [getStatus],
  },
});
```

Custom router strategy + resolver mode:

```ts
import { createToolRouter, type ToolArgumentResolver } from "@voltagent/core";

const resolver: ToolArgumentResolver = async ({ query, tool }) => {
  if (tool.name === "get_weather") return { location: query };
  return {};
};

const router = createToolRouter({
  name: "tool_router",
  description: "Route requests with a resolver",
  embedding: "text-embedding-3-small",
  mode: "resolver",
  resolver,
});
```
