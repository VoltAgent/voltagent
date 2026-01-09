# Execute Function API

> **The heart of every workflow step.** Learn how to use the execute function to process data, access workflow state, and control flow.

## Quick Start

Every workflow step has an `execute` function that receives a context object:

```typescript
.andThen({
  id: "my-step",
  execute: async ({ data, state, getStepData, suspend, resumeData, retryCount }) => {
    // Your logic here
    return { result: "processed" };
  }
})
```

> **Tip:** Register your workflows with a `VoltAgent` instance so suspend/resume and REST routes can locate executions:
>
> ```typescript
> import { VoltAgent } from "@voltagent/core";
> new VoltAgent({ workflows: { myWorkflow } });
> ```

## What's in the Context?

The execute function receives one parameter - a context object with these properties:

### 1. `data` - The Step's Input

This is the data flowing into your step:

- **First step**: Gets the workflow's initial input
- **Other steps**: Gets the output from the previous step

```typescript
const workflow = createWorkflowChain({
  input: z.object({ name: z.string() }),
  // ...
})
  .andThen({
    id: "step-1",
    execute: async ({ data }) => {
      console.log(data.name); // Original input
      return { ...data, step1: "done" };
    },
  })
  .andThen({
    id: "step-2",
    execute: async ({ data }) => {
      console.log(data.name); // Still there!
      console.log(data.step1); // "done" - from previous step
      return { ...data, step2: "also done" };
    },
  });
```

### 2. `state` - Workflow Information

Contains metadata about the current workflow execution:

```typescript
.andThen({
  id: "log-info",
  execute: async ({ data, state }) => {
    console.log(state.executionId);    // Unique ID for this run
    console.log(state.userId);         // Who's running it
    console.log(state.conversationId); // Conversation context
    console.log(state.input);          // Original workflow input
    console.log(state.startAt);        // When it started

    // context is a Map for custom data
    const userRole = state.context?.get("role");

    return data;
  }
})
```

### 3. `getStepData` - Access Any Previous Step

Get data from any step that has already executed:

```typescript
.andThen({
  id: "combine-results",
  execute: async ({ data, getStepData }) => {
    // Get data from a specific step
    const step1Data = getStepData("step-1");

    if (step1Data) {
      console.log(step1Data.input);  // What went INTO step-1
      console.log(step1Data.output); // What came OUT of step-1
    }

    return data;
  }
})
```

### 4. `suspend` - Pause the Workflow

Pause execution and wait for external input (like human approval):

```typescript
.andThen({
  id: "wait-for-approval",
  execute: async ({ data, suspend }) => {
    if (data.amount > 1000) {
      // This stops execution immediately
      await suspend("Manager approval required");
      // Code below never runs during suspension
    }

    return { ...data, approved: true };
  }
})
```

### 5. `resumeData` - Data from Resume

When a suspended workflow resumes, this contains the resume data:

```typescript
.andThen({
  id: "approval-step",
  execute: async ({ data, suspend, resumeData }) => {
    // Check if we're resuming
    if (resumeData) {
      // We're resuming! Use the approval decision
      return {
        ...data,
        approved: resumeData.approved,
        approvedBy: resumeData.managerId
      };
    }

    // First time through - suspend for approval
    if (data.amount > 1000) {
      await suspend("Needs approval");
    }

    // Auto-approve small amounts
    return { ...data, approved: true, approvedBy: "auto" };
  }
})
```

### 6. `retryCount` - Retry Attempt Number

If a step is configured with `retries`, this value tells you which attempt is running:

```typescript
.andThen({
  id: "fetch-user",
  retries: 2,
  execute: async ({ data, retryCount }) => {
    console.log("Attempt:", retryCount); // 0, 1, 2
    return await fetchUser(data.userId);
  }
})
```

`retryCount` also increments when retries are enabled at the workflow level:

```typescript
const workflow = createWorkflowChain({
  id: "retry-defaults",
  retryConfig: { attempts: 2, delayMs: 250 },
}).andThen({
  id: "fetch-user",
  execute: async ({ data, retryCount }) => {
    console.log("Attempt:", retryCount);
    return fetchUser(data.userId);
  },
});
```

## Complete Example

