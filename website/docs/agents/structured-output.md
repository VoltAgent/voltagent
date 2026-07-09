---
title: Structured Output
slug: /agents/structured-output
---

# Structured Output

Use the AI SDK `output` option with `generateText` and `streamText` when you need typed structured data. This keeps tool calling, memory, hooks, observability, retries, and all other agent features on the same text-generation path.

`generateObject` and `streamObject` are still available as compatibility wrappers, but they are deprecated in VoltAgent 2.x.

## Generate an Object

```ts
import { Agent } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

const recipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  prepTimeMinutes: z.number(),
});

const agent = new Agent({
  name: "Recipe Assistant",
  instructions: "Create practical recipes.",
  model: "openai/gpt-4o-mini",
});

const result = await agent.generateText({
  prompt: "Create a weeknight pasta recipe",
  output: Output.object({ schema: recipeSchema }),
});

console.log(result.output.name);
```

## Stream Partial Objects

```ts
const stream = await agent.streamText({
  prompt: "Create a detailed dinner plan",
  output: Output.object({ schema: recipeSchema }),
});

for await (const partial of stream.partialOutputStream ?? []) {
  console.log(partial);
}

const finalRecipe = await stream.output;
console.log(finalRecipe);
```

## Combine With Runtime Options

Keep AI SDK generation settings such as `output`, `temperature`, `providerOptions`, `stopWhen`, and `toolChoice` at the top level. Put VoltAgent runtime options under `voltagent`.

```ts
const result = await agent.generateText({
  prompt: "Create a recipe for this user",
  output: Output.object({ schema: recipeSchema }),
  temperature: 0.2,
  voltagent: {
    memory: {
      userId: "user-123",
      conversationId: "recipes-456",
    },
    context: {
      dietaryPreference: "vegetarian",
    },
  },
});
```

## Migrate From generateObject

```ts
// Before
const result = await agent.generateObject("Create a recipe", recipeSchema);
console.log(result.object);

// Preferred
const result = await agent.generateText({
  prompt: "Create a recipe",
  output: Output.object({ schema: recipeSchema }),
});
console.log(result.output);
```

For HTTP requests, use `options.output` on `/agents/:id/text`, `/agents/:id/stream`, or `/agents/:id/chat`. The legacy `/object` and `/stream-object` endpoints remain available for compatibility.
