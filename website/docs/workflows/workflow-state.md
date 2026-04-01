# Workflow State

> Shared, mutable state available to every step in a workflow run. Use it for cross-step context without mutating the main data flow.

## Initialize State

Provide an initial state when you run the workflow:

```ts
const result = await workflow.run(
  { userId: "user-123" },
  {
    workflowState: {
      plan: "pro",
    },
  }
);
```

## Read and Update

`workflowState` is available on every step context, and `setWorkflowState` lets you update it:

```ts
createWorkflowChain({
  id: "state-demo",
  input: z.object({ userId: z.string() }),
})
  .andThen({
    id: "cache-user",
    execute: async ({ data, setWorkflowState }) => {
      setWorkflowState((previous) => ({
        ...previous,
        userId: data.userId,
      }));
      return data;
    },
  })
  .andThen({
    id: "use-cache",
    execute: async ({ workflowState }) => {
      return { cachedUserId: workflowState.userId };
    },
  });
```

## Suspend and Resume

Workflow state is stored in suspension checkpoints and restored on resume. You do not need to rehydrate it manually.

## REST API

You can pass workflow state via the REST execute or stream endpoints:

```bash
curl -X POST http://localhost:3141/workflows/state-demo/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "userId": "user-123" },
    "options": { "workflowState": { "plan": "pro" } }
  }'
```
