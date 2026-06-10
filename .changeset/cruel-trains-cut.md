---
"@voltagent/core": patch
---

fix: prevent delegated sub-agent messages from polluting supervisor memory context

When a supervisor delegated work via `delegate_task`, the sub-agent used the same `conversationId` and persisted its own delegated input/output into that shared thread. On later turns, supervisor memory reads could include those delegated sub-agent messages, which could lead to duplicate/phantom prompts in the parent conversation context.

### Previous behavior

- Sub-agent delegated messages were persisted into the same conversation thread as the supervisor.
- Supervisor memory reads could load those delegated messages back into the parent prompt context.

### New behavior

- Delegated sub-agent messages are tagged with sub-agent metadata (`subAgentId`, `subAgentName`, `parentAgentId`).
- Parent memory reads now filter delegated sub-agent records from supervisor conversation context.
- `conversationId` behavior remains shared (no child/derived conversation IDs introduced).

This keeps supervisor context clean in multi-turn handoff flows while preserving delegated records with metadata for observability/debugging.
