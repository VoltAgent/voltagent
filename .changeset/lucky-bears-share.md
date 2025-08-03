---
"@voltagent/core": patch
---

feat: add userContext to logger context for better traceability

### What's New

The `userContext` is now automatically included in the logger context for all agent operations. This provides better traceability and debugging capabilities by associating custom context data with all log messages generated during an agent's execution.

### Usage

When you pass a `userContext` to any agent method, it will automatically appear in all log messages:

```typescript
const userContext = new Map([
  ["sessionId", "session-123"],
  ["userId", "user-456"],
  ["customKey", "customValue"],
]);

await agent.generateText("Hello", { userContext });

// All logs during this operation will include:
// {
//   "component": "agent",
//   "agentId": "TestAgent",
//   "executionId": "...",
//   "userContext": {
//     "sessionId": "session-123",
//     "userId": "user-456",
//     "customKey": "customValue"
//   }
// }
```

### Benefits

- **Better Debugging**: Easily correlate logs with specific user sessions or requests
- **Enhanced Observability**: Track custom context throughout the entire agent execution
- **Multi-tenant Support**: Associate logs with specific tenants, users, or organizations
- **Request Tracing**: Follow a request through all agent operations and sub-agents

This change improves the observability experience by ensuring all log messages include the relevant user context, making it easier to debug issues and track operations in production environments.
