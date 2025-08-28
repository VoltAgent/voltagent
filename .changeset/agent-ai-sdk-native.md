---
"@voltagent/core": major
---

# Agent Class - AI SDK Native Integration

The Agent class has been completely refactored to use AI SDK directly, removing the provider abstraction layer for better performance and simpler API.

## Breaking Changes

### Provider System Removed

The Agent class no longer uses the provider abstraction. It now works directly with AI SDK's LanguageModel.

**Before:**

```typescript
import { VercelAIProvider } from "@voltagent/vercel-ai";

const agent = new Agent({
  name: "assistant",
  description: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
```

**After:**

```typescript
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "assistant",
  instructions: "You are a helpful assistant", // description -> instructions
  model: openai("gpt-4o-mini"),
});
```

### Description Field Removed

The deprecated `description` field has been completely removed in favor of `instructions`.

**Before:**

```typescript
const agent = new Agent({
  name: "assistant",
  description: "You are a helpful assistant", // @deprecated
  instructions: "You are a helpful assistant", // Had to use both
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
```

**After:**

```typescript
const agent = new Agent({
  name: "assistant",
  instructions: "You are a helpful assistant", // Only instructions now
  model: openai("gpt-4o-mini"),
});
```

### Context API Changes

The context property has been renamed from `userContext` to `context` and can now accept plain objects.

**Before:**

```typescript
// userContext only accepted Map
const agent = new Agent({
  userContext: new Map([["key", "value"]]),
});

await agent.generateText({
  input: "Hello",
  userContext: new Map([["key", "value"]]),
});
```

**After:**

```typescript
// context accepts both Map and plain objects
const agent = new Agent({
  context: { key: "value" }, // Can be Map or plain object
});

await agent.generateText({
  input: "Hello",
  context: { key: "value" }, // ContextInput type: Map or Record
});
```

// New AgentContext structure used internally:
interface AgentContext {
context: Map<string | symbol, unknown>,
operation: {
id: string,
userId?: string,
conversationId?: string,
parentAgentId?: string,
parentHistoryId?: string
},
system: {
logger: Logger,
signal?: AbortSignal,
startTime: string
}
}

````

### Hook System Simplified
Hooks are now defined directly without createHooks wrapper.

**Before:**
```typescript
import { createHooks } from '@voltagent/core';

const agent = new Agent({
  hooks: createHooks({
    onStart: async (context) => {},
    onEnd: async (context, result) => {}
  })
});
````

**After:**

```typescript
const agent = new Agent({
  hooks: {
    onStart: async (context: AgentContext) => {},
    onEnd: async (context: AgentContext, result, error?) => {},
    onError: async (context: AgentContext, error) => {},
    onPrepareMessages: async (messages: UIMessage[], context) => {
      // New hook for message preparation
      return { messages };
    },
    onToolStart: async (context, tool) => {},
    onToolEnd: async (context, tool, output, error?) => {},
  },
});
```

### Method Signatures Now Use AI SDK Options

All generation methods now accept AI SDK's CallSettings.

**Before:**

```typescript
await agent.generateText({
  input: "Hello",
  userId: "123",
  conversationId: "conv-1",
  provider: {
    maxTokens: 1000,
    temperature: 0.7,
  },
});
```

**After:**

```typescript
await agent.generateText({
  input: "Hello",
  // VoltAgent specific
  userId: "123",
  conversationId: "conv-1",
  context: { key: "value" },
  // AI SDK CallSettings
  maxTokens: 1000,
  temperature: 0.7,
  topP: 0.9,
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
  seed: 12345,
  maxRetries: 3,
});
```

### Message Format Changes

Agent now accepts UIMessage format from AI SDK.

**Before:**

```typescript
// BaseMessage format
await agent.generateText({
  input: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ],
});
```

**After:**

```typescript
// UIMessage format (AI SDK compatible)
await agent.generateText({
  input: [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "Hello" }],
    },
    {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "Hi there!" }],
    },
  ],
});

// UIMessage structure from AI SDK:
interface UIMessage {
  id: string;
  role: "system" | "user" | "assistant";
  metadata?: unknown; // For custom data like createdAt
  parts: Array<UIMessagePart>; // text, tool, reasoning, etc.
}
```

## New Features

### Direct AI SDK Integration

- Better performance without abstraction overhead
- Access to all AI SDK features directly
- Simplified error handling
- Native streaming support

### Enhanced Type Safety

```typescript
// All methods now have proper generic types
const result = await agent.generateObject<typeof schema>({
  input: "Generate user data",
  schema: userSchema,
});
// result.object is properly typed
```

### Streamlined API

```typescript
// All generation methods follow same pattern
const textResult = await agent.generateText(options);
const textStream = await agent.streamText(options);
const objectResult = await agent.generateObject(options);
const objectStream = await agent.streamObject(options);
```

## Migration Guide

### 1. Remove Deprecated Packages

```diff
- "@voltagent/vercel-ai": "^0.9.0",
- "@voltagent/vercel-ui": "^0.9.0",
- "@voltagent/xsai": "^0.9.0",
```

```bash
npm uninstall @voltagent/vercel-ai @voltagent/vercel-ui @voltagent/xsai
```

### 2. Install AI SDK Directly

```diff
+ "ai": "^5.0.0",
+ "@ai-sdk/openai": "^1.0.0",
+ "@ai-sdk/anthropic": "^1.0.0",
```

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic
```

### 3. Update Your Code

```diff
// imports
- import { VercelAIProvider } from '@voltagent/vercel-ai';
+ import { openai } from '@ai-sdk/openai';

// agent creation
const agent = new Agent({
  name: 'assistant',
- description: 'You are a helpful assistant',
+ instructions: 'You are a helpful assistant',
- llm: new VercelAIProvider(),
- model: 'gpt-4o-mini',
+ model: openai('gpt-4o-mini'),
});

// hooks
- import { createHooks } from '@voltagent/core';
- hooks: createHooks({ onStart: () => {} })
+ hooks: { onStart: () => {} }

// context
- userContext: new Map([['key', 'value']])
+ context: { key: 'value' }
```

## Benefits

- **Simpler API**: No provider abstraction complexity
- **Better Performance**: Direct AI SDK usage
- **Type Safety**: Improved TypeScript support
- **Future Proof**: Aligned with AI SDK ecosystem
- **Smaller Bundle**: Removed abstraction layer code
