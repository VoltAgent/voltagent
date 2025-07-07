---
title: Overview
---

# Tools & Toolkits

VoltAgent allows you to extend the capabilities of your AI agents by providing them with **Tools**. Tools enable agents to interact with external APIs, perform calculations, access databases, or execute virtually any custom code. This guide covers how to define and use individual tools and the new `Toolkit` concept for managing related tools.

## Defining a Single Tool

The most basic way to define a tool is using the `createTool` helper function (or instantiating the `Tool` class directly).

A tool requires:

- `name`: A unique name for the tool (used by the LLM to call it).
- `description`: A clear description of what the tool does (used by the LLM to decide when to use it).
- `parameters`: A Zod schema defining the input arguments the tool expects.
- `execute`: An asynchronous function that contains the tool's logic, taking the validated arguments as input.

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define a simple weather tool
const getWeatherTool = createTool({
  name: "get_weather",
  description: "Fetches the current weather for a given location.",
  parameters: z.object({
    location: z.string().describe("The city and state, e.g., San Francisco, CA"),
  }),
  execute: async ({ location }) => {
    // In a real scenario, you would call a weather API here
    console.log(`Fetching weather for ${location}...`);
    if (location.toLowerCase().includes("tokyo")) {
      return { temperature: "15°C", condition: "Cloudy" };
    }
    return { temperature: "22°C", condition: "Sunny" };
  },
});

const agent = new Agent({
  name: "WeatherAgent",
  instructions: "An agent that can fetch weather information.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [getWeatherTool], // Add the tool to the agent
});

// Now the agent can use the 'get_weather' tool when asked about weather.
```

## Grouping Tools with Toolkits

Often, several tools work together logically. For instance, tools for step-by-step reasoning (`think`, `analyze`) or a set of tools interacting with the same API. For these scenarios, VoltAgent provides **Toolkits**.

A `Toolkit` allows you to:

1.  **Group related tools:** Keep your tool management organized.
2.  **Define shared instructions:** Provide common guidance to the LLM on how to use all tools within the toolkit.
3.  **Control instruction injection:** Decide if the toolkit's shared instructions should be automatically added to the agent's system prompt.

### Defining a Toolkit

A `Toolkit` is an object with the following structure:

```typescript
import { createTool, createToolkit, type Tool, type Toolkit } from "@voltagent/core";

const myCalculatorToolkit = createToolkit({
  name: "calculator_toolkit",
  description: "Tools for performing basic arithmetic operations.",
  // Optional instructions for the LLM
  instructions: `Use these tools for calculations. Always use 'add' for addition, 'subtract' for subtraction.`,
  // Set to true to add the above instructions to the system prompt
  addInstructions: true,
  tools: [
    createTool({
      /* ... definition for 'add' tool ... */
    }),
    createTool({
      /* ... definition for 'subtract' tool ... */
    }),
    // ... other calculator tools
  ],
});
```

**Important:** With the introduction of Toolkits, individual `Tool` instances no longer have their own `instructions` or `addInstructions` properties. Instructions are managed at the Toolkit level.

### Adding Tools and Toolkits to an Agent

The `tools` option in the `Agent` constructor now accepts an array containing both individual `Tool` objects and `Toolkit` objects. The `ToolManager` handles both seamlessly.

```typescript
import { Agent, createTool, createToolkit, type Toolkit } from "@voltagent/core";
// ... import other tools and toolkits ...

const agent = new Agent({
    name: "MultiToolAgent",
    instructions: "An agent with various tools and toolkits.",
    llm: /* ... */,
    model: /* ... */,
    tools: [
        getWeatherTool,      // Add an individual tool
        myCalculatorToolkit, // Add a toolkit
        // ... other tools or toolkits
    ],
});
```

### Automatic Instructions

When an agent is initialized, its `getSystemMessage` method checks all the `Toolkit`s provided in the `tools` array. If a `Toolkit` has `addInstructions: true` and defines an `instructions` string, those instructions will be automatically appended to the agent's base description, forming part of the final system prompt sent to the LLM.

## Next Steps

- See the [Reasoning Tools](/docs/tools/reasoning-tool/) documentation for a practical example of a pre-built toolkit.
- Explore creating your own tools to connect agents to your specific data sources and APIs.
