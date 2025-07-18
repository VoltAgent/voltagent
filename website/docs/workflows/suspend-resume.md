# Suspend & Resume

> **Pause workflows and continue them later.** Build human-in-the-loop workflows, wait for external events, or handle long-running processes with full type safety.

## Quick Start

Let's build a workflow that pauses for human approval before proceeding. This example shows the core suspend & resume pattern in action.

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

// A workflow that processes an order but waits for approval
const orderWorkflow = createWorkflowChain({
  id: "order-processor",
  name: "Order Processing Workflow",
  input: z.object({
    orderId: z.string(),
    amount: z.number(),
  }),
  result: z.object({
    status: z.string(),
    approvedBy: z.string().optional(),
  }),
})
  .andThen({
    id: "validate-order",
    execute: async ({ data }) => {
      console.log(`Validating order ${data.orderId} for $${data.amount}`);
      return {
        ...data,
        validated: true,
        approved: data.amount <= 1000,
        approvedBy: data.amount <= 1000 ? "auto" : undefined,
      };
    },
  })
  .andThen({
    id: "await-approval",
    execute: async ({ data, suspend, resumeData }) => {
      // Check if we're resuming with approval
      if (resumeData) {
        return { ...data, ...resumeData };
      }

      // Check if already approved
      if (data.approved) {
        return data;
      }

      // Suspend the workflow and wait for approval
      await suspend("Awaiting manager approval for high-value order");
    },
  })
  .andThen({
    id: "process-payment",
    execute: async ({ data }) => {
      console.log(`Processing payment. Approved by: ${data.approvedBy}`);
      return {
        status: "completed",
        approvedBy: data.approvedBy,
      };
    },
  });

// Start the workflow
const execution = await orderWorkflow.run({
  orderId: "ORD-123",
  amount: 5000,
});

// The workflow is now suspended
console.log(execution.status); // "suspended"
console.log(execution.suspension); // { reason: "Awaiting manager approval..." }

// Later, resume with approval data
// This becomes resumeData in the suspended step
const resumed = await execution.resume({
  approved: true,
  approvedBy: "manager@company.com",
});

console.log(resumed.result);
// { status: "completed", approvedBy: "manager@company.com" }
```

## How It Works

Suspension allows a workflow to pause execution at any point and resume later with additional data. This is perfect for:

- **Human Approval**: Wait for a manager to approve an action
- **External Events**: Wait for a webhook or payment confirmation
- **Time Delays**: Pause for hours or days before continuing
- **Resource Availability**: Wait for a resource to become available

### The Suspend Function

Every step in a workflow has access to a `suspend` function. When called, it:

1. Immediately stops execution at that point
2. Saves the current workflow state as a checkpoint
3. Stores metadata about why and where it suspended
4. Returns a suspension result to the workflow caller

**Important**: The `suspend` function NEVER returns to the calling code. When you call `suspend`, the step execution stops immediately.

### How Resume Works

When you resume a workflow:

1. The suspended step is re-executed from the beginning
2. The original step data is preserved in `data`
3. Resume input is provided separately in `resumeData`
4. The step can access both original and resume data

```typescript
.andThen({
  id: "my-step",
  execute: async ({ data, suspend, resumeData }) => {
    console.log("Step starting with data:", data);

    // Check if we're resuming (resumeData will be present)
    if (resumeData) {
      console.log("Resumed with:", resumeData);
      // Merge original data with resume data
      return {
        ...data,
        approved: resumeData.approved,
        approvedBy: resumeData.approvedBy
      };
    }

    // Initial execution - check if we should suspend
    if (!data.approved) {
      // This will immediately stop execution
      await suspend("Waiting for approval");
      // Execution stops here - the code below won't run
    }

    // This only runs if already approved
    console.log("Already approved, continuing...");
    return data;
  },
})
```

**Key points:**

- `data` always contains the original step input
- `resumeData` is only present when resuming (after suspension)
- The step is fully re-executed, allowing you to handle both cases
- Resume data does NOT replace the original data - they are separate

### Understanding Execution Flow

Let's trace through exactly what happens during suspend and resume:

```typescript
const workflow = createWorkflowChain({
  id: "execution-flow-demo",
  input: z.object({ value: z.number() }),
  result: z.object({ final: z.number() }),
})
  .andThen({
    id: "step-1",
    execute: async ({ data }) => {
      console.log("Step 1: value =", data.value);
      return { ...data, step1Done: true };
    },
  })
  .andThen({
    id: "step-2",
    execute: async ({ data, suspend, resumeData }) => {
      console.log("Step 2 starting, data:", data);

      // Check if we're resuming
      if (resumeData) {
        console.log("Resuming with:", resumeData);
        return { ...data, ...resumeData, step2Done: true };
      }

      if (!data.approved) {
        console.log("Suspending...");
        await suspend("Need approval");
        // Never reaches here during initial run
      }

      console.log("Step 2 continuing with approval");
      return { ...data, step2Done: true };
    },
  })
  .andThen({
    id: "step-3",
    execute: async ({ data }) => {
      console.log("Step 3: All done!");
      return { final: data.value * 2 };
    },
  });

