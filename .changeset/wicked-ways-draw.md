---
"@voltagent/core": patch
---

fix: resolve subagent tool call/result pairing issue with Claude/Bedrock

Fixed a critical issue where subagents performing tool calls would break the conversation flow with Claude/Bedrock models. The error "tool_use ids were found without tool_result blocks" occurred because the tool result messages were not being properly included when converting subagent responses to UI message streams.

## The Problem

When a subagent executed a tool call, the parent agent would receive incomplete message history:

- Direct agents: Called `toUIMessageStream` with `sendStart: false` and `originalMessages`, which only included the initial task message
- StreamText configs: Called `toUIMessageStream` without any parameters
- Both approaches failed to include the complete tool call/result sequence

## The Solution

- Removed explicit parameters from `toUIMessageStream` calls in both direct agent and streamText configuration paths
- Let the AI SDK handle the default behavior for proper message inclusion
- This ensures tool_use and tool_result messages remain properly paired in the conversation

## Impact

- Fixes "No output generated" errors when subagents use tools
- Resolves conversation breakage after subagent tool calls
- Maintains proper message history for Claude/Bedrock compatibility
- No breaking changes - the fix simplifies the internal implementation
