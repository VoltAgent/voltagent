# Rate Limiting Example

This example demonstrates VoltAgent's rate limiting feature to control the frequency of LLM calls and tool executions.

## Features Demonstrated

1. **Basic LLM Rate Limiting** - Limit requests per minute with error throwing
2. **Delay Strategy** - Automatic waiting when limits are exceeded
3. **Provider-Specific Limits** - Different limits for different LLM providers
4. **Tool Rate Limiting** - Control tool execution frequency
5. **Combined Limits** - Multiple rate limits working together
6. **Monitoring Stats** - Track rate limit usage in real-time

## Installation

```bash
pnpm install
```

## Configuration

Set your OpenAI API key:

```bash
export GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

## Running Examples

Edit `src/index.ts` and uncomment the examples you want to run in the `main()` function:

```typescript
async function main() {
  await example1_basicLLMRateLimit();
  await example2_delayStrategy();
  // ... etc
}
```

Then run:

```bash
pnpm start
```

## Rate Limit Configuration

### LLM Rate Limiting

```typescript
rateLimits: {
  llm: {
    maxRequestsPerMinute: 10,
    strategy: "fixed_window",
    onExceeded: "throw" // or "delay"
  }
}
```

### Provider-Specific Limits

```typescript
rateLimits: {
  providers: {
    openai: {
      maxRequestsPerMinute: 5,
      onExceeded: "throw"
    },
    anthropic: {
      maxRequestsPerMinute: 3,
      onExceeded: "delay"
    }
  }
}
```

### Tool Rate Limiting

```typescript
rateLimits: {
  tools: {
    search_tool: {
      maxRequestsPerMinute: 3,
      onExceeded: "delay"
    }
  }
}
```

## Strategies

### `onExceeded: "throw"`

- Immediately throws `RateLimitExceededError` when limit is reached
- Good for strict enforcement and error handling

### `onExceeded: "delay"`

- Automatically waits until the rate limit resets
- Good for background jobs and retry scenarios

## Use Cases

- **Cost Control**: Limit expensive LLM API calls
- **API Quota Management**: Stay within provider rate limits
- **Resource Protection**: Prevent tool overuse
- **Fair Usage**: Distribute resources across multiple agents