// First execution:
const execution = await workflow.run({ value: 5 });
// Output:
// Step 1: value = 5
// Step 2 starting, data: { value: 5, step1Done: true }
// Suspending...
// [Workflow suspends - no more output]

// Resume with approval:
const result = await execution.resume({
  approved: true,
});
// Output:
// Step 2 starting, data: { value: 5, step1Done: true }
// Resuming with: { approved: true }
// Step 3: All done!
// Result: { final: 10 }
```

Key points:

1. When suspended, execution stops immediately
2. Already completed steps (step-1) are NOT re-executed on resume
3. The suspended step (step-2) is re-executed entirely with new input
4. Subsequent steps (step-3) execute normally after the resumed step completes

### Type-Safe Suspension

Add type safety to your suspend & resume operations using Zod schemas. This ensures data integrity when workflows are paused and resumed.

```typescript
const workflow = createWorkflowChain({
  id: "type-safe-suspend",
  name: "Type-Safe Suspension",
  input: z.object({ userId: z.string() }),
  result: z.object({ decision: z.string() }),

  // Define what data can be provided during suspension
  suspendSchema: z.object({
    reason: z.string(),
    priority: z.enum(["low", "medium", "high"]),
  }),

  // Define what data must be provided during resume
  resumeSchema: z.object({
    decision: z.enum(["approve", "reject"]),
    comments: z.string().optional(),
  }),
}).andThen({
  id: "review-step",
  execute: async ({ data, suspend, resumeData }) => {
    // Check if we're resuming
    if (resumeData) {
      // TypeScript knows resumeData matches resumeSchema
      return { decision: resumeData.decision };
    }

    // Suspend with metadata (TypeScript enforces the schema)
    await suspend("Manager review required", {
      reason: "Manager review required",
      priority: "high", // Type-safe enum
    });
  },
});
```

## Working with Suspended Workflows

### Finding Suspended Workflows

Use the workflow registry to query suspended workflows:

```typescript
import { WorkflowRegistry } from "@voltagent/core";

const registry = WorkflowRegistry.getInstance();

// Get all suspended workflows
const suspended = await registry.getSuspendedWorkflows();

// Get suspended workflows of a specific type
const pendingApprovals = await registry.getSuspendedWorkflows({
  workflowId: "order-processor",
});

// Check a specific execution
const execution = await registry.getWorkflowExecution("order-processor", executionId);

if (execution.status === "suspended") {
  console.log(`Suspended at step: ${execution.suspension.stepIndex}`);
  console.log(`Reason: ${execution.suspension.reason}`);
}
```

### Resume Patterns

There are several ways to resume a workflow:

**1. Direct Resume**

Resume immediately with data:

```typescript
const result = await execution.resume({
  approved: true,
  notes: "Looks good",
});
```

**2. Conditional Resume**

Resume based on external conditions:

```typescript
// Check if conditions are met before resuming
const execution = await registry.getWorkflowExecution(workflowId, executionId);

if (execution.suspension.reason === "payment_pending") {
  const paymentConfirmed = await checkPaymentStatus(execution.input.orderId);

  if (paymentConfirmed) {
    // Get the full execution object to access the resume method
    const fullExecution = await workflow.run(
      { orderId: execution.input.orderId },
      {
        executionId: executionId,
        resume: true,
      }
    );

    await fullExecution.resume({
      paymentStatus: "confirmed",
    });
  }
}
```

**3. Batch Resume**

Resume multiple workflows at once:

```typescript
const suspendedWorkflows = await registry.getSuspendedWorkflows({
  workflowId: "daily-report",
});

