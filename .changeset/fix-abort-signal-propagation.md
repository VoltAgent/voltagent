---
"@voltagent/core": patch
---

fix: abort signal propagation to LLM providers for proper cancellation support

Fixed an issue where abort signals were not correctly propagated to LLM providers in agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`). The methods were using `internalOptions.signal` instead of `operationContext.signal`, which contains the properly derived signal from the AbortController.

## What's Fixed

- **Signal Propagation**: All agent methods now correctly pass `operationContext.signal` to LLM providers
- **AbortController Support**: Abort signals from parent agents properly cascade to subagents
- **Cancellation Handling**: Operations can now be properly cancelled when AbortController is triggered

## Usage Example

```typescript
import { Agent, isAbortError } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const abortController = new AbortController();

// Create supervisor with subagents
const supervisor = new Agent({
  name: "Supervisor",
  instructions: "Coordinate tasks",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [contentAgent, formatterAgent],
  hooks: {
    onEnd: async ({ error }) => {
      // Check if the operation was aborted
      if (isAbortError(error)) {
        console.log("Operation was aborted:", error.message);
        // Handle cleanup for aborted operations
        return;
      }

      if (error) {
        console.error("Operation failed:", error);
      }
    },
  },
});

// Start streaming with abort controller
const stream = await supervisor.streamText("Create a story", {
  abortController,
});

// Abort after 500ms - now properly stops all subagent operations
setTimeout(() => {
  abortController.abort();
}, 500);

try {
  // Stream will properly terminate when aborted
  for await (const chunk of stream.textStream) {
    console.log(chunk);
  }
} catch (error) {
  if (isAbortError(error)) {
    console.log("Stream aborted successfully");
  }
}
```

## Error Handling in Hooks

The `onEnd` hook now receives `AbortError` type errors when operations are cancelled:

```typescript
import { isAbortError } from "@voltagent/core";

const agent = new Agent({
  // ... agent config
  hooks: {
    onEnd: async ({ error }) => {
      if (isAbortError(error)) {
        // error is typed as AbortError
        // error.name === "AbortError"
        // Handle abort-specific logic
        await cleanupResources();
        return;
      }

      // Handle other errors
      if (error) {
        await logError(error);
      }
    },
  },
});
```

This fix ensures that expensive operations can be properly cancelled, preventing unnecessary computation and improving resource efficiency when users navigate away or cancel requests.
