---
title: Logging
slug: /observability/logging
---

VoltAgent automatically logs important events from your agents and workflows. You can customize logging at multiple levels to help debug issues and monitor your AI applications.

## Global Logger Configuration

When creating a VoltAgent instance, you can configure logging globally for all agents and workflows:

```javascript
import { VoltAgent } from "@voltagent/core";
import { createLogger } from "@voltagent/logger";

// Option 1: Use default logger (recommended for getting started)
const voltAgent = new VoltAgent({
  agents: [myAgent],
  workflows: [myWorkflow],
});

// Option 2: Provide custom logger with specific configuration
const customLogger = createLogger({
  level: "debug", // More verbose logging
  format: "pretty", // Human-readable format
  name: "my-app", // Add app name to all logs
});

const voltAgent = new VoltAgent({
  logger: customLogger,
  agents: [myAgent],
  workflows: [myWorkflow],
});
```

## Agent-Level Logging

Each agent can have its own logger configuration that overrides the global settings:

```javascript
import { Agent } from "@voltagent/core";
import { createLogger } from "@voltagent/logger";

const agent = new Agent({
  name: "CustomerSupport",
  llm: anthropic,
  model: "claude-3-sonnet",
  instructions: "You are a helpful customer support agent",

  // This agent needs more detailed logs
  logger: createLogger({
    level: "debug",
    name: "customer-support",
  }),
});

// The agent automatically logs:
// - When it starts processing
// - Tool calls and their results
// - Errors and retries
// - Completion events
```

VoltAgent automatically adds context to agent logs:

- `agentId` - Unique identifier for the agent
- `agentName` - The name you gave the agent
- `modelName` - Which AI model is being used
- `conversationId` - Current conversation context

## Workflow-Level Logging

Workflows can also have custom logger configuration:

```javascript
import { createWorkflow } from "@voltagent/core";
import { createLogger } from "@voltagent/logger";

const processOrderWorkflow = createWorkflow(
  {
    name: "ProcessOrder",
    inputSchema: z.object({ orderId: z.string() }),
    resultSchema: z.object({ status: z.string() }),

    // More verbose logging for this critical workflow
    logger: createLogger({
      level: "info",
      name: "order-processing",
    }),
  },
  andThen(validateOrder),
  andAgent(orderAgent),
  andThen(updateDatabase)
);

// Workflows automatically log:
// - Workflow start and completion
// - Each step execution
// - Step results and errors
// - Suspension and resume events
```

Workflow logs include:

- `workflowId` - Unique workflow identifier
- `executionId` - Specific execution instance
- `stepId` - Current step being executed
- `stepType` - Type of step (andThen, andAgent, etc.)

## Environment Variables

Configure logging without changing code using environment variables:

| Variable                    | Description                      | Default                       | Options                                            |
| --------------------------- | -------------------------------- | ----------------------------- | -------------------------------------------------- |
| `VOLTAGENT_LOG_LEVEL`       | Minimum log level to display     | `info`                        | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `VOLTAGENT_LOG_FORMAT`      | Output format                    | `json` (prod), `pretty` (dev) | `json`, `pretty`                                   |
| `VOLTAGENT_LOG_BUFFER_SIZE` | Number of logs to keep in memory | `1000`                        | Any positive number                                |

Example:

```bash
# Development
VOLTAGENT_LOG_LEVEL=debug VOLTAGENT_LOG_FORMAT=pretty npm run dev

# Production
VOLTAGENT_LOG_LEVEL=warn VOLTAGENT_LOG_FORMAT=json npm start
```

## Log Levels

Use appropriate log levels for different scenarios:

| Level   | When to Use                  | Example                              |
| ------- | ---------------------------- | ------------------------------------ |
| `trace` | Very detailed debugging info | Function entry/exit points           |
| `debug` | Debugging information        | Variable values, decision logic      |
| `info`  | Important events             | Agent started, workflow completed    |
| `warn`  | Warning conditions           | Retry attempts, fallback behavior    |
| `error` | Error conditions             | API failures, invalid inputs         |
| `fatal` | Critical failures            | System crashes, unrecoverable errors |

