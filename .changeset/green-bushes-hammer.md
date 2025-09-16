---
"@voltagent/core": patch
---

feat: add experimental_output support for structured generation - #428

## What Changed for You

VoltAgent now supports ai-sdk v5's experimental structured output features! You can now generate type-safe structured data directly from your agents using Zod schemas.

## Features Added

- **`experimental_output`** for `generateText` - Get fully typed structured output
- **`experimental_partialOutputStream`** for `streamText` - Stream partial objects as they're being generated

## Using Structured Output with `generateText`

```typescript
import { Agent } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

// Define your schema
const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  prepTime: z.number(),
  cookTime: z.number(),
});

// Generate structured output
const result = await agent.generateText("Create a pasta recipe", {
  experimental_output: Output.object({
    schema: RecipeSchema,
  }),
});

// Access the typed object directly!
console.log(result.experimental_output);
// {
//   name: "Creamy Garlic Pasta",
//   ingredients: ["pasta", "garlic", "cream", ...],
//   instructions: ["Boil water", "Cook pasta", ...],
//   prepTime: 10,
//   cookTime: 15
// }
```

## Streaming Partial Objects with `streamText`

```typescript
// Stream partial objects as they're generated
const stream = await agent.streamText("Create a detailed recipe", {
  experimental_output: Output.object({
    schema: RecipeSchema,
  }),
});

// Access the partial object stream
for await (const partial of stream.experimental_partialOutputStream ?? []) {
  console.log(partial);
  // Partial objects that build up over time:
  // { name: "Creamy..." }
  // { name: "Creamy Garlic Pasta", ingredients: ["pasta"] }
  // { name: "Creamy Garlic Pasta", ingredients: ["pasta", "garlic"] }
  // ... until the full object is complete
}
```

## Text Mode for Constrained Output

You can also use `Output.text()` for text generation with specific constraints:

```typescript
const result = await agent.generateText("Write a haiku", {
  experimental_output: Output.text({
    maxLength: 100,
    description: "A traditional haiku poem",
  }),
});

console.log(result.experimental_output); // The generated haiku text
```

## Important Notes

- These are **experimental features** from ai-sdk v5 and may change
- TypeScript may show `experimental_output` as `any` due to type inference limitations
- `generateText` returns the complete structured output in `experimental_output`
- `streamText` provides partial objects via `experimental_partialOutputStream`
- Both features require importing `Output` from `@voltagent/core` (re-exported from ai-sdk)

## Why This Matters

- **Type-safe output** - No more parsing JSON strings and hoping for the best
- **Real-time streaming** - See structured data build up as it's generated
- **Zod validation** - Automatic validation against your schemas
- **Better DX** - Work with typed objects instead of unstructured text