Here's a real-world example using all context properties:

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const orderWorkflow = createWorkflowChain({
  id: "order-processor",
  name: "Order Processing",
  input: z.object({
    orderId: z.string(),
    amount: z.number(),
    items: z.array(z.string()),
  }),
  result: z.object({
    status: z.string(),
    trackingNumber: z.string(),
  }),
})
  .andThen({
    id: "validate-order",
    execute: async ({ data, state }) => {
      console.log(`Processing order ${data.orderId} for user ${state.userId}`);

      const isValid = data.items.length > 0 && data.amount > 0;
      return { ...data, isValid };
    },
  })
  .andThen({
    id: "check-inventory",
    execute: async ({ data, getStepData }) => {
      // Only check if validation passed
      const validation = getStepData("validate-order");
      if (!validation?.output?.isValid) {
        return { ...data, inStock: false };
      }

      // Check inventory for each item
      const inStock = await checkInventory(data.items);
      return { ...data, inStock };
    },
  })
  .andThen({
    id: "approve-payment",
    execute: async ({ data, suspend, resumeData }) => {
      // Handle resume from suspension
      if (resumeData) {
        return {
          ...data,
          paymentApproved: resumeData.approved,
          approvedBy: resumeData.approver,
        };
      }

      // Auto-approve small amounts
      if (data.amount <= 100) {
        return { ...data, paymentApproved: true, approvedBy: "auto" };
      }

      // Suspend for manual approval
      await suspend(`Payment approval needed for $${data.amount}`);
    },
  })
  .andThen({
    id: "ship-order",
    execute: async ({ data, state }) => {
      if (!data.paymentApproved) {
        return {
          status: "cancelled",
          trackingNumber: "N/A",
        };
      }

      // Ship the order
      const tracking = await createShipment(data.orderId);

      // Log completion
      console.log(`Order ${data.orderId} shipped after ${Date.now() - state.startAt.getTime()}ms`);

      return {
        status: "shipped",
        trackingNumber: tracking,
      };
    },
  });
```

## Different Step Types

### Basic Steps (`andThen`)

Transform data or perform operations:

```typescript
.andThen({
  id: "calculate-total",
  execute: async ({ data }) => {
    const total = data.items.reduce((sum, item) => sum + item.price, 0);
    return { ...data, total };
  }
})
```

### AI Agent Steps (`andAgent`)

The task function also gets the context:

```typescript
.andAgent(
  async ({ data }) => `Summarize this order: ${JSON.stringify(data.items)}`,
  myAgent,
  { schema: z.object({ summary: z.string() }) }
)
```

### Conditional Steps (`andWhen`)

Only run when a condition is met:

```typescript
.andWhen({
  id: "apply-discount",
  condition: async ({ data }) => data.total > 50,
  step: andThen({
    id: "discount",
    execute: async ({ data }) => ({
      ...data,
      total: data.total * 0.9,
      discountApplied: true
    })
  })
})
```

### Side Effects (`andTap`)

Run code without changing the data:

```typescript
.andTap({
  id: "send-notification",
  execute: async ({ data, state }) => {
    await sendEmail(state.userId, `Order ${data.orderId} processed`);
    // Return value ignored - data passes through
  }
})
```

## Suspend & Resume Deep Dive

For human-in-the-loop workflows, suspension is key:

```typescript
.andThen({
  id: "review-step",
  execute: async ({ data, suspend, resumeData }) => {
    // Step 1: Check if we're resuming
    if (resumeData) {
      console.log("Resuming with:", resumeData);
      return { ...data, reviewed: true, reviewer: resumeData.userId };
    }

    // Step 2: Check if we need to suspend
    if (data.requiresReview) {
      // This immediately stops execution
      await suspend("Document needs review", {
        documentId: data.id,
        reason: "High risk score"
      });
      // Never reaches here during suspension
    }

    // Step 3: Continue if no suspension needed
    return { ...data, reviewed: true, reviewer: "auto" };
  }
})
```

**Important**: When resumed, the step runs again from the beginning with `resumeData` available.

For more details on suspension patterns, see [Suspend & Resume](./suspend-resume.md).

## Best Practices

### 1. Always Return New Objects

```typescript
// ✅ Good - creates new object
return { ...data, processed: true };

// ❌ Bad - mutates existing object
data.processed = true;
return data;
```

### 2. Check Step Data Exists

```typescript
const previousStep = getStepData("step-id");
if (previousStep) {
  // Safe to use previousStep.output
}
```

### 3. Use Clear Step IDs

```typescript
// ✅ Good - descriptive
id: "validate-payment";

// ❌ Bad - unclear
id: "step2";
```

### 4. Handle Errors Gracefully

```typescript
execute: async ({ data }) => {
  try {
    const result = await riskyOperation(data);
    return { ...data, result };
  } catch (error) {
    return { ...data, error: error.message, success: false };
  }
};
```

### 5. Log Important Events

```typescript
execute: async ({ data, state }) => {
  console.log(`[${state.executionId}] Processing ${data.id}`);
  const result = await process(data);
  console.log(`[${state.executionId}] Completed with status: ${result.status}`);
  return result;
};
```

## TypeScript Types

The execute function is fully type-safe:

```typescript
interface ExecuteContext<TData, TSuspendData = any, TResumeData = any> {
  data: TData;
  state: WorkflowState;
  getStepData: (stepId: string) => { input: any; output: any } | undefined;
  suspend: (reason?: string, data?: TSuspendData) => Promise<never>;
  resumeData?: TResumeData;
  retryCount?: number;
}
```

Types flow automatically through your workflow - TypeScript knows what data is available at each step!
