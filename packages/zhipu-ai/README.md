# @voltagent/zhipu-ai

VoltAgent Zhipu AI provider integration using the Zhipu AI

This package allows you to use Zhipu AI's fast inferencing models within your VoltAgent agents.

## Installation

```bash
npm install @voltagent/zhipu-ai
# or
yarn add @voltagent/zhipu-ai
# or
pnpm add @voltagent/zhipu-ai
```

## Usage

You need to provide your Zhipu AI API key. You can get one from [Zhipu AI](https://www.zhipuai.cn/) after signing up.

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { ZhipuProvider } from "@voltagent/zhipu-ai";

const zhipuProvider = new ZhipuProvider({
  apiKey: process.env.ZHIPU_API_KEY ?? (() => {
    throw new Error("ZHIPU_API_KEY environment variable is not set.");
  })(),
});

// Weather tool
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe('location'),
    time: z.string().optional().describe('time')
  }),
  execute: async (args) => {
    const { location, time } = args;
    return {
      location,
      time,
      temperature: 22,
      conditions: "sunny",
    };
  },
});

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: zhipuProvider,
  model: {
    id: "glm-4-air",
    provider: "zhipu",
    modelId: "glm-4-air",
  } as any,
  tools: [weatherTool],
});

new VoltAgent({
  agents: {
    agent,
  },
});
```

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.