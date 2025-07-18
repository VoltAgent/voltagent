# Suspend & Resume

> **Pause workflows and continue them later.** Perfect for human-in-the-loop scenarios, approval workflows, and waiting for external events with full type safety.

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

## Human-in-the-Loop Patterns

The suspend & resume feature shines when you need human decisions in your workflows. Here's a realistic expense approval workflow:

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

// These are your own functions - implement based on your needs
async function validateExpense(data: any) {
  // Your validation logic here
  return { valid: true };
}

async function getEmployee(employeeId: string) {
  // Fetch from your database
  return { name: "John Doe" };
}

async function createReimbursement(data: any) {
  // Create in your system
  return { id: "reimb-789" };
}

const expenseApproval = createWorkflowChain({
  id: "expense-approval",
  name: "Expense Approval",
  input: z.object({
    employeeId: z.string(),
    amount: z.number(),
    category: z.string(),
  }),
  result: z.object({
    approved: z.boolean(),
    processedBy: z.string(),
    reimbursementId: z.string().optional(),
  }),
})
  .andThen({
    id: "validate-expense",
    execute: async ({ data }) => {
      const validation = await validateExpense(data);
      return {
        ...data,
        isValid: validation.valid,
        requiresReceipt: data.amount > 50,
      };
    },
  })
  .andThen({
    id: "manager-review",
    // Data available here includes everything from previous steps:
    // - Original input: employeeId, amount, category
    // - From validate-expense: isValid, requiresReceipt
    suspendSchema: z.object({
      employeeId: z.string(),
      employeeName: z.string(),
      amount: z.number(),
      category: z.string(),
      requiresReceipt: z.boolean(),
      validationStatus: z.string(),
    }),
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      notes: z.string().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return {
          ...data,
          approved: resumeData.approved,
          reviewedBy: resumeData.managerId,
          reviewNotes: resumeData.notes,
        };
      }

      // Auto-approve small valid expenses
      if (data.isValid && data.amount <= 100) {
        return { ...data, approved: true, reviewedBy: "auto" };
      }

      // Suspend with all data needed for UI
      const employee = await getEmployee(data.employeeId);
      await suspend("Manager approval required", {
        employeeId: data.employeeId,
        employeeName: employee.name,
        amount: data.amount,
        category: data.category,
        requiresReceipt: data.requiresReceipt,
        validationStatus: data.isValid ? "valid" : "invalid",
      });
    },
  })
  .andThen({
    id: "process-reimbursement",
    execute: async ({ data }) => {
      if (!data.approved) {
        return {
          approved: false,
          processedBy: data.reviewedBy,
        };
      }

      const reimbursement = await createReimbursement(data);
      return {
        approved: true,
        processedBy: data.reviewedBy,
        reimbursementId: reimbursement.id,
      };
    },
  });

// Run the workflow
const execution = await expenseApproval.run({
  employeeId: "emp-123",
  amount: 250,
  category: "travel",
});

// Workflow suspended - access the data for UI display
if (execution.status === "suspended") {
  const reviewData = execution.suspension.suspendData;
  console.log(reviewData);
  // {
  //   employeeId: "emp-123",
  //   employeeName: "John Doe",
  //   amount: 250,
  //   category: "travel",
  //   requiresReceipt: true,
  //   validationStatus: "valid"
  // }

  // Show this data in your approval UI (your own function)
  displayApprovalForm(reviewData);

  // After manager reviews in UI, resume with decision
  const result = await execution.resume({
    approved: true,
    managerId: "mgr-456",
    notes: "Conference travel approved",
  });
}
```

### Key Concepts

- **suspend()**: Immediately pauses the workflow at the current step
- **resumeData**: Contains the data provided when resuming (separate from original step data)
- **Re-execution**: The suspended step runs again from the beginning when resumed

## Step-Level Schemas

You can define schemas at the step level to override workflow-level schemas. This is perfect for steps that need specific resume data:

```typescript
import { Agent, createWorkflowChain } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create an AI agent to use in the workflow
const agent = new Agent({
  name: "DataExtractor",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You extract structured data from documents.",
});

const documentReview = createWorkflowChain({
  id: "document-review",
  name: "Document Review",
  input: z.object({ documentId: z.string() }),
  result: z.object({ approved: z.boolean() }),
})
  .andAgent(({ data }) => `Extract data from document ${data.documentId}`, agent, {
    schema: z.object({ extractedData: z.record(z.any()) }),
  })
  .andThen({
    id: "human-review",
    // Step-specific resume schema
    resumeSchema: z.object({
      approved: z.boolean(),
      corrections: z.record(z.any()).optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        const finalData = resumeData.corrections
          ? { ...data.extractedData, ...resumeData.corrections }
          : data.extractedData;
        return { extractedData: finalData, approved: resumeData.approved };
      }

      await suspend("Please review extracted data");
    },
  });
