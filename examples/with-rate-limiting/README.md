# Rate Limiting in VoltAgent

This example demonstrates how to implement comprehensive rate limiting in VoltAgent agents, including different strategies, tool-specific limits, and monitoring hooks.

## Features Demonstrated

1. **Basic LLM Rate Limiting** - Enforce model request limits with error throwing
2. **Delay Strategy** - Automatically wait when rate limits are exceeded
3. **Tool-Specific Rate Limiting** - Set different limits for different tools
4. **Tool Rate Limiting** - Focus on individual tool request constraints
5. **Combined LLM + Tool Rate Limiting** - Apply limits at both agent and tool levels
6. **Rate Limit Statistics** - Monitor and track rate limit usage
7. **Hooks for Monitoring** - React to rate limit events with callbacks

## Installation

```bash
cd examples/with-rate-limiting
pnpm install
```

## Configuration Options

### Basic Rate Limit Configuration

```typescript
const agent = new Agent({
  name: "limited-agent",
  model: google("gemini-2.0-flash-exp"),
  instructions: "You are a helpful assistant.",
  rateLimits: {
    llm: {
      maxRequestsPerMinute: 5,
      strategy: "fixed_window", // or "sliding_window", "token_bucket", "leaky_bucket"
      onExceeded: "throw", // or "delay"
    },
  },
});
```

### Rate Limiting Strategies

- **Fixed Window**: Simple per-minute counter reset
- **Sliding Window**: More accurate time-based windowing
- **Token Bucket**: Allows burst traffic while maintaining average rate
- **Leaky Bucket**: Smooth request distribution over time

## Hooks for Monitoring

Hooks allow you to react to rate limit events with custom callbacks:

```typescript
const agent = new Agent({
  name: "hooked-agent",
  model: google("gemini-2.0-flash-exp"),
  instructions: "You are a helpful assistant.",
  rateLimits: {
    llm: {
      maxRequestsPerMinute: 3,
      onExceeded: "delay",
      onLimitExceeded: async (context) => {
        console.warn(`⚠️ Rate limit exceeded for scope: ${context.scope}`);
        console.warn(`  Remaining: ${context.stats.remaining}`);
        console.warn(`  Reset at: ${context.stats.resetAt}`);
      },
    },
    tools: {
      search_tool: {
        maxRequestsPerMinute: 2,
        onExceeded: "delay",
        onLimitExceeded: async (context) => {
          console.warn(`⚠️ Search tool rate limit exceeded!`);
          // Send alerts, log to monitoring systems, etc.
        },
      },
    },
  },
});
```

### Hook Context Properties

When a hook is triggered, the context object contains:

- `scope` - The scope where limit was exceeded (e.g., "llm", "tool:search_tool")
- `stats` - Rate limit statistics object with:
  - `remaining` - Number of requests still available in current window
  - `resetAt` - Timestamp when the rate limit window resets

## Examples in Detail

### Example 1: Basic LLM Rate Limiting

Demonstrates enforcing a 3 requests-per-minute limit with error throwing. The 4th request will throw a `RateLimitExceededError` containing retry information.

**Key Features:**

- `maxRequestsPerMinute: 3` - Only 3 requests allowed per minute
- `onExceeded: "throw"` - Immediately throws error when limit exceeded
- Error includes `remaining` count and `resetAt` timestamp

### Example 2: Delay Strategy

Shows automatic waiting when limits are reached. The agent automatically delays the 3rd request until the rate limit window resets, providing a seamless experience.

**Key Features:**

- `maxRequestsPerMinute: 2` - Only 2 requests allowed per minute
- `onExceeded: "delay"` - Automatically waits instead of failing
- Transparent to the caller - request completes after waiting

### Example 3: Tool-Specific Rate Limiting

Sets different limits for different tools:

- `search_tool`: 5 requests/minute
- `calculator`: 10 requests/minute

Each tool has independent rate limit counters.

**Key Features:**

- Multiple tools with different limits
- Each tool tracked separately
- `onExceeded: "throw"` for strict enforcement

### Example 4: Tool Rate Limiting

Focuses on limiting a specific tool (`search_tool` at 2 requests/minute). Useful when a particular tool has stricter API rate limits.

**Key Features:**

- Single tool limiting
- `onExceeded: "throw"` strategy
- Tests agent behavior with multiple search requests

### Example 5: Combined LLM + Tool Rate Limiting

Applies limits at both levels:

- Global LLM: 5 requests/minute with delay
- Individual tool: 3 requests/minute with delay

The agent respects all configured limits.

**Key Features:**

- Both LLM and tool limits active
- Both use `onExceeded: "delay"`
- Demonstrates multi-level rate limiting

### Example 6: Monitoring Rate Limit Statistics

Demonstrates how to access and monitor rate limit state. Statistics are tracked internally and accessible through error properties when limits are exceeded.

**Key Features:**

- Rate limits are maintained internally
- Statistics available in error objects
- Useful for logging and monitoring

### Example 7: Hooks for Rate Limit Monitoring ⭐ NEW

Uses callback hooks to react to rate limit events in real-time:

- `onLimitExceeded` - Called when a rate limit is exceeded

This provides flexible, event-driven monitoring without blocking the agent flow.

**Key Features:**

- `maxRequestsPerMinute: 3` with 4 requests (triggers hook)
- Hook logs scope, remaining count, and reset timestamp
- Demonstrates hook triggering and context usage

## Running Examples

Edit `src/index.ts` and uncomment the examples you want to run in the `main()` function:

```typescript
async function main() {
  console.log("🚀 VoltAgent Rate Limiting Examples\n");

  try {
    await example1_basicLLMRateLimit();
    await example2_delayStrategy();
    await example3_toolRateLimiting();
    await example4_toolRateLimiting();
    await example5_combinedLimits();
    await example6_monitoringStats();
    await example7_hooksForMonitoring();

    console.log("\n✓ Examples ready!");
  } catch (error) {
    console.error("\n✗ Error:", error);
  }
}
```

Then run:

```bash
pnpm run dev
```

## Error Handling

When using `onExceeded: "throw"`:

```typescript
try {
  const response = await agent.generateText("What is AI?");
} catch (error) {
  if (error instanceof RateLimitExceededError) {
    console.log(`Retry after ${error.retryAfter} seconds`);
    console.log(`Remaining requests: ${error.stats.remaining}`);
    console.log(`Reset at: ${error.stats.resetAt}`);
  }
}
```

When using `onExceeded: "delay"`:

```typescript
// The agent automatically waits for the rate limit window to reset
const response = await agent.generateText("What is AI?");
// Request completes transparently after waiting
```

## Best Practices

1. **Choose Appropriate Limits**: Set realistic limits based on your API quotas
2. **Monitor Hooks**: Use hooks to track rate limit violations and alert teams
3. **Combine Strategies**: Use different strategies at different levels (LLM vs tools)
4. **Plan for Bursts**: Token bucket strategy works well for bursty workloads
5. **Log Rate Limit Events**: Keep audit trails of rate limit violations
6. **Test Gracefully**: Verify behavior when limits are reached before production

## Use Cases

- **Cost Control**: Limit expensive LLM API calls to manage expenses
- **API Quota Management**: Stay within provider rate limits and quotas
- **Resource Protection**: Prevent tool overuse and API abuse
- **Fair Usage**: Distribute resources fairly across multiple agents
- **Compliance**: Ensure rate limits required by service agreements
- **Graceful Degradation**: Choose between failing fast or queuing requests

## More Information

For more details on rate limiting strategies and implementation, see the VoltAgent core documentation.
