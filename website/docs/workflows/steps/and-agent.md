# AndAgent

> Add AI to your workflow. Get structured, typed responses from language models.

## Quick Start

```typescript
import { createWorkflowChain, Agent } from "@voltagent/core";
import { z } from "zod";

// Create an agent
const agent = new Agent({
  name: "Assistant",
  // Pass an ai-sdk model directly
  model: "openai/gpt-4o-mini",
  instructions: "Be concise and helpful",
});

// Use it in a workflow
const workflow = createWorkflowChain({
  id: "analyze-text",
  input: z.object({ text: z.string() }),
}).andAgent(async ({ data }) => `Analyze this text: ${data.text}`, agent, {
  schema: z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    summary: z.string(),
  }),
});

const result = await workflow.run({ text: "I love this!" });
// Result: { sentiment: "positive", summary: "Expression of enthusiasm" }
```

## How It Works

`andAgent` = AI prompt + structured output schema (Zod or `Output.*`):

```typescript
.andAgent(
  prompt,     // What to ask the AI
  agent,      // Which AI to use
  { schema }, // Zod schema or ai-sdk Output.* spec
  map?        // Optional: merge/shape output with existing data
)
```

If you pass a function for `prompt`, it must return a Promise (use `async`) and resolve to a string, `UIMessage[]`, or `ModelMessage[]`.

**Important:** `andAgent` uses `generateText`. If you pass a Zod schema, it is wrapped with `Output.object`. If you pass an `Output.*` spec, it is used directly. This means:

- ✅ You get **structured, typed responses** based on your schema
- ✅ The agent **can use tools** during this step
- ❌ **Streaming is not supported** (response returns when complete)

By default, the step result replaces the workflow data with the agent output. If you need to keep previous data, use the optional mapper (4th argument) to merge or reshape the output.

**Need streaming or custom tool handling?** Use [andThen](./and-then.md) to call the agent directly with `streamText` or `generateText`.

## Function Signature

```typescript
// Simple prompt (string)
.andAgent("Summarize this", agent, { schema })

// Dynamic prompt from data (async)
.andAgent(async ({ data }) => `Analyze: ${data.text}`, agent, { schema })

// Advanced: pass ai-sdk v5 ModelMessage[] (multimodal)
.andAgent(
  async ({ data }) => [
    { role: 'user', content: [{ type: 'text', text: `Hello ${data.name}` }] },
  ],
  agent,
  { schema }
)

// Advanced: pass UIMessage[]
.andAgent(
  async ({ data }) => [
    { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: data.prompt }] },
  ],
  agent,
  { schema }
)

// Merge agent output with existing data
.andAgent(
  async ({ data }) => `Classify: ${data.email}`,
  agent,
  { schema: z.object({ type: z.enum(["support", "sales", "spam"]) }) },
  (output, { data }) => ({ ...data, emailType: output })
)

// Use Output.* for non-object outputs (arrays, choices, json, text)
// (Requires: import { Output } from "ai";)
.andAgent(
  async ({ data }) => `List tags for: ${data.topic}`,
  agent,
  { schema: Output.array({ element: z.string() }) }
)
```

## Middleware and Retries

`andAgent` passes the config object to `agent.generateText`, so you can use
`inputMiddlewares`, `outputMiddlewares`, `maxMiddlewareRetries`, and `maxRetries`
per step.

```ts
import { Agent, createInputMiddleware, createOutputMiddleware } from "@voltagent/core";
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const redactInput = createInputMiddleware({
  name: "RedactPII",
  handler: ({ input }) => {
    if (typeof input !== "string") return input;
    return input.replace(/\b\d{16}\b/g, "[redacted]");
  },
});

const requireSource = createOutputMiddleware<string>({
  name: "RequireSource",
  handler: ({ output, abort }) => {
    if (!output.includes("source:")) {
      abort("Missing source in summary", { retry: true });
    }
    return output;
  },
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  instructions: "Summarize documents with sources.",
});

createWorkflowChain({
  id: "doc-summary",
  input: z.object({ text: z.string() }),
}).andAgent(async ({ data }) => `Summarize and include source lines: ${data.text}`, agent, {
  schema: z.object({
    summary: z.string(),
    sources: z.array(z.string()),
  }),
  inputMiddlewares: [redactInput],
  outputMiddlewares: [requireSource],
  maxMiddlewareRetries: 1,
  maxRetries: 2,
});
```

Retry behavior:

