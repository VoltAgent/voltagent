---
sidebar_label: "Hooks"
---

# Workflow Hooks

> Run code at specific moments in your workflow. Perfect for logging, monitoring, and debugging.

## Quick Start

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "order-processing",
  input: z.object({ orderId: z.string(), amount: z.number() }),
  hooks: {
    onStart: async (state) => {
      console.log(`Processing order ${state.data.orderId}`);
    },
    onEnd: async (state) => {
      if (state.status === "completed") {
        console.log(`Order ${state.data.orderId} completed!`);
      } else {
        console.error(`Order failed: ${state.error}`);
      }
    },
  },
})
  .andThen({
    id: "validate-order",
    execute: async ({ data }) => ({ ...data, validated: true }),
  })
  .andThen({
    id: "charge-payment",
    execute: async ({ data }) => ({ ...data, charged: true }),
  });

await workflow.run({ orderId: "123", amount: 99.99 });
// Console output:
// Processing order 123
// Order 123 completed!
```

## The Four Hooks

### 1. onStart

Runs once when workflow begins:

```typescript
onStart: async (state) => {
  // state.data = initial input
  // state.executionId = unique run ID
  await logger.info("Workflow started", {
    workflowId: state.workflowId,
    executionId: state.executionId,
  });
};
```

### 2. onEnd

Runs once when workflow finishes:

```typescript
onEnd: async (state) => {
  // state.status = "completed" or "error"
  // state.result = final data (if completed)
  // state.error = error details (if failed)

  if (state.status === "error") {
    await alertTeam(`Workflow failed: ${state.error}`);
  }
};
```

### 3. onStepStart

Runs before each step:

```typescript
onStepStart: async (state) => {
  // state.stepId = current step ID
  // state.data = data going into step

  console.time(`Step ${state.stepId}`);
};
```

### 4. onStepEnd

Runs after each step succeeds:

```typescript
onStepEnd: async (state) => {
  // state.stepId = current step ID
  // state.data = data coming out of step

  console.timeEnd(`Step ${state.stepId}`);
};
```

## Common Patterns

### Performance Monitoring

```typescript
const performanceHooks = {
  onStepStart: async (state) => {
    state.timings = state.timings || {};
    state.timings[state.stepId] = Date.now();
  },
  onStepEnd: async (state) => {
    const duration = Date.now() - state.timings[state.stepId];
    await metrics.recordStepDuration(state.stepId, duration);
  },
};
```

### Error Tracking

```typescript
const errorHooks = {
  onEnd: async (state) => {
    if (state.status === "error") {
      await errorTracker.report({
        workflowId: state.workflowId,
        executionId: state.executionId,
        error: state.error,
        input: state.data,
      });
    }
  },
};
```

### Audit Logging

```typescript
const auditHooks = {
  onStart: async (state) => {
    await auditLog.create({
      action: "workflow.started",
      workflowId: state.workflowId,
      userId: state.userContext?.get("userId"),
      timestamp: new Date(),
    });
  },
  onEnd: async (state) => {
    await auditLog.create({
      action: "workflow.completed",
      workflowId: state.workflowId,
      status: state.status,
      duration: Date.now() - state.startTime,
    });
  },
};
```

### Development Debugging

```typescript
const debugHooks = {
  onStepStart: async (state) => {
    console.log(`→ ${state.stepId}`, state.data);
  },
  onStepEnd: async (state) => {
    console.log(`← ${state.stepId}`, state.data);
  },
  onEnd: async (state) => {
    if (state.status === "error") {
      console.error("Workflow failed:", state.error);
      console.error("Last data:", state.data);
    }
  },
};
```

## Hook Execution Order

Here's what happens when you run a workflow:

```
1. onStart
2. onStepStart (step 1)
3. [Step 1 executes]
4. onStepEnd (step 1)
5. onStepStart (step 2)
6. [Step 2 executes]
7. onStepEnd (step 2)
8. onEnd
```

If a step fails:

```
1. onStart
2. onStepStart (step 1)
3. [Step 1 fails with error]
4. onEnd (with error status)
```

Note: `onStepEnd` is skipped for failed steps.

## Best Practices

1. **Keep hooks fast** - They run synchronously and can slow down your workflow
2. **Handle hook errors** - Wrap risky operations in try/catch
3. **Don't modify state** - Hooks should observe, not change data
4. **Use for cross-cutting concerns** - Logging, monitoring, analytics

## Real World Example

```typescript
const productionWorkflow = createWorkflowChain({
  id: "user-onboarding",
  input: z.object({ userId: z.string(), email: z.string() }),
  hooks: {
    onStart: async (state) => {
      // Track workflow start
      await analytics.track("onboarding.started", {
        userId: state.data.userId,
      });
    },
    onStepEnd: async (state) => {
      // Track each step completion
      await analytics.track("onboarding.step_completed", {
        userId: state.data.userId,
        step: state.stepId,
      });
    },
    onEnd: async (state) => {
      if (state.status === "completed") {
        // Send welcome email
        await emailService.send({
          to: state.data.email,
          template: "welcome",
        });

        // Track success
        await analytics.track("onboarding.completed", {
          userId: state.data.userId,
        });
      } else {
        // Alert team about failure
        await slack.alert(`Onboarding failed for ${state.data.userId}`);
      }
    },
  },
})
  .andThen({ id: "create-profile", execute: createUserProfile })
  .andThen({ id: "send-verification", execute: sendVerificationEmail })
  .andThen({ id: "assign-defaults", execute: assignDefaultSettings });
```

## Next Steps

- Learn about [Suspend & Resume](./suspend-resume.md) for human-in-the-loop workflows
- Explore [Schemas](./schemas.md) for type-safe workflows
- See [Error Handling](./overview.md) for robust workflows

> **Remember**: Hooks are for observing, not changing. Use them to watch your workflow, not control it.
