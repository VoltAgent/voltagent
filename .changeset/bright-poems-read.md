---
"@voltagent/core": patch
---

feat: workflowState + andForEach selector/map

### What's New

- `workflowState` and `setWorkflowState` add shared state across steps (preserved after suspend/resume).
- `andForEach` now supports an `items` selector and optional `map` (iterate without losing parent data).

### Workflow State Usage

```ts
const result = await workflow.run(
  { userId: "user-123" },
  {
    workflowState: {
      plan: "pro",
    },
  }
);

createWorkflowChain({
  id: "state-demo",
  input: z.object({ userId: z.string() }),
})
  .andThen({
    id: "cache-user",
    execute: async ({ data, setWorkflowState }) => {
      setWorkflowState((prev) => ({
        ...prev,
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

### andForEach Selector + Map

```ts
createWorkflowChain({
  id: "batch-process",
  input: z.object({
    label: z.string(),
    values: z.array(z.number()),
  }),
}).andForEach({
  id: "label-items",
  items: ({ data }) => data.values,
  map: ({ data }, item) => ({ label: data.label, value: item }),
  step: andThen({
    id: "format",
    execute: async ({ data }) => `${data.label}:${data.value}`,
  }),
});
```