```

## Resume From Specific Steps

You can resume from a specific step using the `stepId` option:

```typescript
// Your functions
async function calculateRiskScore(documentId: string): Promise<number> {
  // Your risk calculation logic
  return Math.random() * 100;
}

const multiStageReview = createWorkflowChain({
  id: "multi-stage-review",
  name: "Multi-Stage Review",
  input: z.object({ documentId: z.string(), riskLevel: z.string() }),
  result: z.object({ approved: z.boolean(), reviewers: z.array(z.string()) }),
})
  .andThen({
    id: "legal-review",
    resumeSchema: z.object({ approved: z.boolean(), reviewer: z.string() }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return { ...data, legalApproved: resumeData.approved, reviewers: [resumeData.reviewer] };
      }
      if (data.riskLevel === "high") {
        await suspend("Legal review required");
      }
      return { ...data, legalApproved: true, reviewers: [] };
    },
  })
  .andThen({
    id: "risk-assessment",
    execute: async ({ data }) => {
      // This step never suspends - just processes data
      const riskScore = await calculateRiskScore(data.documentId);
      return { ...data, riskScore };
    },
  })
  .andThen({
    id: "compliance-review",
    resumeSchema: z.object({ approved: z.boolean(), reviewer: z.string() }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return {
          approved: resumeData.approved,
          reviewers: [...data.reviewers, resumeData.reviewer],
        };
      }
      if (data.riskScore > 70) {
        await suspend("Compliance review required");
      }
      return { approved: true, reviewers: data.reviewers };
    },
  });

// Scenario 1: Normal flow - resumes from where it suspended
const execution = await multiStageReview.run({ documentId: "doc-123", riskLevel: "high" });
// Suspended at legal-review
const result = await execution.resume({ approved: true, reviewer: "legal-team" });

// Scenario 2: Resume from a different step
const execution2 = await multiStageReview.run({ documentId: "doc-456", riskLevel: "high" });
// Force resume from compliance-review step instead
const result2 = await execution2.resume(
  { approved: true, reviewer: "compliance-team" },
  { stepId: "compliance-review" }
);
```

## How Suspend & Resume Works

When a workflow suspends:

1. Execution stops immediately at the current step
2. The workflow state is saved as a checkpoint
3. Already completed steps won't re-run on resume

When you resume:

1. The suspended step re-executes from the beginning
2. `data` contains the original step input
3. `resumeData` contains the new data you provided
4. The workflow continues from that point

## Schema Hierarchy

Understanding how schemas work is crucial for type safety:

### Workflow-Level vs Step-Level Schemas

1. **Workflow-level schemas** apply to all steps by default:

```typescript
createWorkflowChain({
  suspendSchema: z.object({ reason: z.string() }), // All steps use this
  resumeSchema: z.object({ approved: z.boolean() }), // All steps use this
});
```

2. **Step-level schemas** override workflow-level ones:

```typescript
.andThen({
  id: "special-step",
  resumeSchema: z.object({ specialData: z.string() }), // Overrides workflow schema
  execute: async ({ resumeData }) => {
    // resumeData has type { specialData: string }, not { approved: boolean }
  }
})
```

### When to Use Each

- **Use workflow-level schemas** when all steps share the same suspend/resume structure
- **Use step-level schemas** when specific steps need different data
- **Use neither** for simple cases - data is still passed but not type-checked

## Type-Safe Schemas

Define schemas for type-safe suspend and resume operations:

```typescript
const workflow = createWorkflowChain({
  id: "type-safe-flow",
  name: "Type-Safe Flow",
  input: z.object({ userId: z.string() }),
  result: z.object({ decision: z.string() }),

  // Workflow-level schemas (used by all steps unless overridden)
  suspendSchema: z.object({
    reason: z.string(),
    priority: z.enum(["low", "medium", "high"]),
  }),
  resumeSchema: z.object({
    decision: z.enum(["approve", "reject"]),
    comments: z.string().optional(),
  }),
}).andThen({
  id: "review",
  execute: async ({ suspend, resumeData }) => {
    if (resumeData) {
      // TypeScript knows the shape of resumeData
      return { decision: resumeData.decision };
    }

    await suspend("Review needed", {
      reason: "Manual review required",
      priority: "high",
    });
  },
});
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

## Common Patterns

### Document Review with Corrections

```typescript
const documentReview = createWorkflowChain({
  id: "doc-review",
  name: "Document Review",
  input: z.object({ documentId: z.string() }),
  result: z.object({ status: z.string() }),
})
  .andAgent(({ data }) => `Extract data from ${data.documentId}`, agent)
  .andThen({
    id: "human-review",
    resumeSchema: z.object({
      approved: z.boolean(),
      corrections: z.record(z.any()).optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        const finalData = resumeData.corrections ? { ...data, ...resumeData.corrections } : data;
        return { ...finalData, approved: resumeData.approved };
      }

      await suspend("Review extracted data");
    },
  });
```

