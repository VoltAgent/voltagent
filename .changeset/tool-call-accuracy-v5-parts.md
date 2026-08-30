---
"@voltagent/scorers": patch
---

Fix the code-based `toolCallAccuracy` scorer missing tool calls in AI SDK v5 message parts

The scorer read tool calls from message `parts` only when a part's `type` was exactly `"tool_call"`. AI SDK v5 encodes a tool call in message parts as `type: "tool-<toolName>"`, so those calls were skipped and the scorer reported the expected tool as not called even when it was. It now recognizes `tool-<name>` parts too, matching how it already reads them from tool-call lists.
