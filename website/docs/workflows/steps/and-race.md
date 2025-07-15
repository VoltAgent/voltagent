# andRace - Race Execution

> **First completed step wins.** Run multiple steps in parallel and return the first result.

## What is andRace?

`andRace` executes multiple steps simultaneously and returns the result from whichever completes first. Like `Promise.race()` but for workflow steps.

```typescript
const workflow = createWorkflowChain({
  id: "fast-response",
  input: z.object({ query: z.string() }),
  result: z.object({
    source: z.string(),
    result: z.string(),
    responseTime: z.number(),
  }),
}).andRace({
  steps: [
    // Check cache (fast)
    andThen({
      execute: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms
        const cached = await getFromCache(data.query);
        return {
          source: "cache",
          result: cached || "Not found in cache",
          responseTime: 100,
        };
      },
    }),
    // Query database (slower)
    andThen({
      execute: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms
        const dbResult = await queryDatabase(data.query);
        return {
          source: "database",
          result: dbResult,
          responseTime: 500,
        };
      },
    }),
    // AI fallback (slowest)
    andAgent((data) => `Generate response for: ${data.query}`, agent, {
      schema: z.object({
        source: z.literal("ai"),
        result: z.string(),
        responseTime: z.literal(1000),
      }),
    }),
  ],
});

const result = await workflow.run({ query: "What is AI?" });
// Returns cache result (fastest) after ~100ms
// { source: "cache", result: "...", responseTime: 100 }
```

## Function Signature

```typescript
.andRace({
  steps: [step1, step2, step3, ...]  // array of workflow steps
})
```

### How It Works

1. **All steps start simultaneously** with the same input data
2. **First step to complete wins** and returns its result
3. **Other steps are cancelled** (if possible)
4. **If fastest step fails, race continues** with remaining steps

```typescript
const redundantAPIWorkflow = createWorkflowChain({
  input: z.object({ userId: z.string() }),
  result: z.object({
    userData: any,
    source: z.string(),
  }),
}).andRace({
  steps: [
    // Primary API
    andThen({
      execute: async (data) => {
        const userData = await fetch(`https://api1.example.com/users/${data.userId}`);
        return {
          userData: await userData.json(),
          source: "primary-api",
        };
      },
    }),
    // Backup API
    andThen({
      execute: async (data) => {
        const userData = await fetch(`https://api2.example.com/users/${data.userId}`);
        return {
          userData: await userData.json(),
          source: "backup-api",
        };
      },
    }),
    // Fallback API
    andThen({
      execute: async (data) => {
        const userData = await fetch(`https://api3.example.com/users/${data.userId}`);
        return {
          userData: await userData.json(),
          source: "fallback-api",
        };
      },
    }),
  ],
});

