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
    onFinish: async (info) => {
      if (info.status === "completed") {
        console.log(`Order ${info.state.data.orderId} completed!`);
      } else if (info.status === "error") {
        console.error(`Order failed: ${info.error}`);
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

## Hook Overview

### 1. onStart

Runs once when workflow begins:

```typescript
onStart: async (state) => {
  // state.data = initial input
  // state.executionId = unique run ID
  await logger.info("Workflow started", {
    executionId: state.executionId,
  });
};
```

### 2. onStepStart

Runs before each step:

```typescript
onStepStart: async (state) => {
  // state.stepId = current step ID
  // state.data = data going into step

  console.time(`Step ${state.stepId}`);
};
```

### 3. onStepEnd

Runs after each step succeeds:

```typescript
onStepEnd: async (state) => {
  // state.stepId = current step ID
  // state.data = data coming out of step

  console.timeEnd(`Step ${state.stepId}`);
};
```

### 4. onSuspend

Runs when the workflow suspends:

```typescript
onSuspend: async (info) => {
  // info.status === "suspended"
  // info.suspension?.reason
  // info.suspension?.suspendData
  await notifyTeam(`Workflow suspended: ${info.suspension?.reason}`);
};
```

### 5. onError

Runs when the workflow ends with an error:

```typescript
onError: async (info) => {
  // info.status === "error"
  // info.error = error details
  await alertTeam(`Workflow failed: ${info.error}`);
};
```

### 6. onFinish

Runs when the workflow reaches a terminal state:

```typescript
onFinish: async (info) => {
  // info.status = "completed" | "cancelled" | "suspended" | "error"
  // info.steps["fetch-user"]?.output
  await metrics.recordWorkflowEnd(info.status);
};
```

`info.steps` includes `{ input, output, status, error }` snapshots keyed by step ID.

### 7. onEnd (extended)

Runs when the workflow ends (completed, cancelled, or error). It receives the state plus a
structured context:

```typescript
onEnd: async (state, info) => {
  if (info?.status === "error") {
    await alertTeam(`Workflow failed: ${info.error}`);
  }
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
  onError: async (info) => {
    await errorTracker.report({
      executionId: info.state.executionId,
      error: info.error,
      input: info.state.data,
    });
  },
};
```

### Audit Logging

```typescript
const auditHooks = {
  onStart: async (state) => {
    await auditLog.create({
      action: "workflow.started",
      userId: state.context?.get("userId"),
      timestamp: new Date(),
    });
  },
  onFinish: async (info) => {
    await auditLog.create({
      action: "workflow.ended",
      status: info.status,
      duration: Date.now() - info.state.startAt.getTime(),
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
  onError: async (info) => {
    console.error("Workflow failed:", info.error);
    console.error("Last data:", info.state.data);
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
8. onFinish
9. onEnd
```

If a step fails:

```
1. onStart
2. onStepStart (step 1)
3. [Step 1 fails with error]
4. onError
5. onFinish
6. onEnd
```

If a step suspends:

```
1. onStart
2. onStepStart (step 1)
3. [Step 1 suspends]
4. onSuspend
5. onFinish
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
    onFinish: async (info) => {
      if (info.status === "completed") {
        // Send welcome email
        await emailService.send({
          to: info.state.data.email,
          template: "welcome",
        });

        // Track success
        await analytics.track("onboarding.completed", {
          userId: info.state.data.userId,
        });
      } else if (info.status === "error") {
        // Alert team about failure
        await slack.alert(`Onboarding failed for ${info.state.data.userId}`);
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
- Integrate with [REST API](../api/overview.md#workflow-endpoints) to trigger workflows externally

> **Remember**: Hooks are for observing, not changing. Use them to watch your workflow, not control it.
