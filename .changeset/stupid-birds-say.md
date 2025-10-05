---
"@voltagent/mcp-server": patch
"@voltagent/core": patch
---

Add first-class support for client-side tool calls and Vercel AI hooks integration.

This enables tools to run in the browser (no execute function) while the model remains on the server. Tool calls are surfaced to the client via Vercel AI hooks (useChat/useAssistant), executed with access to browser APIs, and their results are sent back to the model using addToolResult with the original toolCallId.

Highlights:

- Define a client-side tool by omitting the execute function.
- Automatic interception of tool calls on the client via onToolCall in useChat/useAssistant.
- Report outputs and errors back to the model via addToolResult(toolCallId, payload), preserving conversation state.
- Example added/updated: examples/with-client-side-tools (Next.js + Vercel AI).

Docs:

- README: Clarifies client-side tool support and where it fits in the stack.
- website/docs/agents/tools.md: New/updated “Client-Side Tools” section, end-to-end flow with useChat/useAssistant, addToolResult usage, and error handling.
