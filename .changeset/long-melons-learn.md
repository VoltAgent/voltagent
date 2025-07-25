---
"@voltagent/core": patch
---

fix: tool errors now properly recorded in conversation history and allow agent retry - #349

Fixed critical issues where tool execution errors were halting agent runs and not being recorded in conversation/event history. This prevented agents from retrying failed tool calls and lost important error context.

**Before:**

- Tool errors would throw and halt agent execution immediately
- No error events or steps were recorded in conversation history
- Agents couldn't learn from or retry after tool failures
- Error context was lost, making debugging difficult

**After:**

- Tool errors are caught and handled gracefully
- Error events (`tool:error`) are created and persisted
- Error steps are added to conversation history with full error details
- Agents can continue execution and retry within `maxSteps` limit
- Tool lifecycle hooks (onEnd) are properly called even on errors

Changes:

- Added `handleToolError` helper method to centralize error handling logic
- Modified `generateText` to catch and handle tool errors without halting execution
- Updated `streamText` onError callback to use the same error handling
- Ensured tool errors are saved to memory storage for context retention

This improves agent resilience and debugging capabilities when working with potentially unreliable tools.
