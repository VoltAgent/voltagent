# VoltAgent Hooks Example

This example demonstrates all available agent hooks in VoltAgent, including the new `onPrepareMessages` hook for message transformation.

## Available Hooks

1. **`onStart`** - Called when the agent starts processing
2. **`onPrepareMessages`** - Called before messages are sent to the LLM (allows transformation)
3. **`onToolStart`** - Called when a tool starts executing
4. **`onToolEnd`** - Called when a tool finishes executing
5. **`onEnd`** - Called when the agent finishes processing
6. **`onHandoff`** - Called when an agent hands off to another agent

## Features Demonstrated

### Message Transformation (`onPrepareMessages`)

- Modify messages before they're sent to the LLM
- Add contextual information (timestamps, metadata)
- Filter or transform content
- Simple and practical example

### Lifecycle Tracking

- Track operation start/end times
- Monitor tool execution
- Log conversation and operation IDs
- Error handling and reporting

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set up your OpenAI API key:

```bash
export OPENAI_API_KEY="your-api-key"
```

3. Run the example:

```bash
pnpm dev
```

## Use Cases

### Adding Context

```typescript
onPrepareMessages: async ({ messages }) => {
  // Add timestamps to user messages
  const enhanced = messages.map((msg) => {
    if (msg.role === "user") {
      return {
        ...msg,
        content: `[${new Date().toLocaleTimeString()}] ${msg.content}`,
      };
    }
    return msg;
  });
  return { messages: enhanced };
};
```

### Filtering Sensitive Data

```typescript
onPrepareMessages: async ({ messages }) => {
  // Remove sensitive patterns
  const filtered = messages.map((msg) => ({
    ...msg,
    content: msg.content.replace(/password:\s*\S+/gi, "password: [REDACTED]"),
  }));
  return { messages: filtered };
};
```

### Message Logging

```typescript
onPrepareMessages: async ({ messages, context }) => {
  // Log messages for debugging
  console.log(`Operation ${context.operationId}: ${messages.length} messages`);
  return { messages }; // Return unchanged
};
```

## Notes

- Hooks are optional - only implement the ones you need
- Hooks can be async or sync
- The `onPrepareMessages` hook receives a copy of messages to prevent accidental mutations
- Return `{ messages: transformedMessages }` from `onPrepareMessages` to use transformed messages
- All hooks receive the operation context for tracking and correlation
