---
"@voltagent/core": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

feat: add workflow cancellation support, including cancellation metadata, default controller updates, and a new API endpoint for cancelling executions - #608

## Usage Example

```ts
import { createSuspendController } from "@voltagent/core";

const controller = createSuspendController();
const stream = workflow.stream(input, { suspendController: controller });

// Cancel from application code
controller.cancel("User stopped the workflow");

// Or via HTTP
await fetch(`/api/workflows/${workflowId}/executions/${executionId}/cancel`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ reason: "User stopped the workflow" }),
});
```
