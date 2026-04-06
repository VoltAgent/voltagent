---
"@voltagent/core": minor
---

feat(core): add `prepareStep` to AgentOptions for per-step tool control

Surfaces the AI SDK's `prepareStep` callback as a top-level `AgentOptions` property so users can set a default step preparation callback at agent creation time. Per-call `prepareStep` in method options overrides the agent-level default.

This enables controlling tool availability, tool choice, and other step settings on a per-step basis without passing `prepareStep` on every call.
