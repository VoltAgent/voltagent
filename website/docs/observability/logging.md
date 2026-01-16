---
title: Logging
slug: /observability/logging
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

VoltAgent provides automatic logging for all agent and workflow events. By default, it uses a simple console logger for quick prototyping, but for production use, you should use the powerful Pino-based logger from `@voltagent/logger` package which offers pretty formatting, file transports, and advanced features.

## Global Logger Configuration

When creating a VoltAgent instance, you can configure logging globally for all agents and workflows:

```javascript
import { VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";

// Option 1: Use built-in console logger (basic, for development only)
const voltAgent = new VoltAgent({
  agents: [myAgent],
  workflows: [myWorkflow],
});
// ⚠️ This uses a simple console logger with basic formatting
// Output: [2024-01-20T10:30:45.123Z] INFO {component: "voltagent"}: Agent started

// Option 2: Use Pino logger (recommended for production)
const logger = createPinoLogger({
  level: "debug", // More verbose logging (allowed: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent")
  format: "pretty", // Human-readable format in development. defaults to "json" in production
  name: "my-app", // Add app name to all logs
});

const voltAgent = new VoltAgent({
  logger: logger,
  agents: { myAgent },
  workflows: { myWorkflow },
});
// ✅ This uses Pino with pretty formatting, transports, and all advanced features
```

:::info Installing @voltagent/logger

For existing projects using the default ConsoleLogger, install `@voltagent/logger` to access advanced features like pretty formatting, file transports, and Pino integration:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm install @voltagent/logger
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm add @voltagent/logger
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @voltagent/logger
    ```
  </TabItem>
</Tabs>

Then import and use:

```javascript
import { createPinoLogger } from "@voltagent/logger";

const logger = createPinoLogger({ level: "info", name: "my-app" });
```

:::

## Default Logger Behavior

When you don't provide a logger to VoltAgent, it uses a built-in `ConsoleLogger` from `@voltagent/core`:

### ConsoleLogger Features:

- ✅ Basic console output with timestamps
- ✅ Standard log levels (trace, debug, info, warn, error, fatal)
- ✅ Respects `VOLTAGENT_LOG_LEVEL` or `LOG_LEVEL` environment variables
- ✅ Simple JSON context display

### ConsoleLogger Limitations:

- ❌ No pretty formatting or colors
- ❌ No file transports or custom outputs
- ❌ No log buffering or streaming
- ❌ No advanced Pino features
- ❌ Basic output format: `[timestamp] LEVEL {context}: message`

### When to Use Each Logger:

| Use Case                     | Logger Choice                 | Example                                                   |
| ---------------------------- | ----------------------------- | --------------------------------------------------------- |
| Quick prototyping            | Default ConsoleLogger         | `new VoltAgent({ agents })`                               |
| Development with nice output | Pino with pretty format       | `createPinoLogger({ format: "pretty" })`                  |
| Production with file logging | Pino with transports          | `createPinoLogger({ pinoOptions: { transport: {...} } })` |
| VoltOps Platform integration | Any logger (logs always sent) | Both work with VoltOps                                    |

💡 **Tip**: Always use `createPinoLogger` for production applications to get proper formatting, performance, and transport options.

## Sync Logs with VoltOps (Cloud)

VoltAgent’s logging is OpenTelemetry-based and can be exported to VoltOps automatically for production monitoring with no code changes.

- Add these to your `.env` and run your app:

```bash
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
```

- Get keys quickly: open https://console.voltagent.dev/tracing-setup and use auto‑install.

What happens under the hood:

- Built on OpenTelemetry Logs; exports via OTLP HTTP.
- Auto‑enables when valid keys are present; otherwise remains local only.
- Smart batching and lazy initialization minimize overhead; real‑time local logging remains available via WebSocket.

Advanced control (optional): You can tune sampling and batching through `VoltAgentObservability` and it applies to both traces and logs:

```ts
import { VoltAgent, VoltAgentObservability } from "@voltagent/core";

const observability = new VoltAgentObservability({
  voltOpsSync: {
    // Sampling strategies: "always" | "never" | "ratio" | "parent"
    sampling: { strategy: "ratio", ratio: 0.25 },
    // Batching controls
    maxQueueSize: 4096,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 4000,
    exportTimeoutMillis: 30000,
  },
});