## Accessing Logs

### Console Output

During development, logs appear in your console with color coding and formatting:

```
[2024-01-20 10:30:45] INFO (CustomerSupport): Agent started processing
  agentId: "agent_abc123"
  conversationId: "conv_xyz789"
  modelName: "claude-3-sonnet"
```

### API Endpoint

Query logs programmatically via the API:

```javascript
// Get recent logs
GET http://localhost:3141/api/logs

// Filter by agent
GET http://localhost:3141/api/logs?agentId=agent_abc123

// Filter by level and time
GET http://localhost:3141/api/logs?level=error&since=2024-01-20T10:00:00Z

// Available query parameters:
// - level: Filter by log level
// - agentId: Filter by specific agent
// - workflowId: Filter by workflow
// - executionId: Filter by workflow execution
// - conversationId: Filter by conversation
// - since/until: Time range filters
// - limit: Maximum number of logs (default: 100)
```

### VoltOps Console

When using VoltOps Platform, logs are automatically streamed and searchable in the web interface with advanced filtering and real-time updates.

## Practical Examples

### Debug Why an Agent Chose a Tool

```javascript
agent.hooks.beforeToolCall = async ({ tool, args, context }) => {
  context.logger.debug("Tool selection", {
    toolName: tool.name,
    arguments: args,
    reason: "User asked about order status",
  });
};
```

### Track Workflow Progress

```javascript
const workflow = createWorkflow(
  { name: "DataProcessing" },
  andThen(async ({ input, context }) => {
    context.logger.info("Starting data validation", {
      recordCount: input.records.length,
    });
    // ... validation logic
    return validatedData;
  }),
  andThen(async ({ input, context }) => {
    context.logger.info("Processing validated data");
    // ... processing logic
    return processedData;
  })
);
```

### Monitor Performance

```javascript
agent.hooks.afterAction = async ({ context, result }) => {
  const duration = context.endTime - context.startTime;
  if (duration > 5000) {
    context.logger.warn("Slow response detected", {
      duration: `${duration}ms`,
      tokensUsed: result.usage?.totalTokens,
    });
  }
};
```

### Error Investigation

```javascript
agent.hooks.onError = async ({ error, context }) => {
  context.logger.error("Agent encountered an error", {
    errorType: error.name,
    errorMessage: error.message,
    lastTool: context.lastToolUsed,
    // Stack trace is automatically included in error logs
  });
};
```

## Best Practices

1. **Use descriptive messages**: Write logs that will make sense when debugging at 3 AM

   ```javascript
   // Bad
   logger.info("Processing");

   // Good
   logger.info("Processing refund request", { orderId, amount, reason });
   ```

2. **Don't log sensitive data**: Never log passwords, API keys, or personal information

   ```javascript
   // Bad
   logger.debug("User login", { email, password });

   // Good
   logger.debug("User login", { email, success: true });
   ```

3. **Use appropriate levels**: Reserve `error` for actual errors, use `debug` for detailed traces

   ```javascript
   // Use debug for expected conditions
   logger.debug("Cache miss, fetching from database");

   // Use error for unexpected failures
   logger.error("Database connection failed", { error });
   ```

4. **Leverage automatic context**: Don't repeat information that VoltAgent already logs

   ```javascript
   // Unnecessary - agentId is already in context
   logger.info(`Agent ${agentId} completed task`);

   // Better
   logger.info("Task completed", { taskType: "refund" });
   ```

5. **Structure your data**: Use objects for complex data instead of string concatenation

   ```javascript
   // Hard to parse
   logger.info(`Order ${orderId} status changed from ${oldStatus} to ${newStatus}`);

   // Easy to query and analyze
   logger.info("Order status changed", {
     orderId,
     oldStatus,
     newStatus,
     changedBy: "system",
   });
   ```

## Next Steps

- Learn about [VoltOps LLM Observability](./developer-console.md) for visual log analysis
- Integrate with [Langfuse](./langfuse.md) for advanced tracing
- Check the [API Reference](/api-reference) for detailed logger configuration options
