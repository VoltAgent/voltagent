---
"@voltagent/core": minor
---

feat: add workflow execution primitives (`bail`, `abort`, `getStepResult`, `getInitData`)

### What's New

Step execution context now includes four new primitives:

- `bail(result?)`: complete the workflow early with a custom final result
- `abort()`: cancel the workflow immediately
- `getStepResult(stepId)`: get a prior step output directly (returns `null` if not available)
- `getInitData()`: get the original workflow input (stable across resume paths)

These primitives are available in all step contexts, including nested step flows.

### Example: Early Complete with `bail`

```ts
const workflow = createWorkflowChain({
  id: "bail-demo",
  input: z.object({ amount: z.number() }),
  result: z.object({ status: z.string() }),
})
  .andThen({
    id: "risk-check",
    execute: async ({ data, bail }) => {
      if (data.amount > 10_000) {
        bail({ status: "rejected" });
      }
      return { status: "approved" };
    },
  })
  .andThen({
    id: "never-runs-on-bail",
    execute: async () => ({ status: "approved" }),
  });
```

### Example: Cancel with `abort`

```ts
const workflow = createWorkflowChain({
  id: "abort-demo",
  input: z.object({ requestId: z.string() }),
  result: z.object({ done: z.boolean() }),
})
  .andThen({
    id: "authorization",
    execute: async ({ abort }) => {
      abort(); // terminal status: cancelled
    },
  })
  .andThen({
    id: "never-runs-on-abort",
    execute: async () => ({ done: true }),
  });
```

### Example: Use `getStepResult` + `getInitData`

```ts
const workflow = createWorkflowChain({
  id: "introspection-demo",
  input: z.object({ userId: z.string(), value: z.number() }),
  result: z.object({ total: z.number(), userId: z.string() }),
})
  .andThen({
    id: "step-1",
    execute: async ({ data }) => ({ partial: data.value + 1 }),
  })
  .andThen({
    id: "step-2",
    execute: async ({ getStepResult, getInitData }) => {
      const s1 = getStepResult<{ partial: number }>("step-1");
      const init = getInitData();

      return {
        total: (s1?.partial ?? 0) + init.value,
        userId: init.userId,
      };
    },
  });
```
