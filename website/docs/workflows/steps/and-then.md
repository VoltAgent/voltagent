# andThen - Function Execution

> **Execute async functions in your workflow.** Transform data, make API calls, and run custom logic.

## What is andThen?

`andThen` executes async functions and transforms data in your workflow. It's the basic building block for any custom logic.

```typescript
const workflow = createWorkflowChain({
  id: "data-processor",
  input: z.object({ text: z.string() }),
  result: z.object({ processed: z.string(), wordCount: z.number() }),
}).andThen({
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
const workflow = createWorkflowChain({
  input: z.object({ userId: z.string() }),
  result: z.object({ user: any, posts: any[] })
})
.andThen({
  // Step 1: Fetch user
  execute: async (data) => {
    const user = await fetchUser(data.userId);
    return { user };
  }
})
.andThen({
  // Step 2: Fetch user's posts (receives { user } from step 1)
  execute: async (data) => {
    const posts = await fetchPosts(data.user.id);
    return { ...data, posts };
  }
});
```

## Using State for User Context

```typescript
const personalizedWorkflow = createWorkflowChain({
  input: z.object({ message: z.string() }),
  result: z.object({ response: z.string() }),
}).andThen({
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
.andThen({
  execute: async (data) => {
    const response = await fetch(`/api/users/${data.userId}`);
    const user = await response.json();
    return { ...data, user };
  }
})
```

### Data Transformation

```typescript
.andThen({
  execute: async (data) => {
    return {
      ...data,
      processedAt: new Date().toISOString(),
      isValid: data.email.includes('@')
    };
  }
})
```

### Error Handling

```typescript
.andThen({
  execute: async (data) => {
    try {
      const result = await riskyOperation(data);
      return { ...data, result };
    } catch (error) {
      console.warn("Operation failed:", error);
      return { ...data, result: null };
    }
  }
})
```

## Next Steps

- **[andAgent](./and-agent.md)** - Add AI to your workflows
- **[andWhen](./and-when.md)** - Add conditional logic
- **[andAll](./and-all.md)** - Run steps in parallel

---

> **Quick Summary**: `andThen` runs async functions, transforms data, and passes results to the next step. Use `state` for user context and personalization.
