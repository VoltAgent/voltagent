# andAgent - AI Agent Execution

> **Run AI agents in your workflow.** Generate structured responses, analyze data, and add intelligence to your processes.

## What is andAgent?

`andAgent` executes AI agents with structured output in your workflow. Give it a prompt and schema, get back typed AI responses.

```typescript
const workflow = createWorkflowChain({
  id: "content-generator",
  input: z.object({ topic: z.string() }),
  result: z.object({ title: z.string(), content: z.string() }),
}).andAgent((data) => `Write a blog post about: ${data.topic}`, agent, {
  schema: z.object({
    title: z.string(),
    content: z.string(),
  }),
});

const result = await workflow.run({ topic: "AI workflows" });
// { title: "Understanding AI Workflows", content: "AI workflows are..." }
```

## Function Signature

```typescript
.andAgent(
  prompt,           // string or function that returns string
  agent,           // your AI agent instance
  { schema }       // zod schema for structured output
)
```

### Under the Hood

`andAgent` calls `agent.generateObject()` with your prompt and schema:

```typescript
// This workflow step:
.andAgent(
  (data) => `Analyze: ${data.text}`,
  agent,
  { schema: z.object({ result: z.string() }) }
)

// Is equivalent to:
.andThen({
  execute: async (data, state) => {
    const { object } = await agent.generateObject(
      `Analyze: ${data.text}`,
      z.object({ result: z.string() })
    );
    return object; // Returns { result: "..." }
  }
})
```

### Dynamic Prompts

Create prompts based on workflow data:

```typescript
const workflow = createWorkflowChain({
  input: z.object({
    userName: z.string(),
    userLevel: z.string(),
    question: z.string(),
  }),
  result: z.object({
    answer: z.string(),
    confidence: z.number(),
  }),
}).andAgent(
  (data) => {
    // Build prompt from workflow data
    const levelContext =
      data.userLevel === "beginner"
        ? "Explain in simple terms."
        : "Provide detailed technical information.";

    return `Hello ${data.userName}! ${levelContext} 
            Question: ${data.question}`;
  },
  agent,
  {
    schema: z.object({
      answer: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  }
);
```

## Using State for Context

```typescript
const personalizedAgent = createWorkflowChain({
  input: z.object({ request: z.string() }),
  result: z.object({ response: z.string() }),
}).andAgent(
  (data, state) => {
    // Use user context in prompts
    const userRole = state.userContext?.get("role") || "user";
    const department = state.userContext?.get("department") || "general";

    return `You are helping a ${userRole} from ${department} department.
            Request: ${data.request}
            
            Tailor your response to their role and department.`;
  },
  agent,
  {
    schema: z.object({
      response: z.string(),
    }),
  }
);

// Run with user context
const result = await personalizedAgent.run(
  { request: "How do I optimize performance?" },
  {
    userId: "user-123",
    userContext: new Map([
      ["role", "developer"],
      ["department", "engineering"],
    ]),
  }
);
```

## Common Patterns

### Data Analysis

```typescript
.andAgent(
  (data) => `Analyze this sales data and provide insights: ${JSON.stringify(data.salesData)}`,
  agent,
  {
    schema: z.object({
      insights: z.array(z.string()),
      recommendations: z.array(z.string()),
      trend: z.enum(['up', 'down', 'stable'])
    })
  }
)
```

### Content Generation

```typescript
.andAgent(
  (data) => `Create marketing copy for product: ${data.productName}`,
  agent,
  {
    schema: z.object({
      headline: z.string(),
      description: z.string(),
      callToAction: z.string()
    })
  }
)
```

### Data Extraction

```typescript
.andAgent(
  (data) => `Extract key information from this text: ${data.rawText}`,
  agent,
  {
    schema: z.object({
      entities: z.array(z.object({
        name: z.string(),
        type: z.enum(['person', 'organization', 'location']),
        confidence: z.number()
      })),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      summary: z.string()
    })
  }
)
```

### Decision Making

```typescript
.andAgent(
  (data) => `Should we approve this loan application?
             Credit Score: ${data.creditScore}
             Income: ${data.income}
             Debt: ${data.debt}`,
  agent,
  {
    schema: z.object({
      decision: z.enum(['approve', 'reject', 'review']),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1)
    })
  }
)
```

## Chaining with Other Steps

AI agents work great with other workflow steps:

```typescript
const smartProcessor = createWorkflowChain({
  input: z.object({ email: z.string() }),
  result: z.object({
    classification: z.string(),
    response: z.string(),
    priority: z.string(),
  }),
})
  .andAgent(
    // Step 1: Classify email
    (data) => `Classify this email: ${data.email}`,
    agent,
    {
      schema: z.object({
        category: z.enum(["support", "sales", "billing"]),
        priority: z.enum(["low", "medium", "high"]),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
    }
  )
  .andThen({
    // Step 2: Process classification
    execute: async (data) => {
      return {
        classification: `${data.category} (${data.priority} priority)`,
        priority: data.priority,
      };
    },
  })
  .andAgent(
    // Step 3: Generate response based on classification
    (data) => `Generate a ${data.priority} priority response for a ${data.category} email.`,
    agent,
    {
      schema: z.object({
        response: z.string(),
      }),
    }
  )
  .andThen({
    // Step 4: Final formatting
    execute: async (data) => {
      return {
        classification: data.classification,
        response: data.response,
        priority: data.priority,
      };
    },
  });
```

## Error Handling

```typescript
.andAgent(
  (data) => `Analyze: ${data.input}`,
  agent,
  {
    schema: z.object({
      result: z.string(),
      confidence: z.number().optional()
    })
  }
)
.andThen({
  execute: async (data) => {
    // Handle low confidence results
    if (data.confidence && data.confidence < 0.7) {
      console.warn(`Low confidence result: ${data.confidence}`);
      return { ...data, needsReview: true };
    }
    return data;
  }
})
```

## Next Steps

- **[andWhen](./and-when.md)** - Add conditional logic after AI responses
- **[andAll](./and-all.md)** - Run multiple AI agents in parallel
- **[andThen](./and-then.md)** - Process AI outputs with functions

---

> **Quick Summary**: `andAgent` runs AI agents with structured output. Give it a prompt (string or function), an agent, and a zod schema. Get back typed AI responses that flow to the next step.
