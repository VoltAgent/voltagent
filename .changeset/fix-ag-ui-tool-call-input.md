---
"@voltagent/ag-ui": patch
---

fix: use `input` instead of `args` for tool-call parts in message conversion

When converting CopilotKit assistant messages with tool calls to VoltAgent format,
the adapter was setting `args` on tool-call parts. The AI SDK's `ToolCallPart`
interface expects `input`, causing the Anthropic provider to send `undefined` as
the tool_use input — rejected by the API with:

  "messages.N.content.N.tool_use.input: Input should be a valid dictionary"
