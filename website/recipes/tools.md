---
id: tools
title: Tools
slug: tools
description: Add custom tools to your VoltAgent agents.
---

# Tools

Tools allow agents to perform actions like searching the web, checking calendars, or calling external APIs.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, createTool, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Define a custom tool
const weatherTool = createTool({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    // Your API call here
    return { location, temperature: 22, condition: "sunny" };
  },
});

// Create agent with tools
const agent = new Agent({
  name: "Weather Assistant",
  instructions: "Help users check the weather",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Adding Tools Dynamically

```typescript
// Add tools after agent creation
agent.addTools([anotherTool]);
```

## Built-in Provider Tools

Some providers offer built-in tools:

```typescript
const agent = new Agent({
  model: openai("gpt-4o-mini"),
  tools: [
    openai.tools.webSearch(), // OpenAI web search
    myCustomTool,
  ],
});
```

## Full Example

See the complete example: [with-tools on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-tools)