// Resume all at midnight
for (const execution of suspendedWorkflows) {
  await workflow.resume(execution.id, {
    resumeTime: new Date().toISOString(),
  });
}
```

## VoltOps Console Integration

The VoltOps Console provides a visual interface for managing suspended workflows:

![VoltOps Suspend Resume UI](https://cdn.voltagent.dev/docs/suspend-resume-demo.gif)

### Key Features

- **Visual Status**: See which workflows are suspended and why
- **Resume Interface**: Resume workflows directly from the UI
- **Suspension History**: Track all suspend/resume events
- **Bulk Operations**: Resume multiple workflows at once

### Suspend Modal

When a workflow has a `suspendSchema`, the console shows a form to collect suspension data:

![VoltOps Suspend Modal](https://cdn.voltagent.dev/docs/suspend-modal-demo.gif)

### Resume Modal

When resuming, the console shows:

- The current step's input data
- A form based on `resumeSchema` (if defined)
- The ability to modify data before resuming

![VoltOps Resume Modal](https://cdn.voltagent.dev/docs/resume-modal-demo.gif)

## Advanced Patterns

### Human-in-the-Loop Workflows

Build workflows that require human decisions at key points:

```typescript
const documentWorkflow = createWorkflowChain({
  id: "document-processor",
  name: "Document Processing",
  input: z.object({
    documentId: z.string(),
    documentType: z.string(),
  }),
  result: z.object({
    status: z.string(),
    extractedData: z.record(z.any()),
  }),
})
  .andAgent(({ data }) => `Extract key information from document ${data.documentId}`, aiAgent, {
    schema: z.object({ extractedData: z.record(z.any()) }),
  })
  .andThen({
    id: "human-review",
    execute: async ({ data, suspend, resumeData }) => {
      // Check if we're resuming with review data
      if (resumeData) {
        // Apply corrections if provided
        if (resumeData.corrections) {
          return {
            ...data,
            extractedData: { ...data.extractedData, ...resumeData.corrections },
            reviewedBy: resumeData.userId,
          };
        }
        return { ...data, reviewedBy: resumeData.userId };
      }

      // Suspend and wait for human verification
      await suspend("Human verification required", {
        extractedData: data.extractedData,
      });
    },
  })
  .andThen({
    id: "save-to-database",
    execute: async ({ data }) => {
      // Save verified data
      await saveDocument(data.documentId, data.extractedData);
      return { status: "completed", extractedData: data.extractedData };
    },
  });
