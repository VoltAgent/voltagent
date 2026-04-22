---
"@voltagent/core": minor
"@voltagent/server-core": patch
---

feat(core): add pre-execution validators for tools and workflows

Agents and workflows can now define `executionValidators` that run before tool execution or
workflow step execution. Validators can return `false` or `{ pass: false }` to block the run with
an `ExecutionValidationError`, including a custom message, code, HTTP status, and metadata. They
can run synchronously or asynchronously.

```ts
const agent = new Agent({
  name: "Policy Controlled Assistant",
  instructions: "You enforce tenant policy.",
  model: "openai/gpt-4o",
  tools: [updateRecordTool],
  executionValidators: {
    tools: [
      async ({ toolName, operationContext }) => {
        const tenant = operationContext?.requestHeaders?.["x-tenant-id"];
        const allowed = await checkTenantToolAccess({ tenant, toolName });

        if (toolName === "update_record" && !allowed) {
          return {
            pass: false,
            message: "This tenant cannot update records.",
            code: "TOOL_TENANT_DENIED",
            httpStatus: 403,
          };
        }
      },
    ],
  },
});
```

Server-core direct tool and workflow handlers now preserve `ClientHTTPError` details so blocked
executions can return the validator's status and code instead of a generic 500.

Fixes #1213
