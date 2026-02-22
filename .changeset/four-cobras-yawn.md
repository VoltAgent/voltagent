---
"@voltagent/core": minor
---

Add workflow time-travel and deterministic replay APIs.

New APIs:

- `workflow.timeTravel(options)`
- `workflow.timeTravelStream(options)`
- `workflowChain.timeTravel(options)`
- `workflowChain.timeTravelStream(options)`

`timeTravel` replays a historical execution from a selected step with a new execution ID, preserving the original execution history. Replay runs can optionally override selected-step input (`inputData`), resume payload (`resumeData`), and shared workflow state (`workflowStateOverride`).

Replay lineage metadata is now persisted on workflow state records:

- `replayedFromExecutionId`
- `replayFromStepId`

New public type exports from `@voltagent/core` include `WorkflowTimeTravelOptions`.

Also adds workflow documentation and usage examples for deterministic replay in overview, suspend/resume, and streaming docs.

Adds REST API documentation for replay endpoint `POST /workflows/:id/executions/:executionId/replay`, including request/response details and both cURL and JavaScript (`fetch`) code examples for default replay and replay with overrides (`inputData`, `resumeData`, `workflowStateOverride`).
