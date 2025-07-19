# Suspend & Resume

> Pause workflows and continue them later. Perfect for human approvals, external events, or any async operation that takes time.

## Quick Start

The simplest suspend & resume example:

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const simpleApproval = createWorkflowChain({
  id: "simple-approval",
  name: "Simple Approval",
  input: z.object({ item: z.string() }),
  result: z.object({ approved: z.boolean() }),
}).andThen({
  id: "wait-for-approval",
  execute: async ({ data, suspend, resumeData }) => {
    // If we're resuming, return the decision
    if (resumeData) {
      return { approved: resumeData.approved };
    }

    // Otherwise, suspend and wait
    await suspend("Waiting for approval");
  },
});

// Run the workflow - it will suspend
const execution = await simpleApproval.run({ item: "New laptop" });
console.log(execution.status); // "suspended"

// Later, resume with a decision
const result = await execution.resume({ approved: true });
console.log(result.result); // { approved: true }
```

## How It Works

When a workflow suspends:

1. Current state is saved
2. Workflow status becomes "suspended"
3. You get back an execution object with a `resume()` method
4. Later, call `resume()` with new data to continue

## Using Schemas for Type Safety

Define what data you expect when resuming:

```typescript
const approvalWorkflow = createWorkflowChain({
  id: "document-approval",
  name: "Document Approval",
  input: z.object({
    documentId: z.string(),
    authorId: z.string(),
  }),
  // Define what resume() accepts
  resumeSchema: z.object({
    approved: z.boolean(),
    reviewerId: z.string(),
    comments: z.string().optional(),
  }),
  result: z.object({
    status: z.enum(["approved", "rejected"]),
    reviewedBy: z.string(),
  }),
}).andThen({
  id: "review-document",
  execute: async ({ data, suspend, resumeData }) => {
    // resumeData is fully typed!
    if (resumeData) {
      return {
        status: resumeData.approved ? "approved" : "rejected",
        reviewedBy: resumeData.reviewerId,
      };
    }

    // Suspend for review
    await suspend("Document needs review");
  },
});

// TypeScript knows exactly what resume() expects
const result = await execution.resume({
  approved: true,
  reviewerId: "mgr-123",
  comments: "Looks good",
});
```

## Step-Level Resume Schemas

Different steps can expect different resume data:

```typescript
const multiStepApproval = createWorkflowChain({
  id: "multi-approval",
  input: z.object({ amount: z.number() }),
  // Default resume schema
  resumeSchema: z.object({ continue: z.boolean() }),
})
  .andThen({
    id: "manager-approval",
    // This step needs manager-specific data
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return { ...data, managerApproved: resumeData.approved };
      }
      await suspend("Needs manager approval");
    },
  })
  .andThen({
    id: "finance-approval",
    // This step needs finance-specific data
    resumeSchema: z.object({
      approved: z.boolean(),
      financeId: z.string(),
      budgetCode: z.string(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return {
          ...data,
          financeApproved: resumeData.approved,
          budgetCode: resumeData.budgetCode,
        };
      }
      if (data.amount > 1000) {
        await suspend("Needs finance approval");
      }
      return data;
    },
  });
```

## Practical Example: User Verification

```typescript
const userVerification = createWorkflowChain({
  id: "verify-user",
  input: z.object({
    userId: z.string(),
    email: z.string().email(),
  }),
  suspendSchema: z.object({
    verificationCode: z.string(),
    expiresAt: z.string(),
  }),
  resumeSchema: z.object({
    code: z.string(),
  }),
  result: z.object({
    verified: z.boolean(),
    verifiedAt: z.string().optional(),
  }),
})
  .andThen({
    id: "send-verification",
    execute: async ({ data, suspend }) => {
      const code = Math.random().toString(36).substring(2, 8);
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      // Send email (your implementation)
      await sendEmail(data.email, `Your code: ${code}`);

      // Suspend with the code for later verification
      await suspend("Waiting for verification", {
        verificationCode: code,
        expiresAt,
      });
    },
  })
  .andThen({
    id: "verify-code",
    execute: async ({ data, resumeData, suspendData }) => {
      // suspendData contains what was saved during suspend
      if (new Date(suspendData.expiresAt) < new Date()) {
        return { verified: false };
      }

      if (resumeData.code === suspendData.verificationCode) {
        return {
          verified: true,
          verifiedAt: new Date().toISOString(),
        };
      }

      return { verified: false };
    },
  });

// Usage
const execution = await userVerification.run({
  userId: "user-123",
  email: "user@example.com",
});

// Email sent, workflow suspended
console.log(execution.status); // "suspended"

// User enters code from email
const result = await execution.resume({ code: "abc123" });
console.log(result.result); // { verified: true, verifiedAt: "..." }
```

## Resume From Specific Steps

Skip ahead or go back to any step when resuming:

```typescript
const reviewWorkflow = createWorkflowChain({
  id: "multi-review",
  input: z.object({ docId: z.string() }),
})
  .andThen({
    id: "step-1-legal",
    resumeSchema: z.object({ approved: z.boolean() }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) return { ...data, legal: resumeData.approved };
      await suspend("Legal review needed");
    },
  })
  .andThen({
    id: "step-2-finance",
    resumeSchema: z.object({ approved: z.boolean() }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) return { ...data, finance: resumeData.approved };
      await suspend("Finance review needed");
    },
  })
  .andThen({
    id: "step-3-final",
    execute: async ({ data }) => {
      return { approved: data.legal && data.finance };
    },
  });

