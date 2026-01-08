---
"@voltagent/core": patch
---

feat: enable `andAgent` tool usage by switching to `generateText` with `Output.object` while keeping structured output

Example:

```ts
import { Agent, createTool, createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const getWeather = createTool({
  name: "get_weather",
  description: "Get weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, temp: 72, condition: "sunny" }),
});

const agent = new Agent({
  name: "WeatherAgent",
  model: openai("gpt-4o-mini"),
  tools: [getWeather],
});

const workflow = createWorkflowChain({
  id: "weather-flow",
  input: z.object({ city: z.string() }),
}).andAgent(({ data }) => `What is the weather in ${data.city}?`, agent, {
  schema: z.object({ temp: z.number(), condition: z.string() }),
});
```
