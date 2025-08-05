---
"create-voltagent-app": patch
---

feat: update base template to always include VoltOpsClient for observability

### What's New

The create-voltagent-app template now always includes VoltOpsClient configuration, making it easier for users to enable production observability with a single click from the VoltOps Console.

### Changes

- **Always Include VoltOpsClient**: The base template now imports and configures VoltOpsClient by default
- **Environment-Based Configuration**: VoltOpsClient reads keys from `VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY` environment variables
- **Seamless Console Integration**: Works with the new one-click observability setup in VoltOps Console

### Template Structure

```typescript
import { VoltAgent, VoltOpsClient, Agent } from "@voltagent/core";

// ... agent configuration ...

new VoltAgent({
  agents: { agent },
  workflows: { expenseApprovalWorkflow },
  logger,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});
```

### Benefits

- **Zero Configuration**: New projects are ready for observability out of the box
- **Console Integration**: Enable observability with one click from VoltOps Console
- **Production Ready**: Template follows best practices for production deployments

This change ensures all new VoltAgent projects created with create-voltagent-app are ready for production observability from day one.
