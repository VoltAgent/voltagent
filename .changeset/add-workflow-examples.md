---
"@voltagent/core": patch
---

Add separate workflow examples demonstrating both APIs:

- `with-workflow`: Uses `createWorkflow` functional API with step functions as arguments
- `with-workflow-chain`: Uses `createWorkflowChain` fluent chaining API

Both examples now demonstrate `workflowState` and `setWorkflowState` for persisting data across steps.
