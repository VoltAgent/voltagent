---
"@voltagent/core": patch
---

feat: expose workspace in tool execution context - #1046

- Add `workspace?: Workspace` to `OperationContext`, so custom tools can access `options.workspace` during tool calls.
- Wire agent operation context creation to attach the configured workspace automatically.
- Add regression coverage showing a tool call can read workspace filesystem content and fetch sandbox output in the same execution.