new VoltAgent({
  agents: {
    /* ... */
  },
  observability,
});
```

Tip: To disable cloud export and keep logs local to the console only, set `sampling: { strategy: "never" }`.

## Using Pino Logger with Advanced Features

For advanced use cases, you can use `createPinoLogger` which provides access to all Pino features including custom transports:

```javascript
import { createPinoLogger } from "@voltagent/logger";

// Basic Pino logger with our defaults
const logger = createPinoLogger({
  level: "debug", // allowed: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent"
  name: "my-app",
});

// Advanced: With custom Pino options
const logger = createPinoLogger({
  level: "info",
  pinoOptions: {
    // Any Pino-specific option can go here
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
    },
    hooks: {
      logMethod(args, method) {
        // Custom hook logic
        method.apply(this, args);
      },
    },
  },
});

const voltAgent = new VoltAgent({
  logger,
  agents: [myAgent],
});
```

## Agent-Level Logging

Each agent can have its own logger configuration that overrides the global settings:

```javascript
import { Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";

const agent = new Agent({
  name: "CustomerSupport",
  model: "anthropic/claude-3-5-sonnet",
  instructions: "You are a helpful customer support agent",

  // This agent needs more detailed logs
  logger: createPinoLogger({
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
import { createPinoLogger } from "@voltagent/logger";

const processOrderWorkflow = createWorkflow(
  {
    name: "ProcessOrder",
    inputSchema: z.object({ orderId: z.string() }),
    resultSchema: z.object({ status: z.string() }),

    // More verbose logging for this critical workflow
    logger: createPinoLogger({
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

## Custom Transports and File Logging

⚠️ **IMPORTANT**: When you specify a custom transport, it **COMPLETELY OVERRIDES** the default console output. This means your logs will **NOT** appear in the console unless you explicitly include pino-pretty.

### File-Only Logging (No Console Output)

```javascript
import { createPinoLogger } from "@voltagent/logger";

const fileOnlyLogger = createPinoLogger({
  level: "info",
  pinoOptions: {
    transport: {
      target: "pino/file",
      options: { destination: "./app.log" },
    },
  },
});

// ⚠️ This will ONLY write to file, NOT to console!
fileOnlyLogger.info("This goes to file only");
```

### Console + File Logging (Recommended)

To keep console output AND add file logging, you must specify BOTH transports:

```javascript
const logger = createPinoLogger({
  level: "info",
  pinoOptions: {
    transport: {
      targets: [
        // Console output with our default configuration
        {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "yyyy-MM-dd HH:mm:ss.l o",
            ignore: "pid,hostname,env,component",
            messageFormat:
              "{msg}{if userId} | user={userId}{end}{if conversationId} | conv={conversationId}{end}{if executionId} | exec={executionId}{end}",
            errorLikeObjectKeys: ["err", "error", "exception"],
            errorProps: "",
            singleLine: true, // Set to false for debug/trace levels
            messageKey: "msg",
          },
        },
        // File output
        {
          target: "pino/file",
          options: {
            destination: "./app.log",
            mkdir: true, // Create directory if it doesn't exist
          },
        },
      ],
    },
  },
});

// ✅ This will write to BOTH console and file
logger.info("This appears in console AND file");
```

### Our Default Console Configuration

When you don't specify any transport, we use this pino-pretty configuration in development:

```javascript
{
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "yyyy-MM-dd HH:mm:ss.l o", // Example: 2024-01-20 14:30:45.123 +0300
    ignore: "pid,hostname,env,component",      // Hide these fields from output
    messageFormat: "{msg}{if userId} | user={userId}{end}{if conversationId} | conv={conversationId}{end}{if executionId} | exec={executionId}{end}",
    errorLikeObjectKeys: ["err", "error", "exception"],
    errorProps: "",
    singleLine: true,  // Single line for info/warn/error
    messageKey: "msg",
  },
}
```

### Multiple Log Files Example

```javascript
const logger = createPinoLogger({
  level: "debug",
  pinoOptions: {
    transport: {
      targets: [
        // Console for all logs
        {
          target: "pino-pretty",
          options: { colorize: true },
        },
        // Error logs to separate file
        {
          target: "pino/file",
          options: { destination: "./error.log" },
          level: "error",
        },
        // All logs to general file
        {
          target: "pino/file",
          options: { destination: "./app.log" },
        },
      ],
    },
  },
});
```

## Environment Variables

Configure logging without changing code using environment variables:

| Variable                    | Description                                         | Default                       | Options                                                      |
| --------------------------- | --------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `VOLTAGENT_LOG_LEVEL`       | Minimum log level to display                        | `error` (prod), `info` (dev)  | `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent` |
| `LOG_LEVEL`                 | Alternative to VOLTAGENT_LOG_LEVEL (lower priority) | `error` (prod), `info` (dev)  | Same as above                                                |
| `VOLTAGENT_LOG_FORMAT`      | Output format (Pino only)                           | `json` (prod), `pretty` (dev) | `json`, `pretty`                                             |
| `VOLTAGENT_LOG_BUFFER_SIZE` | Number of logs to keep in memory                    | `1000`                        | Any positive number                                          |

**Note**: Both ConsoleLogger and PinoLogger check environment variables in this order:

1. `VOLTAGENT_LOG_LEVEL` (recommended, takes precedence)
2. `LOG_LEVEL` (fallback for compatibility)
3. Default based on NODE_ENV

Example:

```bash
# Using VoltAgent-specific variable (recommended)
VOLTAGENT_LOG_LEVEL=debug npm run dev

# Using generic variable (also works)
LOG_LEVEL=debug npm run dev

# Production with specific level
VOLTAGENT_LOG_LEVEL=warn VOLTAGENT_LOG_FORMAT=json npm start
```

## Log Levels

Use appropriate log levels for different scenarios:

| Level    | When to Use                  | Example                              |
| -------- | ---------------------------- | ------------------------------------ |
| `trace`  | Very detailed debugging info | Function entry/exit points           |
| `debug`  | Debugging information        | Variable values, decision logic      |
| `info`   | Important events             | Agent started, workflow completed    |
| `warn`   | Warning conditions           | Retry attempts, fallback behavior    |
| `error`  | Error conditions             | API failures, invalid inputs         |
| `fatal`  | Critical failures            | System crashes, unrecoverable errors |
| `silent` | Disable all logging          | Testing or special scenarios         |

## What Events Are Logged at Each Level

This table shows which events and information are visible at each log level across VoltAgent components:

### Trace Level (Most Detailed)

| Component    | Events Logged                                                                                                                                      | Information Included                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Workflow** | • Workflow execution creation/updates<br/>• Step recording (start/end)<br/>• Timeline events<br/>• Suspension checkpoints<br/>• Cleanup operations | `workflowId`, `executionId`, `stepId`, `status`, `metadata`, `suspensionMetadata` |
| **Memory**   | • Context loading<br/>• Conversation updates<br/>• Message saves<br/>• SQL query execution<br/>• History operations                                | `conversationId`, `userId`, `agentId`, `messageId`, SQL queries with parameters   |
| **API**      | • Suspension operations<br/>• Execution state tracking                                                                                             | `[API]` prefix, `executionId`, operation details                                  |
| **Core**     | • External logger connections<br/>• Registry initialization                                                                                        | Connection status, buffer information                                             |

### Debug Level

| Component    | Events Logged                                                                              | Information Included                                                  |
| ------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Agent**    | • Agent creation<br/>• VoltOps client initialization<br/>• Subagent completion (streaming) | `agentId`, `agentName`, `modelName`, `event: LogEvents.AGENT_CREATED` |
| **Workflow** | • Resume attempts<br/>• Shutdown suspension                                                | `workflowId`, `executionId`, suspension context                       |
| **Memory**   | • Message fetching<br/>• Conversation creation<br/>• Batch saves                           | `conversationId`, message count, operation type                       |
| **Tools**    | • Tool/toolkit registration<br/>• Tool removal                                             | `toolName`, `toolkitName`, tool count                                 |
| **MCP**      | • Connection fallbacks (HTTP→SSE)                                                          | Connection type, fallback reason                                      |
| **API**      | • Update checks                                                                            | Check results, version information                                    |

### Info Level

| Component  | Events Logged                                                                        | Information Included                               |
| ---------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **Core**   | • Server startup/shutdown<br/>• Graceful shutdown signals<br/>• Update notifications | `[VoltAgent]` prefix, signal type, shutdown status |
| **Memory** | • Migration success                                                                  | Migration details, affected records                |
| **API**    | • Server already running                                                             | Server status                                      |

### Warn Level

| Component    | Events Logged                                                                                                                                     | Information Included                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Agent**    | • Memory preparation errors<br/>• Missing operation context<br/>• OTEL span conflicts<br/>• Context retrieval failures<br/>• Deprecation warnings | Error details, `agentId`, conflict information |
| **Workflow** | • Missing memory managers<br/>• Missing executions                                                                                                | `executionId`, manager type                    |
| **Tools**    | • Duplicate tools<br/>• Invalid items                                                                                                             | Tool names, conflict resolution                |
| **API**      | • Schema conversion failures<br/>• Missing executions                                                                                             | `stepId`, conversion errors                    |
| **Core**     | • Telemetry re-initialization                                                                                                                     | Warning messages                               |

### Error Level

| Component    | Events Logged                                                                                            | Information Included                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Agent**    | • Tool execution failures                                                                                | `toolName`, `agentId`, error object, `event: LogEvents.TOOL_EXECUTION_FAILED` |
| **Workflow** | • Execution failures<br/>• Missing workflows<br/>• Suspension failures<br/>• Checkpoint storage failures | `workflowId`, `executionId`, full error details                               |
| **Memory**   | • Context load failures<br/>• Conversation setup failures<br/>• History operation failures               | Operation context, error details, affected IDs                                |
| **MCP**      | • Remote tool execution failures<br/>• Tool wrapper creation failures                                    | Tool names, error objects                                                     |
| **API**      | • Request handling failures<br/>• Stream errors                                                          | Error timestamps, request details                                             |
| **Core**     | • Server start failures<br/>• Endpoint registration failures<br/>• Telemetry initialization failures     | Error messages, failure context                                               |

### Key Patterns

1. **Structured Events**: Many logs include a semantic `event` field using `LogEvents` constants (e.g., `LogEvents.AGENT_CREATED`, `LogEvents.TOOL_EXECUTION_FAILED`)
2. **Contextual IDs**: All logs include relevant IDs (`agentId`, `workflowId`, `executionId`, `conversationId`, etc.)
3. **Error Objects**: Error logs always include the full error object for debugging
4. **Component Prefixes**: Some components use prefixes like `[API]` or `[VoltAgent]` for easy filtering
5. **Operation Context**: Logs include operation type and status for tracking state transitions

## Understanding Log Event Names

VoltAgent uses semantic event names following the pattern `component.action.status`:

- **Component**: `agent`, `workflow`, `memory`, `tool`, `mcp`, `api`, `event`
- **Action**: `generation`, `stream`, `execution`, `operation`, etc.
- **Status**: `started`, `completed`, `failed`, `suspended`, etc.

Examples:

- `agent.generation.started` - Agent begins generating a response
- `tool.execution.failed` - Tool execution encountered an error
- `workflow.step.completed` - Workflow step finished successfully
- `memory.conversation.saved` - Conversation saved to memory

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
// - level: Filter by log level ("trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent")
// - agentId: Filter by specific agent
// - workflowId: Filter by workflow
// - executionId: Filter by workflow execution
// - conversationId: Filter by conversation
// - since/until: Time range filters
// - limit: Maximum number of logs (default: 100)
```

### VoltOps Console

When using VoltOps Platform, logs are automatically streamed to the web interface with advanced filtering and real-time updates.

🎯 **Important**: VoltOps Console (local UI) receives **ALL logs** regardless of your local transport configuration. Even if you configure file-only transport, your logs will still appear in the Console UI. For production cloud sync, see "Sync Logs with VoltOps (Cloud)" above.

```javascript
// Example: File-only transport locally
const logger = createPinoLogger({
  pinoOptions: {
    transport: {
      target: "pino/file",
      options: { destination: "./app.log" },
    },
  },
});

// ✅ This will appear in VoltOps Console even though it's not in your local console!
logger.info("This goes to file locally, but still visible in VoltOps Console");
```

📝 **Current Limitations**:

- Logs are currently stored **in memory only**
- Logs are **lost on page refresh**
- Maximum of 5000 logs are kept in memory

🚀 **Coming Soon**:

- Persistent log storage in VoltOps Platform
- Historical log search and analysis
- Log export capabilities

## Common Pitfalls for Beginners

### 1. My Console Logs Disappeared!

**Problem**: After adding file transport, logs no longer appear in console.

```javascript
// ❌ This removes console output!
const logger = createPinoLogger({
  pinoOptions: {
    transport: {
      target: "pino/file",
      options: { destination: "./app.log" },
    },
  },
});
```

**Solution**: Include pino-pretty for console output:

```javascript
// ✅ This keeps console output
const logger = createPinoLogger({
  pinoOptions: {
    transport: {
      targets: [
        { target: "pino-pretty", options: { colorize: true } },
        { target: "pino/file", options: { destination: "./app.log" } },
      ],
    },
  },
});
```

### 2. Logs Not Showing in Production

**Problem**: Pretty logs don't appear in production.

**Solution**: By default, pino-pretty is disabled in production. Either:

- Set `format: "pretty"` explicitly
- Use `NODE_ENV=development`
- Configure transport manually

### 3. Log Level Not Working

**Problem**: Debug logs not showing even with `level: "debug"`.

**Solution**: Check these in order:

1. Environment variable `VOLTAGENT_LOG_LEVEL` might override your setting
2. Individual transports can have their own levels
3. Parent logger level affects child loggers

### 4. VoltOps Console vs Local Console

**Remember**:

- VoltOps Console shows ALL logs regardless of local transport
- Local console only shows logs if pino-pretty is configured
- They are independent systems!

## Execution-Scoped Logging in Tools and Workflows

When your tools, workflows, and retrievers are executed from an agent or workflow context, they automatically receive an execution-scoped logger. This logger includes all the relevant context (userId, conversationId, executionId) for proper log correlation.

### Using Logger in Custom Tools

Tools receive a logger instance through the operation context in their execution options:

```javascript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }, options) => {
    const logger = options?.operationContext?.logger;

    // Log with full execution context
    logger?.info("Fetching weather data", { location });

    try {
      const weather = await fetchWeatherAPI(location);
      logger?.debug("Weather data retrieved", { location, temperature: weather.temp });
      return weather;
    } catch (error) {
      logger?.error("Failed to fetch weather", { location, error });
      throw error;
    }
  },
});
```

### Using Logger in Workflow Steps

Workflow steps have access to the logger through the execution context:

```javascript
import { createWorkflow, andThen } from "@voltagent/core";

const workflow = createWorkflow(
  {
    name: "DataProcessing",
    inputSchema: z.object({ data: z.array(z.string()) }),
    resultSchema: z.object({ processed: z.number() }),
  },
  andThen(async (context) => {
    const { data, logger } = context;

    logger.info("Starting data processing", { itemCount: data.data.length });

    for (const item of data.data) {
      logger.debug("Processing item", { item });
      // Process item...
    }

    logger.info("Data processing completed");
    return { processed: data.data.length };
  })
);
```

### Using Logger in Custom Retrievers

Retrievers receive a logger in their retrieve options:

```javascript
class CustomRetriever {
  async retrieve(query, options) {
    const logger = options?.logger;

    logger?.info("Starting retrieval", { query });

    try {
      const results = await this.searchDatabase(query);
      logger?.debug("Retrieved documents", { count: results.length });
      return results.join("\n");
    } catch (error) {
      logger?.error("Retrieval failed", { query, error });
      throw error;
    }
  }
}
```

### Logger Context Inheritance

The execution-scoped logger automatically includes all relevant context from the parent operation:

- `userId` - User making the request
- `conversationId` - Active conversation
- `executionId` - Current execution ID
- `agentId` - When executed from an agent
- `workflowId` - When executed from a workflow
- `stepId` - Current workflow step

This ensures all logs are properly correlated and can be traced through the entire execution flow.
