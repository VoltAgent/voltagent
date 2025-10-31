---
"@voltagent/core": patch
---

fix: expose AI SDK tool metadata (e.g. toolCallId, abort signal) via ToolExecuteOptions - #746

Server-side tool wrappers now pass the full AI SDK `ToolCallOptions` object through to custom tools and hook listeners. That means `options.toolCallId`, `options.messages`, and `options.abortSignal` are populated, and we inject `options.operationContext` so the agent context is still available. The change is backward compatible (`tool.execute` keeps the same signature), but tooling and observability now see the real call id instead of a random UUID.
