# andAgent

> Add AI to your workflow. Get structured, typed responses from language models.

## Quick Start

```typescript
import { createWorkflowChain, Agent } from "@voltagent/core";
import { z } from "zod";

// Create an agent
const agent = new Agent({
  name: "Assistant",
  llm: provider,
  model: "gpt-4",
});

// Use it in a workflow
const workflow = createWorkflowChain({
  id: "analyze-text",
  input: z.object({ text: z.string() }),
}).andAgent(({ data }) => `Analyze this text: ${data.text}`, agent, {
  schema: z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    summary: z.string(),
  }),
});

const result = await workflow.run({ text: "I love this!" });
// Result: { sentiment: "positive", summary: "Expression of enthusiasm" }
```

## How It Works

`andAgent` = AI prompt + structured output schema:

```typescript
.andAgent(
  prompt,    // What to ask the AI
  agent,     // Which AI to use
  { schema } // What shape the answer should be
)
```

## Function Signature

```typescript
// Simple prompt
.andAgent("Summarize this", agent, { schema })

// Dynamic prompt from data
.andAgent(({ data }) => `Analyze: ${data.text}`, agent, { schema })
```

## Common Patterns

### Text Analysis

```typescript
.andAgent(
  ({ data }) => `Analyze sentiment of: ${data.review}`,
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
  ({ data }) => `Write a ${data.tone} email about ${data.topic}`,
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
  ({ data }) => `Extract key information from: ${data.document}`,
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

## Dynamic Prompts

Build prompts from workflow data:

```typescript
.andAgent(
  ({ data }) => {
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
  .andAgent(({ data }) => `What type of email is this: ${data.email}`, agent, {
    schema: z.object({
      type: z.enum(["support", "sales", "spam"]),
      priority: z.enum(["low", "medium", "high"]),
    }),
  })
  // Step 2: Route based on classification
  .andThen({
    id: "route-email",
    execute: async ({ data }) => {
      if (data.type === "spam") {
        return { action: "delete" };
      }
      return {
        action: "forward",
        to: data.type === "support" ? "support@" : "sales@",
      };
    },
  });
```

## Best Practices

1. **Keep prompts clear** - AI performs better with specific instructions
2. **Use enums for categories** - `z.enum()` ensures valid options
3. **Add descriptions to schema fields** - Helps AI understand what you want
4. **Handle edge cases** - Check for missing or low-confidence results

## Next Steps

- Learn about [andWhen](./and-when.md) for conditional logic
- Explore [andAll](./and-all.md) to run multiple agents in parallel
- See [andThen](./and-then.md) to process AI outputs
- Execute workflows via [REST API](../../api/overview.md#workflow-endpoints)
