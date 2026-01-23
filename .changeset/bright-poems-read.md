---
"@voltagent/core": patch
---

feat: workflowState + andForEach selector/map

### Neler Yeni

- `workflowState` ve `setWorkflowState` ile adımlar arasi paylasilan state eklendi (suspend/resume sonrasi da korunur).
- `andForEach` icin `items` selector ve opsiyonel `map` desteği geldi (parent data kaybolmadan iterate).

### Workflow State Kullanimi

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
