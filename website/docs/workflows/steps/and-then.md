# andThen

> Execute any TypeScript function in your workflow. The most basic and flexible step type.

## Quick Start

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "process-data",
  input: z.object({ text: z.string() }),
}).andThen({
  id: "uppercase",
  execute: async ({ data }) => {
    return {
      text: data.text.toUpperCase(),
      length: data.text.length,
    };
  },
});

const result = await workflow.run({ text: "hello" });
// Result: { text: "HELLO", length: 5 }
```

## How It Works

`andThen` runs your async function and passes the result to the next step:

```typescript
.andThen({
  id: "step-name",
  execute: async ({ data }) => {
    // Your code here
    return newData;
  }
})
```

### Available Parameters

```typescript
execute: async ({ data, suspend, resumeData }) => {
  // data: All accumulated data from previous steps
  // suspend: Function to pause workflow
  // resumeData: Data provided when resuming
};
```

## Data Flow Example

Each step builds on the previous:

```typescript
createWorkflowChain({
  id: "user-flow",
  input: z.object({ userId: z.string() }),
})
  .andThen({
    id: "get-user",
    execute: async ({ data }) => {
      const user = await getUser(data.userId);
      return { user }; // Next step gets: { userId, user }
    },
  })
  .andThen({
    id: "get-posts",
    execute: async ({ data }) => {
      const posts = await getPosts(data.user.id);
      return { posts }; // Next step gets: { userId, user, posts }
    },
  })
  .andThen({
    id: "format-result",
    execute: async ({ data }) => {
      return {
        userName: data.user.name,
        postCount: data.posts.length,
      };
    },
  });
```

## Common Patterns

### API Calls

```typescript
.andThen({
  id: "fetch-user",
  execute: async ({ data }) => {
    const response = await fetch(`/api/users/${data.id}`);
    const user = await response.json();
    return { user };
  }
})
```

### Data Validation

```typescript
.andThen({
  id: "validate-email",
  execute: async ({ data }) => {
    const isValid = data.email.includes("@");
    if (!isValid) {
      throw new Error("Invalid email");
    }
    return data;
  }
})
```

### Error Handling

```typescript
.andThen({
  id: "safe-operation",
  execute: async ({ data }) => {
    try {
      const result = await riskyOperation(data);
      return { result };
    } catch (error) {
      return { result: null, error: error.message };
    }
  }
})
```

## Suspend & Resume Support

```typescript
.andThen({
  id: "approval-step",
  execute: async ({ data, suspend, resumeData }) => {
    // Check if resuming
    if (resumeData) {
      return {
        ...data,
        approved: resumeData.approved
      };
    }

    // Suspend for approval
    if (data.amount > 1000) {
      await suspend("Needs manager approval");
    }

    // Auto-approve small amounts
    return { ...data, approved: true };
  }
})
```

## Schema Support

Define schemas for type safety:

```typescript
.andThen({
  id: "process-order",
  inputSchema: z.object({
    orderId: z.string(),
    items: z.array(z.any())
  }),
  outputSchema: z.object({
    total: z.number(),
    tax: z.number()
  }),
  execute: async ({ data }) => {
    const total = calculateTotal(data.items);
    const tax = total * 0.1;
    return { total, tax };
  }
})
```

## Best Practices

1. **Keep functions focused** - Do one thing well
2. **Return new data** - Don't mutate input
3. **Handle errors gracefully** - Use try/catch
4. **Use descriptive IDs** - Makes debugging easier

## Next Steps

- Learn about [andAgent](./and-agent.md) for AI integration
- Explore [andWhen](./and-when.md) for conditional logic
- See [andAll](./and-all.md) for parallel execution
- Execute workflows via [REST API](../../api/overview.md#workflow-endpoints)