### Scheduled Tasks

```typescript
const scheduledTask = createWorkflowChain({
  id: "scheduled-task",
  name: "Scheduled Task",
  input: z.object({ taskId: z.string() }),
  result: z.object({ completed: z.boolean() }),
})
  .andThen({
    id: "wait-until",
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return { ...data, startedAt: resumeData.timestamp };
      }

      // Suspend until specific time
      await suspend("Waiting until scheduled time");
    },
  })
  .andThen({
    id: "run-task",
    execute: async ({ data }) => {
      await runScheduledTask(data.taskId);
      return { completed: true };
    },
  });

// Resume at scheduled time
setTimeout(() => {
  execution.resume({ timestamp: Date.now() });
}, delayMs);
```

### Webhook-Driven Resume

In real applications, you need to maintain the execution reference:

```typescript
// Simple approach: Store execution in memory (for demos)
const activeExecutions = new Map();

// When starting workflow
const execution = await orderWorkflow.run({ orderId: "123" });
activeExecutions.set("123", execution);

// In your webhook handler
app.post("/webhooks/payment", async (req, res) => {
  const { orderId, status } = req.body;

  const execution = activeExecutions.get(orderId);
  if (execution) {
    await execution.resume({ paymentStatus: status });
    activeExecutions.delete(orderId);
  }

  res.send("OK");
});
```

**Note**: For production apps, you'll need persistent storage for execution references. Consider using a job queue or workflow orchestration service.

## Best Practices

### 1. Design for Re-execution

Remember that suspended steps re-run from the beginning:

```typescript
.andThen({
  id: "review",
  execute: async ({ data, suspend, resumeData }) => {
    if (resumeData) {
      // Handle resume case
      return processWithApproval(data, resumeData);
    }

    // Check if suspension needed
    if (needsReview(data)) {
      await suspend("Review required");
    }

    // Continue if no suspension needed
    return processAutomatically(data);
  },
})
```

### 2. Keep Data Minimal

- Original step data is preserved - don't repeat it
- Only pass new information when resuming
- Use clear, descriptive field names

```typescript
// Good: Only new data
await execution.resume({ approved: true, approver: "jane@co.com" });

// Bad: Repeating original data
await execution.resume({ ...originalData, approved: true });
```

### 3. Use Type-Safe Schemas

Define schemas for better developer experience:

```typescript
resumeSchema: z.object({
  approved: z.boolean(),
  approvedBy: z.string().email(),
  comments: z.string().optional(),
});
```

### 4. Handle Edge Cases

```typescript
try {
  await execution.resume(data);
} catch (error) {
  if (error.message.includes("not in suspended state")) {
    // Already resumed or completed
  }
}
```

### 5. Clear Suspension Reasons

Always provide context:

```typescript
await suspend(`Approval needed for amount $${data.amount} (exceeds $1000 limit)`);
```

## API Reference

### Configuration

```typescript
createWorkflowChain({
  // ... other config
  suspendSchema: z.object({...}),  // Optional: Type-safe suspend data
  resumeSchema: z.object({...}),    // Optional: Type-safe resume data
});

// Step-level schemas override workflow-level
.andThen({
  id: "step",
  resumeSchema: z.object({...}),   // Takes precedence
  execute: async ({ data, suspend, resumeData }) => {...}
})
```

### Suspend Function

```typescript
suspend: (reason?: string, suspendData?: any) => Promise<never>;
```

- Never returns - execution stops immediately
- Step re-executes from beginning when resumed
- `suspendData` must match schema if defined

### Resume Method

```typescript
execution.resume(data?: any, options?: { stepId?: string })
```

- **First parameter**: `data` becomes `resumeData` in the suspended step
- **Second parameter**: Optional `options` object with:
  - `stepId`: Resume from a specific step instead of the suspended one
- Original step data preserved separately
- Data must match `resumeSchema` if defined

Examples:

```typescript
// Normal resume
await execution.resume({ approved: true });

// Resume from specific step
await execution.resume({ approved: true }, { stepId: "compliance-review" });
```

### Execution Result

```typescript
interface WorkflowExecutionResult {
  workflowId: string;
  executionId: string;
  status: "completed" | "suspended" | "error";
  suspension?: {
    reason: string;
    suspendedAt: string;
    suspendedStepIndex: number;
  };
  result?: any;
  resume: (data?: any) => Promise<WorkflowExecutionResult>;
}
```

## Next Steps

1. **Explore Examples**: Check out the [human-in-the-loop example](https://github.com/VoltAgent/voltagent/tree/main/examples/with-suspend-resume)
2. **Learn about Hooks**: Use [Workflow Hooks](./hooks.md) to track suspension events
3. **Try VoltOps Console**: Visualize and manage suspended workflows at [console.voltagent.dev](https://console.voltagent.dev)
