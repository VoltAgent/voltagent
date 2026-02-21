---
"@voltagent/core": minor
---

Add `startAsync()` to workflow and workflow chain APIs for fire-and-forget execution.

`startAsync()` starts a workflow run in the background and returns `{ executionId, workflowId, startedAt }` immediately. The run keeps existing execution semantics, respects provided `executionId`, and persists terminal states in memory for later inspection.
