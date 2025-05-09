---
"@voltagent/core": patch
---

Enabled `userContext` to be passed from supervisor agents to their sub-agents, allowing for consistent contextual data across delegated tasks. This ensures that sub-agents can operate with the necessary shared information provided by their parent agent.

```typescript
// Supervisor Agent initiates an operation with userContext:
const supervisorContext = new Map<string | symbol, unknown>();
supervisorContext.set("globalTransactionId", "tx-supervisor-12345");

await supervisorAgent.generateText(
  "Delegate analysis of transaction tx-supervisor-12345 to the financial sub-agent.",
  { userContext: supervisorContext }
);

// In your sub-agent's hook definition (e.g., within createHooks):
onStart: ({ agent, context }: OnStartHookArgs) => {
  const inheritedUserContext = context.userContext; // Access the OperationContext's userContext
  const transactionId = inheritedUserContext.get("globalTransactionId");
  console.log(`[${agent.name}] Hook: Operating with Transaction ID: ${transactionId}`);
  // Expected log: [FinancialSubAgent] Hook: Operating with Transaction ID: tx-supervisor-12345
};

// Example: Inside a Tool executed by the Sub-Agent
// In your sub-agent tool's execute function:
execute: async (params: { someParam: string }, options?: ToolExecutionContext) => {
  if (options?.operationContext?.userContext) {
    const inheritedUserContext = options.operationContext.userContext;
    const transactionId = inheritedUserContext.get("globalTransactionId");
    console.log(`[SubAgentTool] Tool: Processing with Transaction ID: ${transactionId}`);
    // Expected log: [SubAgentTool] Tool: Processing with Transaction ID: tx-supervisor-12345
    return `Processed ${params.someParam} for transaction ${transactionId}`;
  }
  return "Error: OperationContext not available for tool";
};
```
