---
"@voltagent/core": patch
---

feat: add suspend/resume functionality for workflows

**Workflows can now be paused and resumed!** Perfect for human-in-the-loop processes, waiting for external events, or managing long-running operations.

## Quick Example

```typescript
const approvalWorkflow = createWorkflowChain({
  id: "simple-approval",
  name: "Simple Approval",
  input: z.object({ item: z.string() }),
  result: z.object({ approved: z.boolean() }),
}).andThen({
  id: "wait-for-approval",
  execute: async ({ data, suspend, resumeData }) => {
    // If resuming, return the decision
    if (resumeData) {
      return { approved: resumeData.approved };
    }

    // Otherwise suspend and wait
    await suspend("Waiting for approval");
  },
});

// Run the workflow - it will suspend
const execution = await approvalWorkflow.run({ item: "New laptop" });
console.log(execution.status); // "suspended"

// Later, resume with a decision
const result = await execution.resume({ approved: true });
console.log(result.result); // { approved: true }
```

## Key Features

- ⏸️ **Pause workflows** inside any step with `await suspend()`
- ▶️ **Resume with data** using `execution.resume(data)`
- 📝 **Type-safe resume data** with `resumeSchema`
- 💾 **State persists** across server restarts

📚 **For detailed documentation and examples: [https://voltagent.dev/docs/workflows/suspend-resume](https://voltagent.dev/docs/workflows/suspend-resume)**
