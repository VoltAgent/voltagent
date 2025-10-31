---
"@voltagent/core": patch
---

fix: forward AI SDK tool call metadata (including `toolCallId`) to server-side tool executions - #746

Tool wrappers now receive the full options object from the AI SDK, so custom tools and hook listeners can access `toolCallId`, abort signals, and other metadata. We also propagate the real call id to OpenTelemetry spans. Existing tools keep working (the extra argument is optional), but they can now inspect the third `options` parameter if they need richer context.
