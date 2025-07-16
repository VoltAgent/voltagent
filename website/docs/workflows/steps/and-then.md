# andThen - Function Execution

> **Execute async functions in your workflow.** Transform data, make API calls, and run custom logic.

## What is andThen?

`andThen` executes async functions and transforms data in your workflow. It's the basic building block for any custom logic.

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "data-processor",
  name: "Data Processor",
  input: z.object({ text: z.string() }),
  result: z.object({ processed: z.string(), wordCount: z.number() }),
}).andThen({
  id: "process-text",
  execute: async (data, state) => {
    return {
      processed: data.text.toUpperCase(),
      wordCount: data.text.split(" ").length,
    };
  },
});

const result = await workflow.run({ text: "hello world" });
// { processed: "HELLO WORLD", wordCount: 2 }
```

## Function Signature

```typescript
.andThen({
  execute: async (data, state) => {
    // data: Current workflow data (type-safe)
    // state: { userId?, conversationId?, userContext? }
    return newData;
  }
})
```

### Data Flow

Each step receives output from the previous step:

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "data-flow-example",
  name: "Data Flow Example",
  input: z.object({ userId: z.string() }),
  result: z.object({ user: any, posts: any[] })
})
.andThen({
  id: "fetch-user",
  // Step 1: Fetch user
  execute: async (data) => {
    const user = await fetchUser(data.userId);
    return { user };
  }
})
.andThen({
  id: "fetch-posts",
  // Step 2: Fetch user's posts (receives { user } from step 1)
  execute: async (data) => {
    const posts = await fetchPosts(data.user.id);
    return { ...data, posts };
  }
});
```

## Using State for User Context

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const personalizedWorkflow = createWorkflowChain({
  id: "personalized-workflow",
  name: "Personalized Workflow",
  input: z.object({ message: z.string() }),
  result: z.object({ response: z.string() }),
}).andThen({
  id: "personalize-response",
  execute: async (data, state) => {
    // Access user information
    const userRole = state.userContext?.get("role") || "guest";
    const language = state.userContext?.get("language") || "en";

    // Customize based on user
    let response = data.message;
    if (userRole === "admin") {
      response = `[ADMIN] ${response}`;
    }

    return { response };
  },
});

// Run with user context
const result = await personalizedWorkflow.run(
  { message: "Hello" },
  {
    userId: "user-123",
    conversationId: "conv-456",
    userContext: new Map([
      ["role", "admin"],
      ["language", "en"],
    ]),
  }
);
```

## Common Patterns

### API Calls

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "api-call-workflow",
  name: "API Call Workflow",
  input: z.object({ userId: z.string() }),
  result: z.object({ user: any }),
}).andThen({
  id: "fetch-user-api",
  execute: async (data) => {
    const response = await fetch(`/api/users/${data.userId}`);
    const user = await response.json();
    return { ...data, user };
  },
});
```

### Data Transformation

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "data-transformation-workflow",
  name: "Data Transformation Workflow",
  input: z.object({ email: z.string() }),
  result: z.object({ processedAt: z.string(), isValid: z.boolean() }),
}).andThen({
  id: "transform-data",
  execute: async (data) => {
    return {
      ...data,
      processedAt: new Date().toISOString(),
      isValid: data.email.includes("@"),
    };
  },
});
```

### Error Handling

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "error-handling-workflow",
  name: "Error Handling Workflow",
  input: z.object({}),
  result: z.object({ result: any }),
}).andThen({
  id: "risky-operation",
  execute: async (data) => {
    try {
      const result = await riskyOperation(data);
      return { ...data, result };
    } catch (error) {
      console.warn("Operation failed:", error);
      return { ...data, result: null };
    }
  },
});
```

## Next Steps

- **[andAgent](./and-agent.md)** - Add AI to your workflows
- **[andWhen](./and-when.md)** - Add conditional logic
- **[andAll](./and-all.md)** - Run steps in parallel

---

> **Quick Summary**: `andThen` runs async functions, transforms data, and passes results to the next step. Use `state` for user context and personalization.
