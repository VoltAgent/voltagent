---
"@voltagent/core": minor
---

feat: add abort signal support for operation cancellation

**Abort Signal Support enables graceful cancellation of agent operations.** Users can now cancel expensive operations when they navigate away or change their minds.

## 🎯 Key Features

- **Stream API Cancellation**: `/stream` and `/stream-object` endpoints now handle client disconnection automatically
- **Agent Method Support**: All agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) support abort signals
- **SubAgent Propagation**: Abort signals cascade through sub-agent hierarchies

## 📋 Usage

```typescript
// Create AbortController
const abortController = new AbortController();

// Cancel when user navigates away or clicks stop
window.addEventListener("beforeunload", () => abortController.abort());

// Stream request with abort signal
const response = await fetch("http://localhost:3141/agents/my-agent/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: "Write a very long story...",
    options: { maxTokens: 4000 },
  }),
  signal: abortController.signal, // ✅ Automatic cancellation
});

// Manual cancellation after 10 seconds
setTimeout(() => abortController.abort(), 10000);
```

This prevents unnecessary computation and improves resource efficiency.
