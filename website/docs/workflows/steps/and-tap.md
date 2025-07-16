# andTap - Tap into the Data Flow

> **Safely perform side-effects like logging or analytics without altering the workflow's data.**

## What is andTap?

`andTap` is a utility for observing data within a workflow. It allows you to execute a function for side-effects (like logging to the console, sending an analytics event, or calling an external monitoring service) without modifying the data that flows through your chain.

It's designed to be safe: it won't change the result, and it won't crash your workflow if the tap function fails.

Here's how you can use it to log data mid-workflow:

```typescript
import { createWorkflowChain, andTap } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "tap-example",
  name: "Tap Example",
  input: z.object({ userId: z.string() }),
  result: z.object({ status: z.string() }),
})
  .andThen({
    id: "fetch-user",
    execute: async ({ userId }) => {
      // In a real app, you'd fetch user data
      return { userId, name: "Alex" };
    },
  })
  // Tap into the flow to log the user's name
  .andTap({
    id: "log-user-name",
    execute: (data) => {
      console.log(`Processing user: ${data.name}`);
    },
  })
  .andThen({
    id: "finalize-processing",
    execute: (data) => {
      // The data is unchanged by andTap.
      // `data` here is { userId: string, name: string }
      return { status: `Completed for ${data.name}` };
    },
  });

const result = await workflow.run({ userId: "user-123" });

console.log(result.result);
// Console Output:
// Processing user: Alex
// { status: 'Completed for Alex' }
```

## How It Works

1.  **It's a Chain Method**: `.andTap()` is a method on the workflow chain, just like `.andThen()` or `.andAgent()`.
2.  **Executes Your Function**: When the workflow runs this step, it executes your function, passing in the current `data` and `state`.
3.  **Ignores Return Value**: The result of your `execute` function is completely ignored.
4.  **Passes Original Data**: The step returns the original, unmodified `data` object to the next step in the chain.
5.  **Catches Errors**: If your `execute` function throws an error, `andTap` catches it, logs it, and allows the workflow to proceed without interruption.

## Common Use Cases

### Debugging Workflows

`andTap` is perfect for inspecting the state of your data at any point in a complex workflow without adding `console.log` statements inside your business logic.

```typescript
import { createWorkflowChain, andTap } from "@voltagent/core";

createWorkflowChain({
  id: "debug-workflow",
  name: "Debug Workflow",
  input: z.object({}),
  result: z.object({}),
})
  .andThen({ id: "step1", /* ... some logic ... */ })
  .andTap({
    id: "debug-after-step1",
    execute: (data) => console.log("After step 1:", data)
  })
  .andAgent(...)
```

### Analytics and Monitoring

Send events to your analytics platform without cluttering your core workflow steps. This separation of concerns makes your code cleaner.

```typescript
import { createWorkflowChain, andTap } from "@voltagent/core";

createWorkflowChain({
  id: "analytics-workflow",
  name: "Analytics Workflow",
  input: z.object({}),
  result: z.object({}),
}).andTap({
  id: "track-user-action",
  execute: async (data, state) => {
    await analytics.track("Workflow Step Completed", {
      userId: state.userId,
      workflowId: state.workflowId,
      ...data,
    });
  },
});
```

### External Notifications

Send a non-critical notification, like a Slack message, that shouldn't stop the workflow if it fails.

```typescript
import { createWorkflowChain, andTap } from "@voltagent/core";

createWorkflowChain({
  id: "notification-workflow",
  name: "Notification Workflow",
  input: z.object({ id: z.string() }),
  result: z.object({}),
}).andTap({
  id: "notify-slack-channel",
  execute: async (data) => {
    // This might fail, but it won't stop the workflow.
    await notifySlack(`Processing item #${data.id}`);
  },
});
```

## Key Characteristics vs. `andThen`

| Feature            | `andTap`                                        | `andThen` (with an object)                      |
| ------------------ | ----------------------------------------------- | ----------------------------------------------- |
| **Purpose**        | Observation & Side-Effects (Logging, Analytics) | Data Transformation & Core Logic                |
| **Return Value**   | Ignored; original data is passed through        | Merged into the workflow data for the next step |
| **Error Handling** | Catches and logs errors; workflow continues     | Throws errors by default; can stop the workflow |
| **Data Flow**      | Guarantees data is unchanged                    | Intended to modify or add to the data           |

## Next Steps

- **[`andThen`](./and-then.md)**: See how to perform core logic and data transformations.
- **[`andWhen`](./and-when.md)**: Learn how to add conditional logic to your workflows.
- **[Execution State](../overview.md#accessing-execution-state)**: Understand how to use `state` for context-aware workflows.

---

> **Quick Summary**: `andTap` lets you safely run side-effects like logging or analytics inside a workflow. It observes data without changing it and won't stop the execution if it fails, making it ideal for non-essential tasks.