```

### Long-Running Workflows

Handle workflows that span hours or days:

```typescript
const campaignWorkflow = createWorkflowChain({
  id: "email-campaign",
  name: "Email Campaign",
  input: z.object({
    campaignId: z.string(),
    recipients: z.array(z.string()),
  }),
  result: z.object({
    sent: z.number(),
    opened: z.number(),
  }),
})
  .andThen({
    id: "send-batch",
    execute: async ({ data }) => {
      // Send first batch
      const sent = await sendEmails(data.recipients.slice(0, 100));
      return { ...data, sent, remaining: data.recipients.slice(100) };
    },
  })
  .andThen({
    id: "wait-for-opens",
    execute: async ({ data, suspend, resumeData }) => {
      // Check if we're resuming with stats
      if (resumeData) {
        return { ...data, ...resumeData };
      }

      // Suspend for 24 hours to collect open rates
      await suspend("Collecting email open statistics", {
        waitUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    },
  })
  .andWhen({
    id: "send-followup",
    condition: ({ data }) => data.opened < 50,
    step: andAgent(({ data }) => "Generate follow-up email for low engagement", aiAgent, {
      schema: z.object({ followUpContent: z.string() }),
    }),
  });

// Resume after 24 hours with stats
setTimeout(
  async () => {
    const execution = await registry.getWorkflowExecution("email-campaign", executionId);

    // Only provide the new stats - the step already has access to previous data
    await execution.resume({
      opened: 42,
      clicked: 15,
    });
  },
  24 * 60 * 60 * 1000
);
```

### Event-Driven Resume

Resume workflows based on external events:

```typescript
// Webhook handler
app.post("/webhooks/payment", async (req, res) => {
  const { orderId, status } = req.body;

  // Find suspended workflow waiting for this payment
  const suspended = await registry.getSuspendedWorkflows({
    workflowId: "order-processor",
  });

  const waiting = suspended.find((exec) => exec.input.orderId === orderId);

  if (waiting) {
    await orderWorkflow.resume(waiting.id, {
      paymentStatus: status,
      paymentTime: new Date().toISOString(),
    });
  }

  res.status(200).send("OK");
});
```

## Best Practices

### 1. Design Steps for Re-execution

Since suspended steps are re-executed from the beginning, design them to handle both initial and resumed execution:

```typescript
.andThen({
  id: "process-order",
  execute: async ({ data, suspend, resumeData }) => {
    // Check if we're resuming after manual review
    if (resumeData) {
      // Process with manual approval
      const result = await processOrder(data.orderId);
      return { ...data, processed: true, result, manuallyApproved: true };
    }

    // Validate order
    const isValid = await validateOrder(data.orderId);
    if (!isValid) {
      await suspend("Order validation failed - manual review needed");
    }

    // Process the order (validation passed)
    const result = await processOrder(data.orderId);
    return { ...data, processed: true, result };
  },
})
```

### 2. Keep Resume Data Minimal

Since the original step data is preserved, only pass the new information when resuming:

```typescript
// Get the suspended execution
const execution = await registry.getWorkflowExecution(workflowId, executionId);

// Resume with only the new data needed
await execution.resume({
  approved: true,
  approver: "manager@example.com",
});
// The step already has access to all original data
```

### 3. Always Provide Clear Suspension Reasons

Help users understand why a workflow is paused:

```typescript
await suspend("Manager approval required for orders over $5000", {
  orderAmount: data.amount,
  threshold: 5000,
});
```

### 2. Use Schemas for Type Safety

Define clear contracts for suspend and resume data:

```typescript
suspendSchema: z.object({
  reason: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  metadata: z.record(z.any()).optional()
}),

resumeSchema: z.object({
  approved: z.boolean(),
  approvedBy: z.string().email(),
  comments: z.string().optional()
})
```

### 3. Handle Resume Errors

Always handle potential resume failures:

```typescript
try {
  const result = await workflow.resume(executionId, resumeData);
} catch (error) {
  if (error.message.includes("not in suspended state")) {
    // Workflow already resumed or completed
  } else if (error.message.includes("validation")) {
    // Resume data doesn't match schema
  }
}
```

### 4. Set Suspension Timeouts

Consider adding timeouts for suspended workflows:

```typescript
.andThen({
  id: "timed-suspension",
  execute: async ({ data, suspend, state }) => {
    // Set a timeout in userContext
    state.userContext.set("suspendTimeout", Date.now() + 3600000); // 1 hour

    const result = await suspend("Awaiting response");

    return result;
  },
})
```

### 5. Track Suspension Metrics

Monitor how long workflows stay suspended:

```typescript
const execution = await registry.getWorkflowExecution(workflowId, executionId);

if (execution.suspension) {
  const suspendedAt = new Date(execution.suspension.suspendedAt);
  const duration = Date.now() - suspendedAt.getTime();

  console.log(`Workflow suspended for ${duration / 1000} seconds`);
}
```

## API Reference

### Workflow Configuration

```typescript
createWorkflowChain({
  // ... other config

  // Optional: Define data structure for suspension
  suspendSchema: z.object({
    reason: z.string(),
    // Add any fields you need during suspension
  }),

  // Optional: Define required data for resume
  resumeSchema: z.object({
    decision: z.string(),
    // Add fields required to continue
  }),
});
```

### Suspend Function

Available in every step's execute function:

```typescript
suspend: (reason?: string, suspendData?: any) => Promise<never>;
```

**Important characteristics:**

- Returns `Promise<never>` because it never resolves
- Immediately stops execution when called
- The step will be re-executed from the beginning when resumed
- Optional `suspendData` must match `suspendSchema` if defined

```typescript
execute: async ({ data, suspend, resumeData }) => {
  // Check if we're resuming
  if (resumeData) {
    // Handle resume - merge data as needed
    return { ...data, ...resumeData, completed: true };
  }

  // Simple suspend (no suspendSchema)
  if (!data.isReady) {
    await suspend("Waiting for external event");
    // ❌ This line will NEVER execute during suspension
  }

  // With suspendSchema (reason first, then typed data):
  if (!data.approved) {
    await suspend("Approval required", {
      currentState: data.state,
      priority: "high",
    });
    // ❌ This line will NEVER execute during suspension
  }

  // ✅ This code only runs if conditions above were false
  return { ...data, completed: true };
};
```

**Execute Context Type:**

```typescript
interface WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA> {
  data: DATA; // Step input data (from checkpoint when resuming)
  suspend: Function; // Suspend function
  resumeData?: RESUME_DATA; // Present only when resuming
  state: WorkflowState; // Workflow state
  getStepData: Function; // Get data from other steps
}
```

### Resume Method

```typescript
// Resume a suspended workflow execution
const result = await execution.resume(data?: any);
```

**Key points:**

- `data` is optional - if not provided, the suspended step uses its original input
- If provided, `data` becomes the complete input for the suspended step
- The data should include both original workflow data and any new fields
- Must match `resumeSchema` if defined in the workflow

```typescript
// Example: Resume without data (uses original step input)
const result = await execution.resume();

// Example: Resume with new data
const result = await execution.resume({
  ...originalData, // Include original workflow data
  approved: true, // Add new fields
  approvedBy: "admin",
});
```

### Execution Result

```typescript
interface WorkflowExecutionResult {
  workflowId: string;
  executionId: string;
  status: "completed" | "suspended" | "error";

  // Present when status is "suspended"
  suspension?: {
    reason: string;
    suspendedAt: string;
    suspendedStepIndex: number;
    // ... your custom suspension data
  };

  // Present when status is "completed"
  result?: any;

  // Methods
  resume: (data: any) => Promise<WorkflowExecutionResult>;
}
```

## Next Steps

1. **Explore Examples**: Check out the [human-in-the-loop example](https://github.com/VoltAgent/voltagent/tree/main/examples/with-suspend-resume)
2. **Learn about Hooks**: Use [Workflow Hooks](./hooks.md) to track suspension events
3. **Try VoltOps Console**: Visualize and manage suspended workflows at [console.voltagent.dev](https://console.voltagent.dev)
