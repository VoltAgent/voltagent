---
"@voltagent/core": patch
---

feat: add onPrepareMessages hook - transform messages before they reach the LLM

## What Changed for You

You can now modify, filter, or enhance messages before they're sent to the LLM. Previously impossible without forking the framework.

## Before - What You Couldn't Do

```typescript
// ❌ No way to:
// - Add timestamps to messages
// - Filter sensitive data (SSN, credit cards)
// - Add user context to messages
// - Remove duplicate messages
// - Inject system prompts dynamically

const agent = new Agent({
  name: "Assistant",
  // Messages went straight to LLM - no control!
});
```

## After - What You Can Do Now

```typescript
import { Agent, messageHelpers } from "@voltagent/core";

const agent = new Agent({
  name: "Assistant",

  hooks: {
    // ✅ NEW: Intercept and transform messages!
    onPrepareMessages: async ({ messages, context }) => {
      // Add timestamps
      const timestamp = new Date().toLocaleTimeString();
      const enhanced = messages.map((msg) => messageHelpers.addTimestampToMessage(msg, timestamp));

      return { messages: enhanced };
    },
  },
});

// Your message: "What time is it?"
// LLM receives: "[14:30:45] What time is it?"
```

## When It Runs

```typescript
// 1. User sends message
await agent.generateText("Hello");

// 2. Memory loads previous messages
// [previous messages...]

// 3. ✨ onPrepareMessages runs HERE
// You can transform messages

// 4. Messages sent to LLM
// [your transformed messages]
```

## What You Need to Know

- **Runs on every LLM call**: generateText, streamText, generateObject, streamObject
- **Gets all messages**: Including system prompt and memory messages
- **Return transformed messages**: Or return nothing to keep original
- **Access to context**: userContext, operationId, agent reference

Your app just got smarter without changing any existing code!