// Returns result from whichever API responds first
```

## Using State in Race Steps

Each racing step receives the same input data and state:

```typescript
const multiProviderSearch = createWorkflowChain({
  input: z.object({ searchTerm: z.string() }),
  result: z.object({
    results: any[],
    provider: z.string(),
    userTier: z.string()
  })
})
.andRace({
  steps: [
    andThen({
      execute: async (data, state) => {
        // Premium search (faster for premium users)
        const userTier = state.userContext?.get('tier');
        if (userTier === 'premium') {
          const results = await premiumSearch(data.searchTerm);
          return { results, provider: "premium", userTier };
        }
        throw new Error("Not premium user");
      }
    }),
    andThen({
      execute: async (data, state) => {
        // Standard search (available for all)
        const results = await standardSearch(data.searchTerm);
        const userTier = state.userContext?.get('tier') || 'standard';
        return { results, provider: "standard", userTier };
      }
    }),
    andAgent(
      (data, state) => {
        const userTier = state.userContext?.get('tier') || 'free';
        return `Search for "${data.searchTerm}" with ${userTier} tier limitations`;
      },
      agent,
      {
        schema: z.object({
          results: z.array(z.string()),
          provider: z.literal("ai"),
          userTier: z.string()
        })
      }
    )
  ]
});
```

## Common Patterns

### Timeout with Fallback

```typescript
.andRace({
  steps: [
    // Main operation
    andThen({
      execute: async (data) => {
        const result = await slowAPICall(data);
        return { result, source: "api" };
      }
    }),
    // Timeout fallback
    andThen({
      execute: async (data) => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s timeout
        return { result: "Request timed out", source: "timeout" };
      }
    })
  ]
})
```

### Multiple AI Providers

```typescript
.andRace({
  steps: [
    andAgent(
      (data) => data.prompt,
      openaiAgent,
      { schema: z.object({ response: z.string(), provider: z.literal("openai") }) }
    ),
    andAgent(
      (data) => data.prompt,
      claudeAgent,
      { schema: z.object({ response: z.string(), provider: z.literal("claude") }) }
    ),
    andAgent(
      (data) => data.prompt,
      geminiAgent,
      { schema: z.object({ response: z.string(), provider: z.literal("gemini") }) }
    )
  ]
})
```

### Cache vs Compute

```typescript
.andRace({
  steps: [
    // Check cache first
    andThen({
      execute: async (data) => {
        const cached = await redis.get(`result:${data.key}`);
        if (cached) {
          return { result: JSON.parse(cached), fromCache: true };
        }
        throw new Error("Cache miss");
      }
    }),
    // Expensive computation
    andThen({
      execute: async (data) => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
        const computed = await expensiveComputation(data);
        await redis.set(`result:${data.key}`, JSON.stringify(computed), 'EX', 3600);
        return { result: computed, fromCache: false };
      }
    })
  ]
})
```

### Geographic Failover

```typescript
.andRace({
  steps: [
    // Primary region
    andThen({
      execute: async (data) => {
        const result = await fetch(`https://us-east.api.com/data/${data.id}`);
        return { data: await result.json(), region: "us-east" };
      }
    }),
    // Secondary region
    andThen({
      execute: async (data) => {
        const result = await fetch(`https://eu-west.api.com/data/${data.id}`);
        return { data: await result.json(), region: "eu-west" };
      }
    }),
    // Tertiary region
    andThen({
      execute: async (data) => {
        const result = await fetch(`https://asia.api.com/data/${data.id}`);
        return { data: await result.json(), region: "asia" };
      }
    })
  ]
})
```

## Error Handling

If the fastest step fails, race continues with remaining steps:

```typescript
.andRace({
  steps: [
    andThen({
      execute: async (data) => {
        // This might fail quickly
        if (Math.random() > 0.5) {
          throw new Error("Fast operation failed");
        }
        return { result: "fast", success: true };
      }
    }),
    andThen({
      execute: async (data) => {
        // This is slower but more reliable
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { result: "reliable", success: true };
      }
    })
  ]
})
.andThen({
  execute: async (data) => {
    console.log(`Winner: ${data.result}`);
    return data;
  }
})
```

## Performance Benefits

`andRace` optimizes for speed by using the fastest available option:

```typescript
// Instead of always waiting for slowest option
.andThen({ execute: async (data) => await slowButReliableAPI(data) }) // Always 2s

// Use race for speed optimization
.andRace({
  steps: [
    andThen({ execute: async (data) => await fastCache(data) }),      // 50ms
    andThen({ execute: async (data) => await mediumAPI(data) }),      // 500ms
    andThen({ execute: async (data) => await slowButReliableAPI(data) }) // 2s
  ]
})
// Usually completes in 50ms, falls back to 500ms or 2s if needed
```

## Best Practices

### Order Steps by Speed

```typescript
// Good: Fastest first, slowest last
.andRace({
  steps: [
    andThen({ execute: async (data) => await cache(data) }),      // 50ms
    andThen({ execute: async (data) => await database(data) }),   // 200ms
    andThen({ execute: async (data) => await externalAPI(data) }) // 1000ms
  ]
})

// Less optimal: Random order
.andRace({
  steps: [
    andThen({ execute: async (data) => await externalAPI(data) }), // 1000ms
    andThen({ execute: async (data) => await cache(data) }),       // 50ms
    andThen({ execute: async (data) => await database(data) })     // 200ms
  ]
})
```

### Handle All Possible Results

```typescript
.andRace({
  steps: [fastStep, mediumStep, slowStep]
})
.andThen({
  execute: async (data) => {
    // Handle different result sources
    switch (data.source) {
      case 'cache':
        console.log('Got cached result');
        break;
      case 'database':
        console.log('Got database result');
        break;
      case 'api':
        console.log('Got API result');
        break;
    }
    return data;
  }
})
```

## Next Steps

- **[andAll](./and-all.md)** - Wait for all steps to complete
- **[andThen](./and-then.md)** - Process race winner with functions
- **[andWhen](./and-when.md)** - Add conditions to racing steps

---

> **Quick Summary**: `andRace` runs multiple steps simultaneously and returns the first completed result. Perfect for speed optimization, redundancy, and fallback scenarios where you want the fastest available response.
