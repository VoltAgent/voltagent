---
"@voltagent/core": patch
---

feat: add suspend/resume functionality for workflows

**Workflows can now be paused and resumed!** Perfect for human-in-the-loop processes, waiting for external events, or managing long-running operations.

## Two Ways to Suspend

### 1. Internal Suspension (Inside Steps)

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

// Run and resume
const execution = await approvalWorkflow.run({ item: "New laptop" });
const result = await execution.resume({ approved: true });
```

### 2. External Suspension (From Outside)

```typescript
import { createSuspendController } from "@voltagent/core";

// Create controller
const controller = createSuspendController();

// Run workflow with controller
const execution = await workflow.run(input, {
  suspendController: controller,
});

// Pause from outside (e.g., user clicks pause)
controller.suspend("User paused workflow");

// Resume later
if (execution.status === "suspended") {
  const result = await execution.resume();
}
```

## Key Features

- ⏸️ **Internal suspension** with `await suspend()` inside steps
- 🎮 **External control** with `createSuspendController()`
- 📝 **Type-safe resume data** with schemas
- 💾 **State persists** across server restarts
- 🚀 **Simplified API** - just pass `suspendController`, no need for separate `signal`

📚 **For detailed documentation: [https://voltagent.dev/docs/workflows/suspend-resume](https://voltagent.dev/docs/workflows/suspend-resume)**
