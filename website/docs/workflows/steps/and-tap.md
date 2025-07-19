# andTap

> Look at your data without touching it. Perfect for logging, debugging, and analytics.

## Quick Start

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "process-order",
  input: z.object({ orderId: z.string() }),
})
  .andThen({
    id: "calculate-total",
    execute: async ({ data }) => ({
      ...data,
      total: 100,
    }),
  })
  .andTap({
    id: "log-total",
    execute: ({ data }) => {
      console.log(`Order ${data.orderId} total: $${data.total}`);
    },
  })
  .andThen({
    id: "charge-customer",
    execute: async ({ data }) => ({
      ...data,
      charged: true,
    }),
  });

// Console: "Order 123 total: $100"
// Result: { orderId: "123", total: 100, charged: true }
```

## How It Works

`andTap` = See but don't touch:

```typescript
.andTap({
  execute: ({ data }) => {
    // Look at data
    console.log(data);
    // Return value is ignored
    return "this is ignored";
  }
})
// Next step gets original data unchanged
```

Key points:

- **Never changes data** - Original data passes through untouched
- **Can't break your workflow** - Errors are caught and logged
- **Return value ignored** - Whatever you return doesn't matter

## Common Patterns

### Debug Your Workflow

```typescript
.andThen({ id: "step1", execute: async () => ({ value: 42 }) })
.andTap({
  id: "debug",
  execute: ({ data }) => console.log("Current data:", data)
})
.andThen({ id: "step2", execute: async ({ data }) => data })
```

### Send Analytics

```typescript
.andTap({
  id: "track-event",
  execute: async ({ data }) => {
    await analytics.track("OrderProcessed", {
      orderId: data.orderId,
      amount: data.total
    });
  }
})
```

### Log to External Services

```typescript
.andTap({
  id: "log-to-datadog",
  execute: async ({ data, state }) => {
    await logger.info("Workflow progress", {
      workflowId: state.workflowId,
      step: "payment",
      data
    });
  }
})
```

## andTap vs andThen

| What    | andTap                      | andThen                 |
| ------- | --------------------------- | ----------------------- |
| Purpose | Look at data                | Change data             |
| Returns | Ignored                     | Merged into data        |
| Errors  | Caught (workflow continues) | Thrown (workflow stops) |
| Use for | Logging, analytics          | Business logic          |

## Error Handling

Errors in `andTap` don't stop your workflow:

```typescript
.andTap({
  id: "might-fail",
  execute: async ({ data }) => {
    throw new Error("This error is caught!");
  }
})
.andThen({
  id: "still-runs",
  execute: async ({ data }) => {
    // This runs even though andTap threw an error
    return { ...data, success: true };
  }
})
```

## Best Practices

1. **Use for side effects only** - Don't try to modify data
2. **Keep it simple** - Complex logic belongs in `andThen`
3. **Don't depend on execution** - Workflow should work even if tap fails
4. **Perfect for debugging** - Add/remove without affecting logic

## Schema Support

```typescript
.andTap({
  id: "validate-logging",
  inputSchema: z.object({
    orderId: z.string(),
    total: z.number()
  }),
  execute: ({ data }) => {
    // TypeScript knows data shape
    console.log(`Order ${data.orderId}: $${data.total}`);
  }
})
```

## Next Steps

- Learn about [andThen](./and-then.md) for data transformation
- Explore [andWhen](./and-when.md) for conditional logic
- See [andAgent](./and-agent.md) for AI integration

> **Remember**: `andTap` is read-only. Use it to observe, not to change.
