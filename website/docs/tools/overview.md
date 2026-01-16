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
- `outputSchema` (optional): A Zod schema defining the expected output format. When provided, the tool's output will be validated against this schema.

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

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
  model: "openai/gpt-4o-mini",
  tools: [getWeatherTool], // Add the tool to the agent
});

// Now the agent can use the 'get_weather' tool when asked about weather.
```

## Accessing Operation Context in Tools

Tools can access operation metadata, user context, and control mechanisms through the second parameter:

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

// Tool that uses operation context
const contextAwareWeatherTool = createTool({
  name: "get_weather",
  description: "Fetches weather with user preferences",
  parameters: z.object({
    location: z.string().describe("The city name"),
  }),
  execute: async ({ location }, options) => {
    // Access user-defined context
    const units = options?.context?.get("preferredUnits") || "celsius";
    const userId = options?.userId;

    // Use operation-scoped logger
    options?.logger?.info(`Fetching weather for ${location} in ${units}`);

    // Check abort signal
    if (options?.abortSignal?.aborted) {
      throw new Error("Request was cancelled");
    }

    // Call weather API with user preferences
    const response = await fetch(
      `https://api.weather.com/current?city=${location}&units=${units}`,
      { signal: options?.abortSignal }
    );

    return await response.json();
  },
});

// Use the tool with context
const context = new Map();
context.set("preferredUnits", "fahrenheit");

const agent = new Agent({
  name: "WeatherAgent",
  instructions: "An agent that respects user preferences",
  model: "openai/gpt-4o-mini",
  tools: [contextAwareWeatherTool],
});

const response = await agent.generateText("What's the weather in Paris?", {
  userId: "user123",
  context,
});
```

The `options` parameter includes:

- **Operation metadata**: `operationId`, `userId`, `conversationId`
- **User context**: `context` (Map for custom data)
- **Control mechanisms**: `abortController`, `abortSignal`
- **Logging**: `logger` (operation-scoped logger)
- **AI SDK data**: `toolCallId`, `messages`

For more details, see the [Tools documentation](/docs/agents/tools#accessing-operation-context).

## Tool Output Schema Validation

VoltAgent supports optional output schema validation for tools. This feature ensures that tool outputs conform to a predefined structure, providing several benefits:

- **Type Safety**: Tool outputs are typed based on the schema
- **Runtime Validation**: Invalid outputs are caught immediately
- **Error Recovery**: When validation fails, the LLM receives an error message and can retry with corrected output
- **Consistency**: All tool responses follow the same structure
- **Documentation**: Output schemas serve as API contracts

### Example with Output Schema

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

// Define the output schema
const weatherOutputSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  condition: z.enum(["sunny", "cloudy", "rainy", "snowy"]),
  humidity: z.number().min(0).max(100),
  forecast: z.object({
    high: z.number(),
    low: z.number(),
    description: z.string(),
  }),
});

// Create a tool with output validation
const weatherTool = createTool({
  name: "get_weather",
  description: "Get current weather with forecast",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  outputSchema: weatherOutputSchema, // Optional output schema
  execute: async ({ location }) => {
    // This output will be validated against weatherOutputSchema
    return {
      location,
      temperature: 22,
      condition: "sunny",
      humidity: 65,
      forecast: {
        high: 25,
        low: 18,
        description: "Clear skies throughout the day",
      },
    };
  },
});
```

### How Output Validation Works

1. When a tool is executed, its output is validated against the `outputSchema` if provided
2. If validation succeeds, the validated output is returned
3. If validation fails, an error object is returned to the LLM:
   ```json
   {
     "error": true,
     "message": "Output validation failed: Expected number, received string",
     "validationErrors": [...],
     "actualOutput": {...}
   }
   ```
4. The LLM can see the validation error and potentially fix the issue by calling the tool again

### Best Practices

- Use output schemas for tools that need consistent response formats
- Keep schemas focused and avoid overly complex nested structures
- Use descriptive error messages in your schemas with `.describe()`
- Consider making some fields optional with `.optional()` for flexibility
- Output schemas are completely optional - tools without them work as before

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
import { openai } from "@ai-sdk/openai";
import { Agent, createTool, createToolkit, type Toolkit } from "@voltagent/core";
// ... import other tools and toolkits ...

const agent = new Agent({
  name: "MultiToolAgent",
  instructions: "An agent with various tools and toolkits.",
  model: "openai/gpt-4o-mini",
  tools: [
    getWeatherTool, // Add an individual tool
    myCalculatorToolkit, // Add a toolkit
    openai.tools.webSearch(), // Add a provider-defined tool
    // ... other tools or toolkits
  ],
});
```

### Automatic Instructions

When an agent is initialized, its `getSystemMessage` method checks all the `Toolkit`s provided in the `tools` array. If a `Toolkit` has `addInstructions: true` and defines an `instructions` string, those instructions will be automatically appended to the agent's base description, forming part of the final system prompt sent to the LLM.

## Provider-defined Tools

Some providers expose their own tools (via the Vercel AI SDK).

- They can be standalone tools or live inside Toolkits and are subject to name-conflict checks when adding toolkits.
- They are not executable on your server via the usual `Tool.execute` handler — the provider manages them.

## Next Steps

- See the [Reasoning Tools](/docs/tools/reasoning-tool/) documentation for a practical example of a pre-built toolkit.
- Explore creating your own tools to connect agents to your specific data sources and APIs.
