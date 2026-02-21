---
"@voltagent/core": minor
---

Add workflow restart and crash-recovery APIs.

New APIs:

- `workflow.restart(executionId, options?)`
- `workflow.restartAllActive(options?)`
- `workflowChain.restart(executionId, options?)`
- `workflowChain.restartAllActive(options?)`
- `WorkflowRegistry.restartWorkflowExecution(workflowId, executionId, options?)`
- `WorkflowRegistry.restartAllActiveWorkflowRuns(options?)`

The workflow runtime now persists running checkpoints during execution, including step progress, shared workflow state, context, and usage snapshots, so interrupted runs in `running` state can be recovered deterministically.

Also adds docs for restart/crash-recovery usage under workflow overview and suspend/resume docs.
