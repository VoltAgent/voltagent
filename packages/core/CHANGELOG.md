# @voltagent/core

## 0.1.26

### Patch Changes

- [#181](https://github.com/VoltAgent/voltagent/pull/181) [`1b4a9fd`](https://github.com/VoltAgent/voltagent/commit/1b4a9fd78b84d9b758120380cb80a940c2354020) Thanks [@omeraplak](https://github.com/omeraplak)! - Implement comprehensive error handling for streaming endpoints - #170

  - **Backend**: Added error handling to `streamRoute` and `streamObjectRoute` with onError callbacks, safe stream operations, and multiple error layers (setup, iteration, stream errors)
  - **Documentation**: Added detailed error handling guide with examples for fetch-based SSE streaming

  Fixes issue where streaming errors weren't being communicated to frontend users, leaving them without feedback when API calls failed during streaming operations.

## 0.1.25

### Patch Changes

- [`13d25b4`](https://github.com/VoltAgent/voltagent/commit/13d25b4033c3a4b41d501e954e2893b50553d8d4) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: update zod-from-json-schema dependency version to resolve MCP tools compatibility issues

## 0.1.24

### Patch Changes

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: removed `@n8n/json-schema-to-zod` dependency - #177

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - The `error` column has been deprecated and replaced with `statusMessage` column for better consistency and clearer messaging. The old `error` column is still supported for backward compatibility but will be removed in a future major version.

  Changes:

  - Deprecated `error` column (still functional)
  - Improved error handling and status reporting

## 0.1.23

### Patch Changes

- [`b2f423d`](https://github.com/VoltAgent/voltagent/commit/b2f423d55ee031fc02b0e8eda5175cfe15e38a42) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod import issue - #161

  Fixed incorrect zod import that was causing OpenAPI type safety errors. Updated to use proper import from @hono/zod-openapi package.

## 0.1.22

### Patch Changes

- [#149](https://github.com/VoltAgent/voltagent/pull/149) [`0137a4e`](https://github.com/VoltAgent/voltagent/commit/0137a4e67deaa2490b4a07f9de5f13633f2c473c) Thanks [@VenomHare](https://github.com/VenomHare)! - Added JSON schema support for REST API `generateObject` and `streamObject` functions. The system now accepts JSON schemas which are internally converted to Zod schemas for validation. This enables REST API usage where Zod schemas cannot be directly passed. #87

  Additional Changes:

  - Included the JSON schema from `options.schema` in the system message for the `generateObject` and `streamObject` functions in both `anthropic-ai` and `groq-ai` providers.
  - Enhanced schema handling to convert JSON schemas to Zod internally for seamless REST API compatibility.

- [#151](https://github.com/VoltAgent/voltagent/pull/151) [`4308b85`](https://github.com/VoltAgent/voltagent/commit/4308b857ab2133f6ca60f22271dcf30bad8b4c08) Thanks [@process.env.POSTGRES_USER](https://github.com/process.env.POSTGRES_USER)! - feat: Agent memory can now be stored in PostgreSQL database. This feature enables agents to persistently store conversation history in PostgreSQL. - #16

  ## Usage

  ```tsx
  import { openai } from "@ai-sdk/openai";
  import { Agent, VoltAgent } from "@voltagent/core";
  import { PostgresStorage } from "@voltagent/postgres";
  import { VercelAIProvider } from "@voltagent/vercel-ai";

  // Configure PostgreSQL Memory Storage
  const memoryStorage = new PostgresStorage({
    // Read connection details from environment variables
    connection: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "voltagent",
   || "postgres",
      password: process.env.POSTGRES_PASSWORD || "password",
      ssl: process.env.POSTGRES_SSL === "true",
    },

    // Alternative: Use connection string
    // connection: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/voltagent",

    // Optional: Customize table names
    tablePrefix: "voltagent_memory",

    // Optional: Configure connection pool
    maxConnections: 10,

    // Optional: Set storage limit for messages
    storageLimit: 100,

    // Optional: Enable debug logging for development
    debug: process.env.NODE_ENV === "development",
  });

  // Create agent with PostgreSQL memory
  const agent = new Agent({
    name: "PostgreSQL Memory Agent",
    description: "A helpful assistant that remembers conversations using PostgreSQL.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    memory: memoryStorage, // Use the configured PostgreSQL storage
  });
  ```

## 0.1.21

### Patch Changes

- [#160](https://github.com/VoltAgent/voltagent/pull/160) [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: improved event system architecture for better observability

  We've updated the event system architecture to improve observability capabilities. The system includes automatic migrations to maintain backward compatibility, though some events may not display perfectly due to the architectural changes. Overall functionality remains stable and most features work as expected.

  No action required - the system will automatically handle the migration process. If you encounter any issues, feel free to reach out on [Discord](https://s.voltagent.dev/discord) for support.

  **What's Changed:**

  - Enhanced event system for better observability and monitoring
  - Automatic database migrations for seamless upgrades
  - Improved agent history tracking and management

  **Migration Notes:**

  - Backward compatibility is maintained through automatic migrations
  - Some legacy events may display differently but core functionality is preserved
  - No manual intervention needed - migrations run automatically

  **Note:**
  Some events may not display perfectly due to architecture changes, but the system will automatically migrate and most functionality will work as expected.

## 0.1.20

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

- [#158](https://github.com/VoltAgent/voltagent/pull/158) [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758) Thanks [@baseballyama](https://github.com/baseballyama)! - chore(core): fixed a type error that occurred in src/server/api.ts

## 0.1.19

### Patch Changes

- [#128](https://github.com/VoltAgent/voltagent/pull/128) [`d6cf2e1`](https://github.com/VoltAgent/voltagent/commit/d6cf2e194d47352565314c93f1a4e477701563c1) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add VoltAgentExporter for production observability 🚀

  VoltAgentExporter enables persistent storage and monitoring of AI agents in production environments:

  - Send agent telemetry data to the VoltAgent cloud platform
  - Access historical execution data through your project dashboard
  - Monitor deployed agents over time
  - Debug production issues with comprehensive tracing

  To configure your project with VoltAgentExporter, visit the new tracing setup page at [`https://console.voltagent.dev/tracing-setup`](https://console.voltagent.dev/tracing-setup).

  For more information about production tracing with VoltAgentExporter, see our [developer documentation](https://voltagent.dev/docs/observability/developer-console/#production-tracing-with-voltagentexporter).

## 0.1.18

### Patch Changes

- [#113](https://github.com/VoltAgent/voltagent/pull/113) [`0a120f4`](https://github.com/VoltAgent/voltagent/commit/0a120f4bf1b71575a4b6c67c94104633c58e1410) Thanks [@nhc](https://github.com/nhc)! - export createTool from toolkit

## 0.1.17

### Patch Changes

- [#106](https://github.com/VoltAgent/voltagent/pull/106) [`b31c8f2`](https://github.com/VoltAgent/voltagent/commit/b31c8f2ad1b4bf242b197a094300cb3397109a94) Thanks [@omeraplak](https://github.com/omeraplak)! - Enabled `userContext` to be passed from supervisor agents to their sub-agents, allowing for consistent contextual data across delegated tasks. This ensures that sub-agents can operate with the necessary shared information provided by their parent agent.

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

## 0.1.14

### Patch Changes

- [#102](https://github.com/VoltAgent/voltagent/pull/102) [`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: use 'instructions' field for Agent definitions in examples - #88

  Updated documentation examples (READMEs, docs, blogs) and relevant package code examples to use the `instructions` field instead of `description` when defining `Agent` instances.

  This change aligns the examples with the preferred API usage for the `Agent` class, where `instructions` provides behavioral guidance to the agent/LLM. This prepares for the eventual deprecation of the `description` field specifically for `Agent` class definitions.

  **Example Change for Agent Definition:**

  ```diff
    const agent = new Agent({
      name: "My Assistant",
  -   description: "A helpful assistant.",
  +   instructions: "A helpful assistant.",
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });
  ```

## 0.1.13

### Patch Changes

- [`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add `toolName` to event metadata to ensure `delegate_task` name is visible in Voltagent console

- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435).

## 0.1.12

### Patch Changes

- [#94](https://github.com/VoltAgent/voltagent/pull/94) [`004df81`](https://github.com/VoltAgent/voltagent/commit/004df81fa6a23571391e6ddeba0dfe6bfea267e8) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Add Langfuse Observability Exporter

  This introduces a new package `@voltagent/langfuse-exporter` that allows you to export OpenTelemetry traces generated by `@voltagent/core` directly to Langfuse (https://langfuse.com/) for detailed observability into your agent's operations.

  **How to Use:**

  ## Installation

  Install the necessary packages:

  ```bash
  npm install @voltagent/langfuse-exporter
  ```

  ## Configuration

  Configure the `LangfuseExporter` and pass it to `VoltAgent`:

  ```typescript
  import { Agent, VoltAgent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  import { LangfuseExporter } from "@voltagent/langfuse-exporter";

  // Ensure LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY are set in your environment

  // Define your agent(s)
  const agent = new Agent({
    name: "my-voltagent-app",
    instructions: "A helpful assistant that answers questions without using tools",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Configure the Langfuse Exporter
  const langfuseExporter = new LangfuseExporter({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL, // Optional: Defaults to Langfuse Cloud
    // debug: true // Optional: Enable exporter logging
  });

  // Initialize VoltAgent with the exporter
  // This automatically sets up OpenTelemetry tracing
  new VoltAgent({
    agents: {
      agent, // Register your agent(s)
    },
    telemetryExporter: langfuseExporter, // Pass the exporter instance
  });

  console.log("VoltAgent initialized with Langfuse exporter.");

  // Now, any operations performed by 'agent' (e.g., agent.generateText(...))
  // will automatically generate traces and send them to Langfuse.
  ```

  By providing the `telemetryExporter` to `VoltAgent`, OpenTelemetry is automatically configured, and detailed traces including LLM interactions, tool usage, and agent metadata will appear in your Langfuse project.

## 0.1.11

### Patch Changes

- [`e5b3a46`](https://github.com/VoltAgent/voltagent/commit/e5b3a46e2e61f366fa3c67f9a37d4e4d9e0fe426) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: enhance API Overview documentation

  - Added `curl` examples for all key generation endpoints (`/text`, `/stream`, `/object`, `/stream-object`).
  - Clarified that `userId` and `conversationId` options are optional.
  - Provided separate `curl` examples demonstrating usage both with and without optional parameters (`userId`, `conversationId`).
  - Added a new "Common Generation Options" section with a detailed table explaining parameters like `temperature`, `maxTokens`, `contextLimit`, etc., including their types and default values.

- [`4649c3c`](https://github.com/VoltAgent/voltagent/commit/4649c3ccb9e56a7fcabfe6a0bcef2383ff6506ef) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve agent event handling and error processing

  - Enhanced start event emission in agent operations
  - Fixed timeline event creation for agent operations

- [`8e6d2e9`](https://github.com/VoltAgent/voltagent/commit/8e6d2e994398c1a727d4afea39d5e34ffc4a5fca) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Allow passing arbitrary provider-specific options via the `provider` object in agent generation methods (`generateText`, `streamText`, etc.).

  Added an index signature `[key: string]: unknown;` to the `ProviderOptions` type (`voltagent/packages/core/src/agent/types.ts`). This allows users to pass any provider-specific parameters directly through the `provider` object, enhancing flexibility and enabling the use of features not covered by the standard options.

  Example using a Vercel AI SDK option:

  ```typescript
  import { Agent } from "@voltagent/core";
  import { VercelProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "Example Agent",
    llm: new VercelProvider(),
    model: openai("gpt-4o-mini"),
  });

  await agent.streamText("Tell me a joke", {
    provider: {
      // Standard options can still be used
      temperature: 0.7,
      // Provider-specific options are now allowed by the type
      experimental_activeTools: ["tool1", "tool2"],
      anotherProviderOption: "someValue",
    },
  });
  ```

## 0.1.10

### Patch Changes

- [#77](https://github.com/VoltAgent/voltagent/pull/77) [`beaa8fb`](https://github.com/VoltAgent/voltagent/commit/beaa8fb1f1bc6351f1bede0b65a6a189cc1b6ea2) Thanks [@omeraplak](https://github.com/omeraplak)! - **API & Providers:** Standardized message content format for array inputs.

  - The API (`/text`, `/stream`, `/object`, `/stream-object` endpoints) now strictly expects the `content` field within message objects (when `input` is an array) to be either a `string` or an `Array` of content parts (e.g., `[{ type: 'text', text: '...' }]`).
  - The previous behavior of allowing a single content object (e.g., `{ type: 'text', ... }`) directly as the value for `content` in message arrays is no longer supported in the API schema. Raw string inputs remain unchanged.
  - Provider logic (`google-ai`, `groq-ai`, `xsai`) updated to align with this stricter definition.

  **Console:**

  - **Added file and image upload functionality to the Assistant Chat.** Users can now attach multiple files/images via a button, preview attachments, and send them along with text messages.
  - Improved the Assistant Chat resizing: Replaced size toggle buttons with a draggable handle (top-left corner).
  - Chat window dimensions are now saved to local storage and restored on reload.

  **Internal:**

  - Added comprehensive test suites for Groq and XsAI providers.

## 0.1.9

### Patch Changes

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Introduce `userContext` for passing custom data through agent operations

  Introduced `userContext`, a `Map<string | symbol, unknown>` within the `OperationContext`. This allows developers to store and retrieve custom data across agent lifecycle hooks (`onStart`, `onEnd`) and tool executions for a specific agent operation (like a `generateText` call). This context is isolated per operation, providing a way to manage state specific to a single request or task.

  **Usage Example:**

  ```typescript
  import {
    Agent,
    createHooks,
    createTool,
    type OperationContext,
    type ToolExecutionContext,
  } from "@voltagent/core";
  import { z } from "zod";

  // Define hooks that set and retrieve data
  const hooks = createHooks({
    onStart: (agent: Agent<any>, context: OperationContext) => {
      // Set data needed throughout the operation and potentially by tools
      const requestId = `req-${Date.now()}`;
      const traceId = `trace-${Math.random().toString(16).substring(2, 8)}`;
      context.userContext.set("requestId", requestId);
      context.userContext.set("traceId", traceId);
      console.log(
        `[${agent.name}] Operation started. RequestID: ${requestId}, TraceID: ${traceId}`
      );
    },
    onEnd: (agent: Agent<any>, result: any, context: OperationContext) => {
      // Retrieve data at the end of the operation
      const requestId = context.userContext.get("requestId");
      const traceId = context.userContext.get("traceId"); // Can retrieve traceId here too
      console.log(
        `[${agent.name}] Operation finished. RequestID: ${requestId}, TraceID: ${traceId}`
      );
      // Use these IDs for logging, metrics, cleanup, etc.
    },
  });

  // Define a tool that uses the context data set in onStart
  const customContextTool = createTool({
    name: "custom_context_logger",
    description: "Logs a message using trace ID from the user context.",
    parameters: z.object({
      message: z.string().describe("The message to log."),
    }),
    execute: async (params: { message: string }, options?: ToolExecutionContext) => {
      // Access userContext via options.operationContext
      const traceId = options?.operationContext?.userContext?.get("traceId") || "unknown-trace";
      const requestId =
        options?.operationContext?.userContext?.get("requestId") || "unknown-request"; // Can access requestId too
      const logMessage = `[RequestID: ${requestId}, TraceID: ${traceId}] Tool Log: ${params.message}`;
      console.log(logMessage);
      // In a real scenario, you might interact with external systems using these IDs
      return `Logged message with RequestID: ${requestId} and TraceID: ${traceId}`;
    },
  });

  // Create an agent with the tool and hooks
  const agent = new Agent({
    name: "MyCombinedAgent",
    llm: myLlmProvider, // Your LLM provider instance
    model: myModel, // Your model instance
    tools: [customContextTool],
    hooks: hooks,
  });

  // Trigger the agent. The LLM might decide to use the tool.
  await agent.generateText(
    "Log the following information using the custom logger: 'User feedback received.'"
  );

  // Console output will show logs from onStart, the tool (if called), and onEnd,
  // demonstrating context data flow.
  ```

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Standardize Agent Error and Finish Handling

  This change introduces a more robust and consistent way errors and successful finishes are handled across the `@voltagent/core` Agent and LLM provider implementations (like `@voltagent/vercel-ai`).

  **Key Improvements:**

  - **Standardized Errors (`VoltAgentError`):**

    - Introduced `VoltAgentError`, `ToolErrorInfo`, and `StreamOnErrorCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now wrap underlying SDK/API errors into a structured `VoltAgentError` before passing them to `onError` callbacks or throwing them.
    - Agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) now consistently handle `VoltAgentError`, enabling richer context (stage, code, tool details) in history events and logs.

  - **Standardized Stream Finish Results:**

    - Introduced `StreamTextFinishResult`, `StreamTextOnFinishCallback`, `StreamObjectFinishResult`, and `StreamObjectOnFinishCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now construct these standardized result objects upon successful stream completion.
    - Agent streaming methods (`streamText`, `streamObject`) now receive these standardized results in their `onFinish` handlers, ensuring consistent access to final output (`text` or `object`), `usage`, `finishReason`, etc., for history, events, and hooks.

  - **Updated Interfaces:** The `LLMProvider` interface and related options types (`StreamTextOptions`, `StreamObjectOptions`) have been updated to reflect these new standardized callback types and error-throwing expectations.

  These changes lead to more predictable behavior, improved debugging capabilities through structured errors, and a more consistent experience when working with different LLM providers.

- [`7a7a0f6`](https://github.com/VoltAgent/voltagent/commit/7a7a0f672adbe42635c3edc5f0a7f282575d0932) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Refactor Agent Hooks Signature to Use Single Argument Object - #57

  This change refactors the signature for all agent hooks (`onStart`, `onEnd`, `onToolStart`, `onToolEnd`, `onHandoff`) in `@voltagent/core` to improve usability, readability, and extensibility.

  **Key Changes:**

  - **Single Argument Object:** All hooks now accept a single argument object containing named properties (e.g., `{ agent, context, output, error }`) instead of positional arguments.
  - **`onEnd` / `onToolEnd` Refinement:** The `onEnd` and `onToolEnd` hooks no longer use an `isError` flag or a combined `outputOrError` parameter. They now have distinct `output: <Type> | undefined` and `error: VoltAgentError | undefined` properties, making it explicit whether the operation or tool execution succeeded or failed.
  - **Unified `onEnd` Output:** The `output` type for the `onEnd` hook (`AgentOperationOutput`) is now a standardized union type, providing a consistent structure regardless of which agent method (`generateText`, `streamText`, etc.) completed successfully.

  **Migration Guide:**

  If you have implemented custom agent hooks, you will need to update their signatures:

  **Before:**

  ```typescript
  const myHooks = {
    onStart: async (agent, context) => {
      /* ... */
    },
    onEnd: async (agent, outputOrError, context, isError) => {
      if (isError) {
        // Handle error (outputOrError is the error)
      } else {
        // Handle success (outputOrError is the output)
      }
    },
    onToolStart: async (agent, tool, context) => {
      /* ... */
    },
    onToolEnd: async (agent, tool, result, context) => {
      // Assuming result might contain an error or be the success output
    },
    // ...
  };
  ```

  **After:**

  ```typescript
  import type {
    OnStartHookArgs,
    OnEndHookArgs,
    OnToolStartHookArgs,
    OnToolEndHookArgs,
    // ... other needed types
  } from "@voltagent/core";

  const myHooks = {
    onStart: async (args: OnStartHookArgs) => {
      const { agent, context } = args;
      /* ... */
    },
    onEnd: async (args: OnEndHookArgs) => {
      const { agent, output, error, context } = args;
      if (error) {
        // Handle error (error is VoltAgentError)
      } else if (output) {
        // Handle success (output is AgentOperationOutput)
      }
    },
    onToolStart: async (args: OnToolStartHookArgs) => {
      const { agent, tool, context } = args;
      /* ... */
    },
    onToolEnd: async (args: OnToolEndHookArgs) => {
      const { agent, tool, output, error, context } = args;
      if (error) {
        // Handle tool error (error is VoltAgentError)
      } else {
        // Handle tool success (output is the result)
      }
    },
    // ...
  };
  ```

  Update your hook function definitions to accept the single argument object and use destructuring or direct property access (`args.propertyName`) to get the required data.

## 0.1.8

### Patch Changes

- [#51](https://github.com/VoltAgent/voltagent/pull/51) [`55c58b0`](https://github.com/VoltAgent/voltagent/commit/55c58b0da12dd94a3095aad4bc74c90757c98db4) Thanks [@kwaa](https://github.com/kwaa)! - Use the latest Hono to avoid duplicate dependencies

- [#59](https://github.com/VoltAgent/voltagent/pull/59) [`d40cb14`](https://github.com/VoltAgent/voltagent/commit/d40cb14860a5abe8771e0b91200d10f522c62881) Thanks [@kwaa](https://github.com/kwaa)! - fix: add package exports

- [`e88cb12`](https://github.com/VoltAgent/voltagent/commit/e88cb1249c4189ced9e245069bed5eab71cdd894) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Enhance `createPrompt` with Template Literal Type Inference

  Improved the `createPrompt` utility to leverage TypeScript's template literal types. This provides strong type safety by:

  - Automatically inferring required variable names directly from `{{variable}}` placeholders in the template string.
  - Enforcing the provision of all required variables with the correct types at compile time when calling `createPrompt`.

  This significantly reduces the risk of runtime errors caused by missing or misspelled prompt variables.

- [#65](https://github.com/VoltAgent/voltagent/pull/65) [`0651d35`](https://github.com/VoltAgent/voltagent/commit/0651d35442cda32b6057f8b7daf7fd8655a9a2a4) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Add OpenAPI (Swagger) Documentation for Core API - #64

  - Integrated `@hono/zod-openapi` and `@hono/swagger-ui` to provide interactive API documentation.
  - Documented the following core endpoints with request/response schemas, parameters, and examples:
    - `GET /agents`: List all registered agents.
    - `POST /agents/{id}/text`: Generate text response.
    - `POST /agents/{id}/stream`: Stream text response (SSE).
    - `POST /agents/{id}/object`: Generate object response (Note: Requires backend update to fully support JSON Schema input).
    - `POST /agents/{id}/stream-object`: Stream object response (SSE) (Note: Requires backend update to fully support JSON Schema input).
  - Added `/doc` endpoint serving the OpenAPI 3.1 specification in JSON format.
  - Added `/ui` endpoint serving the interactive Swagger UI.
  - Improved API discoverability:
    - Added links to Swagger UI and OpenAPI Spec on the root (`/`) endpoint.
    - Added links to Swagger UI in the server startup console logs.
  - Refactored API schemas and route definitions into `api.routes.ts` for better organization.
  - Standardized generation options (like `userId`, `temperature`, `maxTokens`) in the API schema with descriptions, examples, and sensible defaults.

## 0.1.7

### Patch Changes

- [`e328613`](https://github.com/VoltAgent/voltagent/commit/e32861366852f4bb7ad8854527b2bb6525703a25) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: prevent `ReferenceError: module is not defined` in ES module environments by adding guards around the CommonJS-specific `require.main === module` check in the main entry point.

## 0.1.6

### Patch Changes

- [#41](https://github.com/VoltAgent/voltagent/pull/41) [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c) Thanks [@omeraplak](https://github.com/omeraplak)! - ## Introducing Toolkits for Better Tool Management

  Managing related tools and their instructions is now simpler with `Toolkit`s.

  **Motivation:**

  - Defining shared instructions for multiple related tools was cumbersome.
  - The logic for deciding which instructions to add to the agent's system prompt could become complex.
  - We wanted a cleaner way to group tools logically.

  **What's New: The `Toolkit`**

  A `Toolkit` bundles related tools and allows defining shared `instructions` and an `addInstructions` flag _at the toolkit level_.

  ```typescript
  // packages/core/src/tool/toolkit.ts
  export type Toolkit = {
    /**
     * Unique identifier name for the toolkit.
     */
    name: string;
    /**
     * A brief description of what the toolkit does. Optional.
     */
    description?: string;
    /**
     * Shared instructions for the LLM on how to use the tools within this toolkit.
     * Optional.
     */
    instructions?: string;
    /**
     * Whether to automatically add the toolkit's `instructions` to the agent's system prompt.
     * Defaults to false.
     */
    addInstructions?: boolean;
    /**
     * An array of Tool instances that belong to this toolkit.
     */
    tools: Tool<any>[];
  };
  ```

  **Key Changes to Core:**

  1.  **`ToolManager` Upgrade:** Now manages both `Tool` and `Toolkit` objects.
  2.  **`AgentOptions` Update:** The `tools` option accepts `(Tool<any> | Toolkit)[]`.
  3.  **Simplified Instruction Handling:** `Agent` now only adds instructions from `Toolkit`s where `addInstructions` is true.

  This change leads to a clearer separation of concerns, simplifies the agent's internal logic, and makes managing tool instructions more predictable and powerful.

  ### New `createToolkit` Helper

  We've also added a helper function, `createToolkit`, to simplify the creation of toolkits. It provides default values and basic validation:

  ```typescript
  // packages/core/src/tool/toolkit.ts
  export const createToolkit = (options: Toolkit): Toolkit => {
    if (!options.name) {
      throw new Error("Toolkit name is required");
    }
    if (!options.tools || options.tools.length === 0) {
      console.warn(`Toolkit '${options.name}' created without any tools.`);
    }

    return {
      name: options.name,
      description: options.description || "", // Default empty description
      instructions: options.instructions,
      addInstructions: options.addInstructions || false, // Default to false
      tools: options.tools || [], // Default to empty array
    };
  };
  ```

  **Example Usage:**

  ```typescript
  import { createTool, createToolkit } from "@voltagent/core";
  import { z } from "zod";

  // Define some tools first
  const getWeather = createTool({
    name: "getWeather",
    description: "Gets the weather for a location.",
    schema: z.object({ location: z.string() }),
    run: async ({ location }) => ({ temperature: "25C", condition: "Sunny" }),
  });

  const searchWeb = createTool({
    name: "searchWeb",
    description: "Searches the web for a query.",
    schema: z.object({ query: z.string() }),
    run: async ({ query }) => ({ results: ["Result 1", "Result 2"] }),
  });

  // Create a toolkit using the helper
  const webInfoToolkit = createToolkit({
    name: "web_information",
    description: "Tools for getting information from the web.",
    addInstructions: true, // Add the instructions to the system prompt
    tools: [getWeather, searchWeb],
  });

  console.log(webInfoToolkit);
  /*
  Output:
  {
    name: 'web_information',
    description: 'Tools for getting information from the web.',
    instructions: 'Use these tools to find current information online.',
    addInstructions: true,
    tools: [ [Object Tool: getWeather], [Object Tool: searchWeb] ]
  }
  */
  ```

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:

  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.

- [#41](https://github.com/VoltAgent/voltagent/pull/41) [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c) Thanks [@omeraplak](https://github.com/omeraplak)! - ## Introducing Reasoning Tools Helper

  This update introduces a new helper function, `createReasoningTools`, to easily add step-by-step reasoning capabilities to your agents. #24

  ### New `createReasoningTools` Helper

  **Feature:** Easily add `think` and `analyze` tools for step-by-step reasoning.

  We've added a new helper function, `createReasoningTools`, which makes it trivial to equip your agents with structured thinking capabilities, similar to patterns seen in advanced AI systems.

  - **What it does:** Returns a pre-configured `Toolkit` named `reasoning_tools`.
  - **Tools included:** Contains the `think` tool (for internal monologue/planning) and the `analyze` tool (for evaluating results and deciding next steps).
  - **Instructions:** Includes detailed instructions explaining how the agent should use these tools iteratively to solve problems. You can choose whether these instructions are automatically added to the system prompt via the `addInstructions` option.

  ```typescript
  import { createReasoningTools, type Toolkit } from "@voltagent/core";

  // Get the reasoning toolkit (with instructions included in the system prompt)
  const reasoningToolkit: Toolkit = createReasoningTools({ addInstructions: true });

  // Get the toolkit without automatically adding instructions
  const reasoningToolkitManual: Toolkit = createReasoningTools({ addInstructions: false });
  ```

  ### How to Use Reasoning Tools

  Pass the `Toolkit` object returned by `createReasoningTools` directly to the agent's `tools` array.

  ```typescript
  // Example: Using the new reasoning tools helper
  import { Agent, createReasoningTools, type Toolkit } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const reasoningToolkit: Toolkit = createReasoningTools({
    addInstructions: true,
  });

  const agent = new Agent({
    name: "MyThinkingAgent",
    instructions: "An agent equipped with reasoning tools.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    tools: [reasoningToolkit], // Pass the toolkit
  });

  // Agent's system message will include reasoning instructions.
  ```

  This change simplifies adding reasoning capabilities to your agents.

## 0.1.5

### Patch Changes

- [#35](https://github.com/VoltAgent/voltagent/pull/35) [`9acbbb8`](https://github.com/VoltAgent/voltagent/commit/9acbbb898a517902cbdcb7ae7a8460e9d35f3dbe) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Prevent potential error when accessing debug option in LibSQLStorage - #34

  - Modified the `debug` method within the `LibSQLStorage` class.
  - Changed the access to `this.options.debug` to use optional chaining (`this.options?.debug`).

  This change prevents runtime errors that could occur in specific environments, such as Next.js, if the `debug` method is invoked before the `options` object is fully initialized or if `options` becomes unexpectedly `null` or `undefined`. It ensures the debug logging mechanism is more robust.

## 0.1.4

### Patch Changes

- [#27](https://github.com/VoltAgent/voltagent/pull/27) [`3c0829d`](https://github.com/VoltAgent/voltagent/commit/3c0829dcec4db9596147b583a9cf2d4448bc30f1) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve sub-agent context sharing for sequential task execution - #30

  Enhanced the Agent system to properly handle context sharing between sub-agents, enabling reliable sequential task execution. The changes include:

  - Adding `contextMessages` parameter to `getSystemMessage` method
  - Refactoring `prepareAgentsMemory` to properly format conversation history
  - Ensuring conversation context is correctly passed between delegated tasks
  - Enhancing system prompts to better handle sequential workflows

  This fixes issues where the second agent in a sequence would not have access to the first agent's output, causing failures in multi-step workflows.

## 0.1.1

- 🚀 **Introducing VoltAgent: TypeScript AI Agent Framework!**

  This initial release marks the beginning of VoltAgent, a powerful toolkit crafted for the JavaScript developer community. We saw the challenges: the complexity of building AI from scratch, the limitations of No-Code tools, and the lack of first-class AI tooling specifically for JS.

  ![VoltAgent Demo](https://cdn.voltagent.dev/readme/demo.gif)
  VoltAgent aims to fix that by providing the building blocks you need:

  - **`@voltagent/core`**: The foundational engine for agent capabilities.
  - **`@voltagent/voice`**: Easily add voice interaction.
  - **`@voltagent/vercel-ai`**: Seamless integration with [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction).
  - **`@voltagent/xsai`**: A Seamless integration with [xsAI](https://xsai.js.org/).
  - **`@voltagent/cli` & `create-voltagent-app`**: Quick start tools to get you building _fast_.

  We're combining the flexibility of code with the clarity of visual tools (like our **currently live [VoltAgent Console](https://console.voltagent.dev/)**) to make AI development easier, clearer, and more powerful. Join us as we build the future of AI in JavaScript!

  Explore the [Docs](https://voltagent.dev/docs/) and join our [Discord community](https://s.voltagent.dev/discord)!