- `maxRetries` controls LLM retries for the selected model (total attempts = `maxRetries + 1`).
- `maxMiddlewareRetries` controls retries triggered by `abort(..., { retry: true })`.
- A middleware retry restarts the step: middlewares, guardrails, hooks, model selection, and fallback.
- Output middleware runs on the model text and can trigger retries. It does not change the parsed
  object returned by `andAgent`.

## Common Patterns

### Text Analysis

```typescript
.andAgent(
  async ({ data }) => `Analyze sentiment of: ${data.review}`,
  agent,
  {
    schema: z.object({
      sentiment: z.enum(["positive", "negative", "neutral"]),
      score: z.number().min(0).max(1),
      keywords: z.array(z.string())
    })
  }
)
```

### Content Generation

```typescript
.andAgent(
  async ({ data }) => `Write a ${data.tone} email about ${data.topic}`,
  agent,
  {
    schema: z.object({
      subject: z.string(),
      body: z.string(),
      suggestedSendTime: z.string()
    })
  }
)
```

### Data Extraction

```typescript
.andAgent(
  async ({ data }) => `Extract key information from: ${data.document}`,
  agent,
  {
    schema: z.object({
      people: z.array(z.string()),
      dates: z.array(z.string()),
      locations: z.array(z.string()),
      mainTopic: z.string()
    })
  }
)
```

### Arrays and Choices

Requires `import { Output } from "ai";`

```typescript
.andAgent(
  async ({ data }) => `Give 3 tags for: ${data.topic}`,
  agent,
  { schema: Output.array({ element: z.string() }) }
)

.andAgent(
  async ({ data }) => `Pick a category for: ${data.title}`,
  agent,
  { schema: Output.choice({ options: ["news", "blog", "doc"] }) }
)
```

### Merge Output With Existing Data

```typescript
.andAgent(
  async ({ data }) => `What type of email is this: ${data.email}`,
  agent,
  {
    schema: z.object({
      type: z.enum(["support", "sales", "spam"]),
      priority: z.enum(["low", "medium", "high"]),
    }),
  },
  (output, { data }) => ({ ...data, emailType: output })
)
```

## Dynamic Prompts

Build prompts from workflow data:

```typescript
.andAgent(
  async ({ data }) => {
    // Adjust prompt based on data
    if (data.userLevel === "beginner") {
      return `Explain in simple terms: ${data.question}`;
    }
    return `Provide technical details about: ${data.question}`;
  },
  agent,
  { schema: z.object({ answer: z.string() }) }
)
```

## Chaining with Other Steps

Combine AI with logic:

```typescript
createWorkflowChain({ id: "smart-email" })
  // Step 1: Classify with AI
  .andAgent(
    async ({ data }) => `What type of email is this: ${data.email}`,
    agent,
    {
      schema: z.object({
        type: z.enum(["support", "sales", "spam"]),
        priority: z.enum(["low", "medium", "high"]),
      }),
    },
    (output, { data }) => ({ ...data, emailType: output })
  )
  // Step 2: Route based on classification
  .andThen({
    id: "route-email",
    execute: async ({ data }) => {
      if (data.emailType.type === "spam") {
        return { action: "delete" };
      }
      return {
        action: "forward",
        to: data.emailType.type === "support" ? "support@" : "sales@",
      };
    },
  });
```

## Streaming or Custom Tool Handling

`andAgent` supports tools, but it only returns the structured output when the step completes. Use `andThen` when you need streaming tokens or to inspect tool calls/results directly:

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const getWeatherTool = createTool({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    return { temp: 72, condition: "sunny" };
  },
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  tools: [getWeatherTool],
});

// Use andThen to call the agent directly when you need streaming or tool call inspection
createWorkflowChain({ id: "weather-flow" }).andThen({
  id: "get-weather",
  execute: async ({ data }) => {
    // Call streamText/generateText directly for streaming or tool call handling
    const result = await agent.generateText(`What's the weather in ${data.city}?`);
    return { response: result.text };
  },
});
```

## Best Practices

1. **Keep prompts clear** - AI performs better with specific instructions
2. **Use enums for categories** - `z.enum()` ensures valid options
3. **Add descriptions to schema fields** - Helps AI understand what you want
4. **Handle edge cases** - Check for missing or low-confidence results
5. **Need streaming or tool inspection?** - Use `andThen` with direct agent calls instead of `andAgent`

## Next Steps

- Learn about [andWhen](./and-when.md) for conditional logic
- Explore [andAll](./and-all.md) to run multiple agents in parallel
- See [andThen](./and-then.md) to process AI outputs
- Execute workflows via [REST API](../../api/overview.md#workflow-endpoints)
