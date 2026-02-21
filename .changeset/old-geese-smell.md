---
"@voltagent/core": minor
---

Add workflow restart and crash-recovery APIs.

New APIs:

- `workflow.restart(executionId, options?)`
- `workflow.restartAllActive()`
- `workflowChain.restart(executionId, options?)`
- `workflowChain.restartAllActive()`
- `WorkflowRegistry.restartWorkflowExecution(workflowId, executionId, options?)`
- `WorkflowRegistry.restartAllActiveWorkflowRuns(options?)`

The workflow runtime now persists running checkpoints during execution, including step progress, shared workflow state, context, and usage snapshots, so interrupted runs in `running` state can be recovered deterministically.

New public types are now exported from `@voltagent/core` for consumer annotations, including `WorkflowRestartAllResult` and `WorkflowRestartCheckpoint`.

Also adds docs for restart/crash-recovery usage under workflow overview and suspend/resume docs.
