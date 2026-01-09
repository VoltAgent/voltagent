# andAll

> Run multiple steps in parallel and wait for all to complete. Perfect for batch processing, multiple API calls, or any operations that can run simultaneously.

## Quick Start

Run three operations at the same time:

```typescript
import { createWorkflowChain, andThen, andAll } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "fetch-user-data",
  input: z.object({ userId: z.string() }),
}).andAll({
  id: "fetch-user-data-steps",
  steps: [
    // All three API calls run at the same time
    andThen({
      id: "fetch-profile",
      execute: async ({ data }) => {
        const profile = await fetchUserProfile(data.userId);
        return { profile };
      },
    }),
    andThen({
      id: "fetch-posts",
      execute: async ({ data }) => {
        const posts = await fetchUserPosts(data.userId);
        return { posts };
      },
    }),
    andThen({
      id: "fetch-stats",
      execute: async ({ data }) => {
        const stats = await fetchUserStats(data.userId);
        return { stats };
      },
    }),
  ],
});

// All three requests happen in parallel
const result = await workflow.run({ userId: "user-123" });
// Result: { profile: {...}, posts: [...], stats: {...} }
```

## How It Works

1. All steps start at the same time
2. Each step gets the same input data
3. Waits for ALL steps to finish
4. Merges all results into one object
5. If any step fails, the whole thing fails

Think of it like ordering from multiple restaurants at once - you wait for all deliveries before eating.

## Function Signature

```typescript
.andAll({
  id: string,
  steps: Array<Step>,
  retries?: number,
  name?: string,           // Optional
  purpose?: string         // Optional
})
```

### Retries

```typescript
.andAll({
  id: "parallel-with-retries",
  retries: 2,
  steps: [
    andThen({
      id: "unstable-call",
      execute: async ({ retryCount }) => {
        // retryCount starts at 0 and increments on each retry attempt
        if (retryCount < 2) {
          throw new Error(`Transient failure (attempt ${retryCount})`);
        }
        return { ok: true };
      },
    }),
    andThen({
      id: "stable-call",
      execute: async () => ({ ready: true }),
    }),
  ],
})
```

- `retryCount` starts at 0 and increments on each retry attempt after a thrown error (0 -> 1 -> 2).
- Retries only apply to thrown errors; suspend or cancel does not trigger retries.
- `retries` overrides workflow-wide `retryConfig.attempts` for this step.
- If `retries` is omitted, the workflow `retryConfig.attempts` value is used.
- When `retries` is set on `andAll`, all parallel steps rerun together and see the same `retryCount`.

## Common Patterns

### Parallel API Calls

```typescript
.andAll({
  id: "parallel-api-calls",
  steps: [
    andThen({
      id: "api-1",
      execute: async ({ data }) => {
        const result = await fetch(`/api/service1/${data.id}`);
        return { service1: await result.json() };
      }
    }),
    andThen({
      id: "api-2",
      execute: async ({ data }) => {
        const result = await fetch(`/api/service2/${data.id}`);
        return { service2: await result.json() };
      }
    })
  ]
})
```

### Parallel AI Agents

```typescript
.andAll({
  id: "parallel-ai-analysis",
  steps: [
    andAgent(
      ({ data }) => `Summarize: ${data.text}`,
      summaryAgent,
      { schema: z.object({ summary: z.string() }) }
    ),
    andAgent(
      ({ data }) => `Extract keywords from: ${data.text}`,
      keywordAgent,
      { schema: z.object({ keywords: z.array(z.string()) }) }
    ),
    andAgent(
      ({ data }) => `Analyze sentiment: ${data.text}`,
      sentimentAgent,
      { schema: z.object({ sentiment: z.string() }) }
    )
  ]
})
```

### Batch Processing

```typescript
const items = ["item1", "item2", "item3"];

.andAll({
  id: "batch-processing",
  steps: items.map(item =>
    andThen({
      id: `process-${item}`,
      execute: async () => {
        const result = await processItem(item);
        return { [item]: result };
      }
    })
  )
})
```

## Error Handling

If any step fails, `andAll` fails immediately:

```typescript
.andAll({
  id: "mixed-success-failure",
  steps: [
    andThen({
      id: "will-succeed",
      execute: async () => ({ success: true })
    }),
    andThen({
      id: "will-fail",
      execute: async () => {
        throw new Error("Failed!");
      }
    }),
    andThen({
      id: "also-succeeds",
      execute: async () => ({ alsoSuccess: true })
    })
  ]
})
// Workflow stops here - error thrown
```

To handle failures gracefully, catch errors in individual steps:

```typescript
.andAll({
  id: "safe-parallel-calls",
  steps: [
    andThen({
      id: "safe-api-call",
      execute: async ({ data }) => {
        try {
          const result = await riskyApiCall(data.id);
          return { apiResult: result };
        } catch (error) {
          return { apiResult: null, error: error.message };
        }
      }
    })
  ]
})
```

## Suspend & Resume

`andAll` supports suspension - if any step suspends, the entire parallel operation suspends:

```typescript
.andAll({
  id: "approval-workflow",
  steps: [
    andThen({
      id: "auto-process",
      execute: async ({ data }) => ({ processed: true })
    }),
    andThen({
      id: "needs-approval",
      execute: async ({ data, suspend, resumeData }) => {
        if (resumeData) {
          return { approved: resumeData.approved };
        }
        await suspend("Needs approval");
      }
    })
  ]
})
```

## Performance Tips

### Sequential vs Parallel

```typescript
// Sequential: 3 seconds total
.andThen({ execute: async () => await api1() }) // 1s
.andThen({ execute: async () => await api2() }) // 1s
.andThen({ execute: async () => await api3() }) // 1s

// Parallel: 1 second total
.andAll({
  id: "parallel-api-calls",
  steps: [
    andThen({ execute: async () => await api1() }), // 1s
    andThen({ execute: async () => await api2() }), // 1s
    andThen({ execute: async () => await api3() })  // 1s
  ]
})
```

### Best Practices

1. **Only parallelize independent operations**

   ```typescript
   // Good: No dependencies
   .andAll({
     id: "independent-fetches",
     steps: [fetchUser(), fetchPosts(), fetchComments()]
   })

   // Bad: Second depends on first
   .andAll({
     id: "dependent-operations",
     steps: [createUser(), assignUserRole()]
   })
   ```

2. **Limit parallelism**

   ```typescript
   // Good: Reasonable number
   .andAll({
     id: "reasonable-parallel",
     steps: [api1(), api2(), api3()]
   })

   // Bad: Too many
   .andAll({
     id: "too-many-parallel",
     steps: hundredsOfApiCalls
   })
   ```

3. **Handle errors appropriately**
   ```typescript
   // Wrap risky operations
   .andAll({
     id: "safe-operations",
     steps: [
       safeWrapper(riskyOperation1),
       safeWrapper(riskyOperation2)
     ]
   })
   ```

## Comparison with andRace

| Feature   | andAll            | andRace                 |
| --------- | ----------------- | ----------------------- |
| Waits for | All steps         | First step              |
| Use case  | Need all results  | Need fastest result     |
| Failure   | Fails if any fail | Succeeds if any succeed |
| Result    | Merged from all   | From first complete     |

## Next Steps

- Learn about [andRace](./and-race.md) for "first wins" scenarios
- Explore [andThen](./and-then.md) for sequential processing
- See [andWhen](./and-when.md) for conditional execution
- Execute workflows via [REST API](../../api/overview.md#workflow-endpoints)