// Normal resume - continues from suspended step
const exec = await reviewWorkflow.run({ docId: "doc-123" });
await exec.resume({ approved: true }); // Resumes at step-1-legal

// Skip to different step
const exec2 = await reviewWorkflow.run({ docId: "doc-456" });
await exec2.resume(
  { approved: true },
  { stepId: "step-2-finance" } // Jump directly to finance review
);
```

## Key Concepts

### What Happens During Suspend?

1. Workflow pauses at current step
2. State is saved automatically
3. You get an execution object back
4. Call `resume()` when ready to continue

### What Happens During Resume?

1. The suspended step runs again from the start
2. `resumeData` contains your new data
3. Workflow continues with next steps

### Important Variables

- `data` - The accumulated data from all previous steps
- `suspend` - Function to pause the workflow
- `resumeData` - Data provided when resuming (undefined on first run)
- `suspendData` - Data that was saved during suspension

## Common Patterns

### Auto-Approve Pattern

```typescript
.andThen({
  id: "approval",
  execute: async ({ data, suspend, resumeData }) => {
    if (resumeData) {
      return { approved: resumeData.approved };
    }

    // Auto-approve small amounts
    if (data.amount < 100) {
      return { approved: true };
    }

    // Otherwise suspend for manual approval
    await suspend("Manual approval required");
  }
})
```

### Timeout Pattern

```typescript
.andThen({
  id: "wait-for-payment",
  suspendSchema: z.object({
    orderId: z.string(),
    expiresAt: z.string()
  }),
  resumeSchema: z.object({
    paid: z.boolean()
  }),
  execute: async ({ data, suspend, resumeData, suspendData }) => {
    if (resumeData) {
      // Check if expired
      if (new Date() > new Date(suspendData.expiresAt)) {
        return { status: "expired" };
      }
      return { status: resumeData.paid ? "completed" : "cancelled" };
    }

    await suspend("Waiting for payment", {
      orderId: data.orderId,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
    });
  }
})
```

## Best Practices

### 1. Always Check resumeData First

```typescript
execute: async ({ data, suspend, resumeData }) => {
  if (resumeData) {
    // Handle resume case
    return { ...data, approved: resumeData.approved };
  }

  // Normal execution
  await suspend("Needs approval");
};
```

### 2. Use Clear Schema Names

```typescript
resumeSchema: z.object({
  approved: z.boolean(), // Not just "value"
  approvedBy: z.string(), // Not just "user"
  rejectionReason: z.string(), // Not just "reason"
});
```

### 3. Handle Timeouts

```typescript
if (resumeData) {
  const expired = new Date() > new Date(suspendData.expiresAt);
  if (expired) {
    return { status: "timeout" };
  }
}
```

## Quick Reference

### Functions

- `suspend(reason?, data?)` - Pause workflow
- `execution.resume(data?, options?)` - Continue workflow

### Key Parameters

- `data` - Accumulated data from all steps
- `resumeData` - Data provided when resuming
- `suspendData` - Data saved during suspension

### Resume Options

```typescript
// Resume from suspended step
await execution.resume({ approved: true });

// Resume from specific step
await execution.resume({ approved: true }, { stepId: "step-2" });
```

## External Suspension

You can also pause workflows from outside using `createSuspendController`:

```typescript
import { createWorkflowChain, createSuspendController } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "long-process",
  name: "Long Process",
  input: z.object({ items: z.number() }),
  result: z.object({ processed: z.number() }),
}).andThen({
  id: "process-items",
  execute: async ({ data }) => {
    // Simulate long processing
    for (let i = 0; i < data.items; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`Processed ${i + 1}/${data.items}`);
    }
    return { processed: data.items };
  },
});

// Create controller to control the workflow externally
const controller = createSuspendController();

// Run workflow with the controller
const execution = await workflow.run({ items: 10 }, { suspendController: controller });

// Pause from outside (e.g., when user clicks pause button)
setTimeout(() => {
  controller.suspend("User clicked pause");
}, 3000);

// Check the result
if (execution.status === "suspended") {
  console.log("Paused:", execution.suspension?.reason);
  // Resume later
  const result = await execution.resume();
}
```

### UI Integration Example

```typescript
class WorkflowManager {
  private controller = createSuspendController();

  async start(workflow: any, input: any) {
    return workflow.run(input, {
      suspendController: this.controller,
    });
  }

  pause(reason?: string) {
    this.controller.suspend(reason || "User paused");
  }

  isPaused() {
    return this.controller.isSuspended();
  }
}

// In your UI
const manager = new WorkflowManager();
const execution = await manager.start(myWorkflow, input);

// Pause button handler
onPauseClick(() => {
  manager.pause("User clicked pause button");
});
```

## Next Steps

- Learn about [Workflow Schemas](./schemas.md) for type safety
- Explore [Step Types](./steps/and-then.md) that support suspension
- Try the [VoltOps Console](https://console.voltagent.dev) to manage suspended workflows
