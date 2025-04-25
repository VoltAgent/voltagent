---
"@voltagent/core": minor
---

## Introducing Toolkits for Better Tool Management

Managing related tools and their instructions is now simpler with `Toolkit`s.

**Motivation:**

- Defining shared instructions for multiple related tools was cumbersome.
- The logic for deciding which instructions to add to the agent's system prompt could become complex.
- We wanted a cleaner way to group tools logically.

**What's New: The `Toolkit`**

A `Toolkit` bundles related tools and allows defining shared `instructions` and an `addInstructions` flag _at the toolkit level_.

```typescript
// packages/core/src/tool/toolkit.ts
export type Toolkit = {
  /**
   * Unique identifier name for the toolkit.
   */
  name: string;
  /**
   * A brief description of what the toolkit does. Optional.
   */
  description?: string;
  /**
   * Shared instructions for the LLM on how to use the tools within this toolkit.
   * Optional.
   */
  instructions?: string;
  /**
   * Whether to automatically add the toolkit's `instructions` to the agent's system prompt.
   * Defaults to false.
   */
  addInstructions?: boolean;
  /**
   * An array of Tool instances that belong to this toolkit.
   */
  tools: Tool<any>[];
};
```

**Key Changes to Core:**

1.  **`ToolManager` Upgrade:** Now manages both `Tool` and `Toolkit` objects.
2.  **`AgentOptions` Update:** The `tools` option accepts `(Tool<any> | Toolkit)[]`.
3.  **Simplified Instruction Handling:** `Agent` now only adds instructions from `Toolkit`s where `addInstructions` is true.

This change leads to a clearer separation of concerns, simplifies the agent's internal logic, and makes managing tool instructions more predictable and powerful.

### New `createToolkit` Helper

We've also added a helper function, `createToolkit`, to simplify the creation of toolkits. It provides default values and basic validation:

```typescript
// packages/core/src/tool/toolkit.ts
export const createToolkit = (options: Toolkit): Toolkit => {
  if (!options.name) {
    throw new Error("Toolkit name is required");
  }
  if (!options.tools || options.tools.length === 0) {
    console.warn(`Toolkit '${options.name}' created without any tools.`);
  }

  return {
    name: options.name,
    description: options.description || "", // Default empty description
    instructions: options.instructions,
    addInstructions: options.addInstructions || false, // Default to false
    tools: options.tools || [], // Default to empty array
  };
};
```

**Example Usage:**

```typescript
import { createTool, createToolkit } from "@voltagent/core";
import { z } from "zod";

// Define some tools first
const getWeather = createTool({
  name: "getWeather",
  description: "Gets the weather for a location.",
  schema: z.object({ location: z.string() }),
  run: async ({ location }) => ({ temperature: "25C", condition: "Sunny" }),
});

const searchWeb = createTool({
  name: "searchWeb",
  description: "Searches the web for a query.",
  schema: z.object({ query: z.string() }),
  run: async ({ query }) => ({ results: ["Result 1", "Result 2"] }),
});

// Create a toolkit using the helper
const webInfoToolkit = createToolkit({
  name: "web_information",
  description: "Tools for getting information from the web.",
  instructions: "Use these tools to find current information online.",
  addInstructions: true, // Add the instructions to the system prompt
  tools: [getWeather, searchWeb],
});

console.log(webInfoToolkit);
/*
Output:
{
  name: 'web_information',
  description: 'Tools for getting information from the web.',
  instructions: 'Use these tools to find current information online.',
  addInstructions: true,
  tools: [ [Object Tool: getWeather], [Object Tool: searchWeb] ]
}
*/
```
