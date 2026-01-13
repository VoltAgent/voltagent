# andRace

> Run multiple steps in parallel and use the first one that finishes. Perfect for timeouts, fallbacks, or getting the fastest response.

## Quick Start

Get data from whichever source responds first:

```typescript
import { createWorkflowChain, andThen, andRace } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "get-user-data",
  input: z.object({ userId: z.string() }),
}).andRace({
  id: "race-user-data",
  steps: [
    // Fast: Check cache (100ms)
    andThen({
      id: "check-cache",
      execute: async ({ data }) => {
        const cached = await checkCache(data.userId);
        if (cached) return { data: cached, source: "cache" };
        throw new Error("Not in cache");
      },
    }),

    // Medium: Database (300ms)
    andThen({
      id: "check-database",
      execute: async ({ data }) => {
        const user = await database.getUser(data.userId);
        return { data: user, source: "database" };
      },
    }),

    // Slow: External API (1000ms)
    andThen({
      id: "fetch-from-api",
      execute: async ({ data }) => {
        const response = await fetch(`/api/users/${data.userId}`);
        return { data: await response.json(), source: "api" };
      },
    }),
  ],
});

const result = await workflow.run({ userId: "123" });
// If cache has data: returns in ~100ms from cache
// If cache misses: returns in ~300ms from database
// If both fail: returns in ~1000ms from API
```

## How It Works

1. All steps start at the same time
2. First one to finish "wins"
3. Its result becomes the workflow result
4. Other steps stop running
5. If winner fails, next fastest wins

Think of it like a race - whoever crosses the finish line first wins, regardless of who started strongest.

## Function Signature

```typescript
.andRace({
  id: string,
  steps: Array<Step>,
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Common Patterns

### Timeout Pattern

Add a timeout to any operation:

```typescript
.andRace({
  id: "timeout-race",
  steps: [
    // Main operation
    andThen({
      id: "slow-api",
      execute: async ({ data }) => {
        const result = await slowAPICall(data);
        return { result, timedOut: false };
      }
    }),
    // Timeout after 5 seconds
    andThen({
      id: "timeout",
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { result: "Timeout", timedOut: true };
      }
    })
  ]
})
```

### Multiple AI Providers

Get response from fastest AI:

```typescript
.andRace({
  id: "ai-provider-race",
  steps: [
    andAgent(
      ({ data }) => data.prompt,
      openaiAgent,
      { schema: z.object({ response: z.string(), ai: z.literal("openai") }) }
    ),
    andAgent(
      ({ data }) => data.prompt,
      claudeAgent,
      { schema: z.object({ response: z.string(), ai: z.literal("claude") }) }
    ),
    andAgent(
      ({ data }) => data.prompt,
      geminiAgent,
      { schema: z.object({ response: z.string(), ai: z.literal("gemini") }) }
    )
  ]
})
```

### Cache vs Database

Try cache first, fall back to database:

```typescript
.andRace({
  id: "cache-db-race",
  steps: [
    // Try cache (fast)
    andThen({
      id: "cache-lookup",
      execute: async ({ data }) => {
        const cached = await cache.get(data.key);
        if (!cached) throw new Error("Cache miss");
        return { value: cached, from: "cache" };
      }
    }),
    // Fall back to database (slower)
    andThen({
      id: "db-lookup",
      execute: async ({ data }) => {
        const value = await db.find(data.key);
        await cache.set(data.key, value); // Update cache
        return { value, from: "database" };
      }
    })
  ]
})
```

## Error Handling

If the fastest step fails, the race continues:

```typescript
.andRace({
  id: "error-race",
  steps: [
    andThen({
      id: "unreliable-fast",
      execute: async () => {
        if (Math.random() > 0.5) {
          throw new Error("Failed!");
        }
        return { result: "fast" };
      }
    }),
    andThen({
      id: "reliable-slow",
      execute: async () => {
        await sleep(1000);
        return { result: "slow but reliable" };
      }
    })
  ]
})
// If fast fails, you get slow result
// If fast succeeds, you get fast result
```

## Performance Comparison

```typescript
// Without race: Always slow (2 seconds)
.andThen({ execute: async () => await slowAPI() })

// With race: Usually fast (50ms)
.andRace({
  id: "perf-race",
  steps: [
    andThen({ execute: async () => await cache() }),    // 50ms
    andThen({ execute: async () => await database() }), // 500ms
    andThen({ execute: async () => await slowAPI() })   // 2000ms
  ]
})
```

## Best Practices

### 1. Order by Speed

```typescript
// Good: Fastest first
.andRace({
  id: "fastest-first",
  steps: [
    cacheStep,    // 10ms
    databaseStep, // 100ms
    apiStep       // 1000ms
  ]
})
```

### 2. Handle Different Results

```typescript
.andRace({ id: "race-results", steps: [...steps] })
.andThen({
  execute: async ({ data }) => {
    // Check which source won
    if (data.source === "cache") {
      console.log("Got cached data");
    }
    return data;
  }
})
```

### 3. Use for Redundancy

```typescript
// Multiple APIs for reliability
.andRace({
  id: "redundancy-race",
  steps: [
    primaryAPI,
    backupAPI,
    fallbackAPI
  ]
})
```

## Comparison with andAll

| Feature  | andRace                | andAll            |
| -------- | ---------------------- | ----------------- |
| Returns  | First to finish        | All results       |
| Speed    | Fast as possible       | Slow as slowest   |
| Use case | Need any result        | Need all results  |
| Failure  | Continues if one fails | Fails if any fail |

## Next Steps

- Learn about [andAll](./and-all.md) for when you need all results
- Explore [andThen](./and-then.md) for sequential processing
- See [andWhen](./and-when.md) for conditional execution
- Execute workflows via [REST API](../../api/overview.md#workflow-endpoints)
