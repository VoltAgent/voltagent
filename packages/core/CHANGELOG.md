# @voltagent/core

## 0.1.69

### Patch Changes

- [#425](https://github.com/VoltAgent/voltagent/pull/425) [`8605e70`](https://github.com/VoltAgent/voltagent/commit/8605e708d17e6fa0150bd13235e795288422c52b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Promise-based properties and warnings to AI responses - #422

  Enhanced AI response types to align with Vercel AI SDK's API and provide better metadata:

  **For `streamObject`:**

  - Added optional `object?: Promise<T>` property that resolves to the final generated object
  - Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
  - Added optional `warnings?: Promise<any[] | undefined>` property for provider warnings

  **For `streamText`:**

  - Added optional `text?: Promise<string>` property that resolves to the full generated text
  - Added optional `finishReason?: Promise<string>` property that resolves to the reason generation stopped
  - Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
  - Added optional `reasoning?: Promise<string | undefined>` property that resolves to model's reasoning text

  **For `generateText` and `generateObject`:**

  - Added optional `reasoning?: string` property for model's reasoning text (generateText only)
  - Added optional `warnings?: any[]` property for provider warnings

  These properties are optional to maintain backward compatibility. Providers that support these features (like Vercel AI) now return these values, allowing users to access rich metadata:

  ```typescript
  // For streamObject
  const response = await agent.streamObject(input, schema);
  const finalObject = await response.object; // Promise<T>
  const usage = await response.usage; // Promise<UsageInfo>

  // For streamText
  const response = await agent.streamText(input);
  const fullText = await response.text; // Promise<string>
  const usage = await response.usage; // Promise<UsageInfo>

  // For generateText
  const response = await agent.generateText(input);
  console.log(response.warnings); // Any provider warnings
  console.log(response.reasoning); // Model's reasoning (if available)
  ```

## 0.1.68

### Patch Changes

- [#423](https://github.com/VoltAgent/voltagent/pull/423) [`089c039`](https://github.com/VoltAgent/voltagent/commit/089c03993e3b9e05655a1108355e7bee940d33a7) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add message type filtering support to memory storage implementations

  Added the ability to filter messages by type when retrieving conversation history. This enhancement allows the framework to distinguish between different message types (text, tool-call, tool-result) and retrieve only the desired types, improving context preparation for LLMs.

  ## Key Changes

  - **MessageFilterOptions**: Added optional `types` parameter to filter messages by type
  - **prepareConversationContext**: Now filters to only include text messages, excluding tool-call and tool-result messages for cleaner LLM context
  - **All storage implementations**: Added database-level filtering for better performance

  ## Usage

  ```typescript
  // Get only text messages
  const textMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
    types: ["text"],
  });

  // Get tool-related messages
  const toolMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
    types: ["tool-call", "tool-result"],
  });

  // Get all messages (default behavior - backward compatible)
  const allMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
  });
  ```

  ## Implementation Details

  - **InMemoryStorage**: Filters messages in memory after retrieval
  - **LibSQLStorage**: Adds SQL WHERE clause with IN operator for type filtering
  - **PostgreSQL**: Uses parameterized IN clause with proper parameter counting
  - **Supabase**: Utilizes query builder's `.in()` method for type filtering

  This change ensures that `prepareConversationContext` provides cleaner, more focused context to LLMs by excluding intermediate tool execution details, while maintaining full backward compatibility for existing code.

## 0.1.67

### Patch Changes

- [#417](https://github.com/VoltAgent/voltagent/pull/417) [`67450c3`](https://github.com/VoltAgent/voltagent/commit/67450c3bc4306ab6021ca8feed2afeef6dcc320e) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: dynamic toolkit resolution and VoltOps UI visibility

  Fixed an issue where dynamic tools and toolkits weren't being displayed in VoltOps UI when resolved during agent execution. The fix includes:

  **Key Changes:**

  - **Dynamic Tool Resolution**: Modified `prepareToolsForGeneration` to properly accept and process both `BaseTool` and `Toolkit` types
  - **VoltOps UI Integration**: Dynamic tools now appear in the Console UI by updating history metadata when tools are resolved
  - **Data Persistence**: Tools persist across page refreshes by storing them in history entry metadata

  **Technical Details:**

  - `prepareToolsForGeneration` now accepts `(BaseTool | Toolkit)[]` instead of just `BaseTool[]`
  - Uses temporary ToolManager with `addItems()` to handle both tools and toolkits consistently
  - Updates history entry metadata with complete agent snapshot when dynamic tools are resolved
  - Removed WebSocket-based TOOLS_UPDATE events in favor of metadata-based approach

  This ensures that dynamic tools like `createReasoningTools()` and other toolkits work seamlessly when provided through the `dynamicTools` parameter.

- [#418](https://github.com/VoltAgent/voltagent/pull/418) [`aa024c1`](https://github.com/VoltAgent/voltagent/commit/aa024c1a7c643b2aff7a5fd0d150c87f8a9a1858) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: memory storage implementations now correctly return the most recent messages when using context limit

  Fixed an issue where memory storage implementations (LibSQL, PostgreSQL, Supabase) were returning the oldest messages instead of the most recent ones when a context limit was specified. This was causing AI agents to lose important recent context in favor of old conversation history.

  **Before:**

  - `contextLimit: 10` returned the first 10 messages (oldest)
  - Agents were working with outdated context

  **After:**

  - `contextLimit: 10` returns the last 10 messages (most recent) in chronological order
  - Agents now have access to the most relevant recent context
  - InMemoryStorage was already working correctly and remains unchanged

  Changes:

  - LibSQLStorage: Modified query to use `ORDER BY DESC` with `LIMIT`, then reverse results
  - PostgreSQL: Modified query to use `ORDER BY DESC` with `LIMIT`, then reverse results
  - Supabase: Modified query to use `ascending: false` with `limit`, then reverse results

  This ensures consistent behavior across all storage implementations where context limits provide the most recent messages, improving AI agent response quality and relevance.

- [#418](https://github.com/VoltAgent/voltagent/pull/418) [`aa024c1`](https://github.com/VoltAgent/voltagent/commit/aa024c1a7c643b2aff7a5fd0d150c87f8a9a1858) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: tool errors now properly recorded in conversation history and allow agent retry - #349

  Fixed critical issues where tool execution errors were halting agent runs and not being recorded in conversation/event history. This prevented agents from retrying failed tool calls and lost important error context.

  **Before:**

  - Tool errors would throw and halt agent execution immediately
  - No error events or steps were recorded in conversation history
  - Agents couldn't learn from or retry after tool failures
  - Error context was lost, making debugging difficult

  **After:**

  - Tool errors are caught and handled gracefully
  - Error events (`tool:error`) are created and persisted
  - Error steps are added to conversation history with full error details
  - Agents can continue execution and retry within `maxSteps` limit
  - Tool lifecycle hooks (onEnd) are properly called even on errors

  Changes:

  - Added `handleToolError` helper method to centralize error handling logic
  - Modified `generateText` to catch and handle tool errors without halting execution
  - Updated `streamText` onError callback to use the same error handling
  - Ensured tool errors are saved to memory storage for context retention

  This improves agent resilience and debugging capabilities when working with potentially unreliable tools.

## 0.1.66

### Patch Changes

- [`1f8ce22`](https://github.com/VoltAgent/voltagent/commit/1f8ce226fec449f16f1dce6c2b96cef7030eff3a) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod peer dependency to allow flexible versioning (^3.24.2 instead of 3.24.2) to resolve npm install conflicts

## 0.1.65

### Patch Changes

- [#404](https://github.com/VoltAgent/voltagent/pull/404) [`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: integrate comprehensive logging system with @voltagent/logger support

  Enhanced the core package with a flexible logging infrastructure that supports both the built-in ConsoleLogger and the advanced @voltagent/logger package. This update provides better debugging, monitoring, and observability capabilities across all VoltAgent components.

  **Key Changes:**

  - **Logger Integration**: VoltAgent, Agents, and Workflows now accept a logger instance for centralized logging
  - **Default ConsoleLogger**: Built-in logger for quick prototyping with basic timestamp formatting
  - **Logger Propagation**: Parent loggers automatically create child loggers for agents and workflows
  - **Context Preservation**: Child loggers maintain context (component names, IDs) throughout execution
  - **Environment Variables**: Support for `VOLTAGENT_LOG_LEVEL` and `LOG_LEVEL` environment variables
  - **Backward Compatible**: Existing code works without changes, using the default ConsoleLogger

  **Installation:**

  ```bash
  # npm
  npm install @voltagent/logger

  # pnpm
  pnpm add @voltagent/logger

  # yarn
  yarn add @voltagent/logger
  ```

  **Usage Examples:**

  ```typescript
  // Using default ConsoleLogger
  const voltAgent = new VoltAgent({ agents: [agent] });

  // Using @voltagent/logger for production
  import { createPinoLogger } from "@voltagent/logger";

  const logger = createPinoLogger({ level: "info" });
  const voltAgent = new VoltAgent({
    logger,
    agents: [agent],
  });
  ```

  This update lays the foundation for comprehensive observability and debugging capabilities in VoltAgent applications.

- Updated dependencies [[`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726)]:
  - @voltagent/internal@0.0.6

## 0.1.64

### Patch Changes

- [`aea3c78`](https://github.com/VoltAgent/voltagent/commit/aea3c78c467e42c53d10ad6c0890514dff861fca) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: replace `npm-check-updates` with native package manager support

  This update replaces the `npm-check-updates` dependency with a native implementation that properly detects installed package versions and supports all major package managers (`npm`, `pnpm`, `yarn`, `bun`).

  ### Key improvements:

  - **Native package manager support**: Automatically detects and uses npm, pnpm, yarn, or bun based on lock files
  - **Accurate version detection**: Shows actual installed versions instead of package.json semver ranges (e.g., shows 1.0.63 instead of ^1.0.0)
  - **Monorepo compatibility**: Smart version detection that works with hoisted dependencies and workspace protocols
  - **Non-blocking startup**: Update checks run in background without slowing down application startup (70-80% faster)
  - **Intelligent caching**: 1-hour cache with package.json hash validation to reduce redundant checks
  - **Major version updates**: Fixed update commands to use add/install instead of update to handle breaking changes
  - **Restart notifications**: Added requiresRestart flag to API responses for better UX

  ### Technical details:

  - Removed execSync calls in favor of direct file system operations
  - Parallel HTTP requests to npm registry for better performance
  - Multiple fallback methods for version detection (direct access → require.resolve → tree search)
  - Background processing with Promise.resolve().then() for true async behavior

  This change significantly improves the developer experience with faster startup times and more accurate dependency information.

## 0.1.63

### Patch Changes

- [`6089462`](https://github.com/VoltAgent/voltagent/commit/60894629cef27950021da323390f455098b5bce2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: prevent duplicate column errors in LibSQL agent_history table initialization

  Fixed a first-time database initialization error where the `migrateAgentHistorySchema` function was attempting to add `userId` and `conversationId` columns that already existed in newly created `agent_history` tables.

  The issue occurred because:

  - The CREATE TABLE statement now includes `userId` and `conversationId` columns by default
  - The migration function was still trying to add these columns, causing "duplicate column name" SQLite errors

  Changes:

  - Added check in `migrateAgentHistorySchema` to skip migration if both columns already exist
  - Properly set migration flag to prevent unnecessary migration attempts
  - Ensured backward compatibility for older databases that need the migration

## 0.1.62

### Patch Changes

- [`6fadbb0`](https://github.com/VoltAgent/voltagent/commit/6fadbb098fe40d8b658aa3386e6126fea155f117) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: createAsyncIterableStream import issue

- Updated dependencies [[`6fadbb0`](https://github.com/VoltAgent/voltagent/commit/6fadbb098fe40d8b658aa3386e6126fea155f117)]:
  - @voltagent/internal@0.0.5

## 0.1.61

### Patch Changes

- [#391](https://github.com/VoltAgent/voltagent/pull/391) [`57c4874`](https://github.com/VoltAgent/voltagent/commit/57c4874d4d4807c50242b2e34ab9574fc6129888) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: improve workflow execute API with context-based pattern

  Breaking change: The workflow execute functions now use a context-based API for better developer experience and extensibility.

  **Before:**

  ```typescript
  .andThen({
    execute: async (data, state) => {
      // old API with separate parameters
      return { ...data, processed: true };
    }
  })
  ```

  **After:**

  ```typescript
  .andThen({
    execute: async ({ data, state, getStepData }) => {
      // new API with context object
      const previousStep = getStepData("step-id");
      return { ...data, processed: true };
    }
  })
  ```

  This change applies to:

  - `andThen` execute functions
  - `andAgent` prompt functions
  - `andWhen` condition functions
  - `andTap` execute functions

  The new API provides:

  - Better TypeScript inference
  - Access to previous step data via `getStepData`
  - Cleaner, more extensible design

- [#399](https://github.com/VoltAgent/voltagent/pull/399) [`da66f86`](https://github.com/VoltAgent/voltagent/commit/da66f86d92a278007c2d3386d22b482fa70d93ff) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add suspend/resume functionality for workflows

  **Workflows can now be paused and resumed!** Perfect for human-in-the-loop processes, waiting for external events, or managing long-running operations.

  ## Two Ways to Suspend

  ### 1. Internal Suspension (Inside Steps)

  ```typescript
  const approvalWorkflow = createWorkflowChain({
    id: "simple-approval",
    name: "Simple Approval",
    input: z.object({ item: z.string() }),
    result: z.object({ approved: z.boolean() }),
  }).andThen({
    id: "wait-for-approval",
    execute: async ({ data, suspend, resumeData }) => {
      // If resuming, return the decision
      if (resumeData) {
        return { approved: resumeData.approved };
      }

      // Otherwise suspend and wait
      await suspend("Waiting for approval");
    },
  });

  // Run and resume
  const execution = await approvalWorkflow.run({ item: "New laptop" });
  const result = await execution.resume({ approved: true });
  ```

  ### 2. External Suspension (From Outside)

  ```typescript
  import { createSuspendController } from "@voltagent/core";

  // Create controller
  const controller = createSuspendController();

  // Run workflow with controller
  const execution = await workflow.run(input, {
    suspendController: controller,
  });

  // Pause from outside (e.g., user clicks pause)
  controller.suspend("User paused workflow");

  // Resume later
  if (execution.status === "suspended") {
    const result = await execution.resume();
  }
  ```

  ## Key Features

  - ⏸️ **Internal suspension** with `await suspend()` inside steps
  - 🎮 **External control** with `createSuspendController()`
  - 📝 **Type-safe resume data** with schemas
  - 💾 **State persists** across server restarts
  - 🚀 **Simplified API** - just pass `suspendController`, no need for separate `signal`

  📚 **For detailed documentation: [https://voltagent.dev/docs/workflows/suspend-resume](https://voltagent.dev/docs/workflows/suspend-resume)**

- [#401](https://github.com/VoltAgent/voltagent/pull/401) [`4a7145d`](https://github.com/VoltAgent/voltagent/commit/4a7145debd66c7b1dfb953608e400b6c1ed02db7) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve TypeScript performance issues by fixing Zod dependency configuration (#377)

  Moved Zod from direct dependencies to peer dependencies in @voltagent/vercel-ai to prevent duplicate Zod installations that were causing TypeScript server slowdowns. Also standardized Zod versions across the workspace to ensure consistency.

  Changes:

  - @voltagent/vercel-ai: Moved `zod` from dependencies to peerDependencies
  - @voltagent/docs-mcp: Updated `zod` from `^3.23.8` to `3.24.2`
  - @voltagent/with-postgres: Updated `zod` from `^3.24.2` to `3.24.2` (removed caret)

  This fix significantly improves TypeScript language server performance by ensuring only one Zod version is processed, eliminating the "Type instantiation is excessively deep and possibly infinite" errors that users were experiencing.

## 0.1.60

### Patch Changes

- [#371](https://github.com/VoltAgent/voltagent/pull/371) [`6ddedc2`](https://github.com/VoltAgent/voltagent/commit/6ddedc2b9be9c3dc4978dc53198a43c2cba74945) Thanks [@omeraplak](https://github.com/omeraplak)! - This update adds a powerful, type-safe workflow engine to `@voltagent/core`. You can now build complex, multi-step processes that chain together your code, AI models, and conditional logic with full type-safety and built-in observability.

  Here is a quick example of what you can build:

  ```typescript
  import { createWorkflowChain, Agent, VoltAgent } from "@voltagent/core";
  import { z } from "zod";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // Define an agent to use in the workflow
  const analyzerAgent = new Agent({
    name: "Analyzer",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "You are a text analyzer.",
  });

  // 1. Define the workflow chain
  const workflow = createWorkflowChain({
    id: "greeting-analyzer",
    name: "Greeting Analyzer",
    input: z.object({ name: z.string() }),
    result: z.object({ greeting: z.string(), sentiment: z.string() }),
  })
    .andThen({
      id: "create-greeting",
      execute: async ({ name }) => ({ greeting: `Hello, ${name}!` }),
    })
    .andAgent(
      (data) => `Analyze the sentiment of this greeting: "${data.greeting}"`,
      analyzerAgent,
      {
        schema: z.object({ sentiment: z.string().describe("e.g., positive") }),
      }
    );

  // You can run the chain directly
  const result = await workflow.run({ name: "World" });
  ```

  To make your workflow runs visible in the **VoltOps Console** for debugging and monitoring, register both the workflow and its agents with a `VoltAgent` instance:

  ![VoltOps Workflow Observability](https://cdn.voltagent.dev/docs/workflow-observability-demo.gif)

  ```typescript
  // 2. Register the workflow and agent to enable observability
  new VoltAgent({
    agents: {
      analyzerAgent,
    },
    workflows: {
      workflow,
    },
  });

  // Now, when you run the workflow, its execution will appear in VoltOps.
  await workflow.run({ name: "Alice" });
  ```

  This example showcases the fluent API, data flow between steps, type-safety, and integration with Agents, which are the core pillars of this new feature.

## 0.1.59

### Patch Changes

- [#382](https://github.com/VoltAgent/voltagent/pull/382) [`86acef0`](https://github.com/VoltAgent/voltagent/commit/86acef01dd6ce2e213b13927136c32bcf1078484) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Allow workflow.run to accept userContext, conversationId, and userId and pass along to all steps & agents

- [#375](https://github.com/VoltAgent/voltagent/pull/375) [`1f55501`](https://github.com/VoltAgent/voltagent/commit/1f55501ec7a221002c11a3a0e87779c8f1379bed) Thanks [@SashankMeka1](https://github.com/SashankMeka1)! - feat(core): MCPServerConfig timeouts - #363.

  Add MCPServerConfig timeouts

  ```ts
  const mcpConfig = new MCPConfiguration({
    servers: {
      filesystem: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", path.resolve("./data")],
        timeout: 10000,
      },
    },
  });
  ```

- [#385](https://github.com/VoltAgent/voltagent/pull/385) [`bfb13c3`](https://github.com/VoltAgent/voltagent/commit/bfb13c390a8ff59ad61a08144a5f6fa0439d25b7) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core): Add back the result for a workflow execution, as the result was removed due to change in state management process

- [#384](https://github.com/VoltAgent/voltagent/pull/384) [`757219c`](https://github.com/VoltAgent/voltagent/commit/757219cc76e7f0320074230788012714f91e81bb) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat(core): Add ability to pass hooks into the generate functions (i.e. streamText) that do not update/mutate the agent hooks

  ### Usage

  ```ts
  const agent = new Agent({
    name: "My Agent with Hooks",
    instructions: "An assistant demonstrating hooks",
    llm: provider,
    model: openai("gpt-4o"),
    hooks: myAgentHooks,
  });

  // both the myAgentHooks and the hooks passed in the generateText method will be called
  await agent.generateText("Hello, how are you?", {
    hooks: {
      onEnd: async ({ context }) => {
        console.log("End of generation but only on this invocation!");
      },
    },
  });
  ```

- [#381](https://github.com/VoltAgent/voltagent/pull/381) [`b52cdcd`](https://github.com/VoltAgent/voltagent/commit/b52cdcd2d8072fa93011e14c41841b6ff8a97b0b) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat: Add ability to tap into workflow without mutating the data by adding the `andTap` step

  ### Usage

  The andTap step is useful when you want to tap into the workflow without mutating the data, for example:

  ```ts
  const workflow = createWorkflowChain(config)
    .andTap({
      execute: async (data) => {
        console.log("🔄 Translating text:", data);
      },
    })
    .andTap({
      id: "sleep",
      execute: async (data) => {
        console.log("🔄 Sleeping for 1 second");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return data;
      },
    })
    .andThen({
      execute: async (data) => {
        return { ...data, translatedText: data.translatedText };
      },
    })
    .run({
      originalText: "Hello, world!",
      targetLanguage: "en",
    });
  ```

  You will notice that the `andTap` step is not included in the result, BUT it is `awaited` and `executed` before the next step, so you can block processing safely if needed.

## 0.1.58

### Patch Changes

- [#342](https://github.com/VoltAgent/voltagent/pull/342) [`8448674`](https://github.com/VoltAgent/voltagent/commit/84486747b1b40eaca315b900c56fd2ad976780ea) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat: add Workflow support (alpha)

  **🧪 ALPHA FEATURE: Workflow orchestration system is now available for early testing.** This feature allows you to create complex, multi-step agent workflows with chaining API and conditional branching. The API is experimental and may change in future releases.

  ## 📋 Usage

  **Basic Workflow Chain Creation:**

  ```typescript
  import { openai } from "@ai-sdk/openai";
  import { Agent, VoltAgent, createWorkflowChain } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { z } from "zod";

  // Create workflow agents
  const analyzerAgent = new Agent({
    name: "DataAnalyzer",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "Analyze input data and extract key insights with confidence scores",
  });

  const processorAgent = new Agent({
    name: "DataProcessor",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "Process and transform analyzed data into structured format",
  });

  const reporterAgent = new Agent({
    name: "ReportGenerator",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "Generate comprehensive reports from processed data",
  });

  // Create workflow chain
  const dataProcessingWorkflow = createWorkflowChain({
    id: "data-processing-workflow",
    name: "Data Processing Pipeline",
    purpose: "Analyze, process, and generate reports from raw data",
    input: z.object({
      rawData: z.string(),
      analysisType: z.string(),
    }),
    result: z.object({
      originalData: z.string(),
      analysisResults: z.object({
        insights: z.array(z.string()),
        confidence: z.number().min(0).max(1),
      }),
      processedData: z.object({
        summary: z.string(),
        keyPoints: z.array(z.string()),
      }),
      finalReport: z.string(),
      processingTime: z.number(),
    }),
  })
    .andAgent(
      async (data) => {
        return `Analyze the following data: ${data.rawData}. Focus on ${data.analysisType} analysis.`;
      },
      analyzerAgent,
      {
        schema: z.object({
          insights: z.array(z.string()),
          confidence: z.number().min(0).max(1),
        }),
      }
    )
    .andThen({
      execute: async (data, state) => {
        // Skip processing if confidence is too low
        if (data.confidence < 0.5) {
          throw new Error(`Analysis confidence too low: ${data.confidence}`);
        }
        return {
          analysisResults: data,
          originalData: state.input.rawData,
        };
      },
    })
    .andAgent(
      async (data, state) => {
        return `Process these insights: ${JSON.stringify(data.analysisResults.insights)}`;
      },
      processorAgent,
      {
        schema: z.object({
          summary: z.string(),
          keyPoints: z.array(z.string()),
        }),
      }
    )
    .andAgent(
      async (data, state) => {
        return `Generate a final report based on: ${JSON.stringify(data)}`;
      },
      reporterAgent,
      {
        schema: z.object({
          finalReport: z.string(),
        }),
      }
    )
    .andThen({
      execute: async (data, state) => {
        return {
          ...data,
          processingTime: Date.now() - state.startAt.getTime(),
        };
      },
    });

  // Execute workflow
  const result = await dataProcessingWorkflow.run({
    rawData: "User input data...",
    analysisType: "sentiment",
  });

  console.log(result.analysisResults); // Analysis results
  console.log(result.finalReport); // Generated report
  ```

  **Conditional Logic Example:**

  ```typescript
  const conditionalWorkflow = createWorkflowChain({
    id: "conditional-workflow",
    name: "Smart Processing Pipeline",
    purpose: "Process data based on complexity level",
    input: z.object({
      data: z.string(),
    }),
    result: z.object({
      complexity: z.string(),
      processedData: z.string(),
      processingMethod: z.string(),
    }),
  })
    .andAgent(
      async (data) => {
        return `Analyze complexity of: ${data.data}`;
      },
      validatorAgent,
      {
        schema: z.object({
          complexity: z.enum(["low", "medium", "high"]),
        }),
      }
    )
    .andThen({
      execute: async (data, state) => {
        // Route to different processing based on complexity
        if (data.complexity === "low") {
          return { ...data, processingMethod: "simple" };
        } else {
          return { ...data, processingMethod: "advanced" };
        }
      },
    })
    .andAgent(
      async (data, state) => {
        if (data.processingMethod === "simple") {
          return `Simple processing for: ${state.input.data}`;
        } else {
          return `Advanced processing for: ${state.input.data}`;
        }
      },
      data.processingMethod === "simple" ? simpleProcessor : advancedProcessor,
      {
        schema: z.object({
          processedData: z.string(),
        }),
      }
    );
  ```

  **⚠️ Alpha Limitations:**

  - **NOT READY FOR PRODUCTION** - This is an experimental feature
  - Visual flow UI integration is in development
  - Error handling and recovery mechanisms are basic
  - Performance optimizations pending
  - **API may change significantly** based on community feedback
  - Limited documentation and examples

  **🤝 Help Shape Workflows:**
  We need your feedback to make Workflows awesome! The API will evolve based on real-world usage and community input.

  - 💬 **[Join our Discord](https://s.voltagent.dev/discord)**: Share ideas, discuss use cases, and get help
  - 🐛 **[GitHub Issues](https://github.com/VoltAgent/voltagent/issues)**: Report bugs, request features, or suggest improvements
  - 🚀 **Early Adopters**: Build experimental projects and share your learnings
  - 📝 **API Feedback**: Tell us what's missing, confusing, or could be better

  **🔄 Future Plans:**

  - React Flow integration for visual workflow editor
  - Advanced error handling and retry mechanisms
  - Workflow templates and presets
  - Real-time execution monitoring
  - Comprehensive documentation and tutorials

## 0.1.57

### Patch Changes

- [`894be7f`](https://github.com/VoltAgent/voltagent/commit/894be7feb97630c10e036cf3691974a5e351472c) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: export PromptContent type to resolve "cannot be named" TypeScript error

## 0.1.56

### Patch Changes

- [#351](https://github.com/VoltAgent/voltagent/pull/351) [`f8f8d04`](https://github.com/VoltAgent/voltagent/commit/f8f8d04340d6f9609450f6ae000c9fe1d71072d7) Thanks [@alasano](https://github.com/alasano)! - fix: add historyMemory option to Agent configuration

## 0.1.55

### Patch Changes

- [#352](https://github.com/VoltAgent/voltagent/pull/352) [`b7dcded`](https://github.com/VoltAgent/voltagent/commit/b7dcdedfbbdda5bfb1885317b59b4d4e2495c956) Thanks [@alasano](https://github.com/alasano)! - fix(core): store and use userContext from Agent constructor

- [#345](https://github.com/VoltAgent/voltagent/pull/345) [`822739c`](https://github.com/VoltAgent/voltagent/commit/822739c901bbc679cd11dd2c9df99cd041fc40c7) Thanks [@thujee](https://github.com/thujee)! - fix: moves zod from direct to dev dependency to avoid version conflicts in consuming app

## 0.1.54

### Patch Changes

- [#346](https://github.com/VoltAgent/voltagent/pull/346) [`5100f7f`](https://github.com/VoltAgent/voltagent/commit/5100f7f9419db7e26aa18681b0ad3c09c0957b10) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: export PromptContent type to resolve "cannot be named" TypeScript error

  Fixed a TypeScript compilation error where users would get "cannot be named" errors when exporting variables that use `InstructionsDynamicValue` type. This occurred because `InstructionsDynamicValue` references `PromptContent` type, but `PromptContent` was not being re-exported from the public API.

  **Before:**

  ```typescript
  export type { DynamicValueOptions, DynamicValue, PromptHelper };
  ```

  **After:**

  ```typescript
  export type { DynamicValueOptions, DynamicValue, PromptHelper, PromptContent };
  ```

  This ensures that all types referenced by public API types are properly exported, preventing TypeScript compilation errors when users export agents or variables that use dynamic instructions.

## 0.1.53

### Patch Changes

- [#343](https://github.com/VoltAgent/voltagent/pull/343) [`096bda4`](https://github.com/VoltAgent/voltagent/commit/096bda41d5333e110da2c034e57f60b4ce7b9076) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: extend SubAgent functionality with support for multiple execution methods and flexible configuration API

  **SubAgent functionality has been significantly enhanced to support all four agent execution methods (generateText, streamText, generateObject, streamObject) with flexible per-subagent configuration.** Previously, SubAgents only supported `streamText` method. Now you can configure each SubAgent to use different execution methods with custom options and schemas.

  ## 📋 Usage

  **New SubAgent API with createSubagent():**

  ```typescript
  import { Agent, createSubagent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";
  import { z } from "zod";

  // Define schemas for structured output
  const analysisSchema = z.object({
    summary: z.string(),
    keyFindings: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  });

  const reportSchema = z.object({
    title: z.string(),
    sections: z.array(
      z.object({
        heading: z.string(),
        content: z.string(),
        priority: z.enum(["high", "medium", "low"]),
      })
    ),
  });

  // Create specialized subagents
  const dataAnalyst = new Agent({
    name: "DataAnalyst",
    instructions: "Analyze data and provide structured insights",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  const reportGenerator = new Agent({
    name: "ReportGenerator",
    instructions: "Generate comprehensive reports",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  const summaryWriter = new Agent({
    name: "SummaryWriter",
    instructions: "Create concise summaries",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Supervisor with enhanced SubAgent configuration
  const supervisor = new Agent({
    name: "AdvancedSupervisor",
    instructions: "Coordinate specialized agents with different methods",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    subAgents: [
      // ✅ OLD STYLE: Direct agent (defaults to streamText) - still supported
      summaryWriter,

      // ✅ NEW STYLE: generateObject with schema
      createSubagent({
        agent: dataAnalyst,
        method: "generateObject",
        schema: analysisSchema,
        options: {
          temperature: 0.3, // Precise analysis
          maxTokens: 1500,
        },
      }),

      // ✅ NEW STYLE: streamObject with schema
      createSubagent({
        agent: reportGenerator,
        method: "streamObject",
        schema: reportSchema,
        options: {
          temperature: 0.5,
          maxTokens: 2000,
        },
      }),

      // ✅ NEW STYLE: generateText with custom options
      createSubagent({
        agent: summaryWriter,
        method: "generateText",
        options: {
          temperature: 0.7, // Creative writing
          maxTokens: 800,
        },
      }),
    ],
  });
  ```

  **Backward Compatibility:**

  ```typescript
  // ✅ OLD STYLE: Still works (defaults to streamText)
  const supervisor = new Agent({
    name: "Supervisor",
    subAgents: [agent1, agent2, agent3], // Direct Agent instances
    // ... other config
  });
  ```

- [#344](https://github.com/VoltAgent/voltagent/pull/344) [`5d908c5`](https://github.com/VoltAgent/voltagent/commit/5d908c5a83569848c91d86c5ecfcd3d4d4ffae42) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add supervisorConfig API for customizing supervisor agent behavior

  **SupervisorConfig API enables complete control over supervisor agent system messages and behavior** when working with SubAgents, allowing users to customize guidelines, override system messages, and control memory inclusion.

  ## 🎯 What's New

  **🚀 SupervisorConfig API:**

  ```typescript
  const supervisor = new Agent({
    name: "Custom Supervisor",
    instructions: "Coordinate specialized tasks",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    subAgents: [writerAgent, editorAgent],

    supervisorConfig: {
      // Complete system message override
      systemMessage: "You are TaskBot. Use delegate_task to assign work.",

      // Add custom rules to default guidelines
      customGuidelines: ["Always verify sources", "Include confidence levels"],

      // Control memory inclusion (default: true)
      includeAgentsMemory: false,
    },
  });
  ```

  ## 🔧 Configuration Options

  - **`systemMessage`**: Complete system message override - replaces default template
  - **`customGuidelines`**: Add custom rules to default supervisor guidelines
  - **`includeAgentsMemory`**: Control whether previous agent interactions are included

- [#340](https://github.com/VoltAgent/voltagent/pull/340) [`ef778c5`](https://github.com/VoltAgent/voltagent/commit/ef778c543acb229edd049da2e7bbed2ae5fe40cf) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: separate conversation memory from history storage when memory: false

  When `memory: false` is set, conversation memory and user messages should be disabled, but history storage and timeline events should continue working. Previously, both conversation memory and history storage were being disabled together.

  **Before:**

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    instructions: "You are a helpful assistant",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    memory: false, // ❌ Disabled both conversation memory AND history storage
  });

  // Result: No conversation context + No history/events tracking
  ```

  **After:**

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    instructions: "You are a helpful assistant",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    memory: false, // ✅ Disables only conversation memory, history storage remains active
  });

  // Result: No conversation context + History/events tracking still works
  ```

  **What this means for users:**

  - ✅ `memory: false` now only disables conversation memory (user messages and context)
  - ✅ History storage and timeline events continue to work for debugging and observability
  - ✅ Agent interactions are still tracked in VoltAgent Console
  - ✅ Tools and sub-agents can still access operation context and history

  This change improves the observability experience while maintaining the expected behavior of disabling conversation memory when `memory: false` is set.

  Fixes the issue where setting `memory: false` would prevent history and events from being tracked in the VoltAgent Console.

## 0.1.52

### Patch Changes

- [#338](https://github.com/VoltAgent/voltagent/pull/338) [`3e9a863`](https://github.com/VoltAgent/voltagent/commit/3e9a8631c0e4774d0623825263040ad3a14c23d0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: implement configurable maxSteps parameter with parent-child agent inheritance

  **Agents now support configurable maxSteps parameter at the API level, allowing fine-grained control over computational resources. Parent agents automatically pass their effective maxSteps to subagents, ensuring consistent resource management across the agent hierarchy.**

  ## 🎯 What's New

  **🚀 Configurable MaxSteps System**

  - **API-Level Configuration**: Set maxSteps dynamically for any agent call
  - **Agent-Level Defaults**: Configure default maxSteps when creating agents
  - **Automatic Inheritance**: SubAgents automatically inherit parent's effective maxSteps
  - **Configurable Supervisor**: Enhanced supervisor system message generation with agent memory

  ## 📋 Usage Examples

  **API-Level MaxSteps Configuration:**

  ```typescript
  import { Agent, VoltAgent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // Create agent with default maxSteps
  const agent = new Agent({
    name: "AssistantAgent",
    instructions: "Help users with their questions",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    maxSteps: 10, // Default maxSteps for this agent
  });

  // Usage examples:

  // 1. Use agent's default maxSteps (10)
  const result1 = await agent.generateText("Simple question");

  // 2. Override with API-level maxSteps
  const result2 = await agent.generateText("Complex question", {
    maxSteps: 25, // Override agent's default (10) with API-level (25)
  });

  // 3. Stream with custom maxSteps
  const stream = await agent.streamText("Long conversation", {
    maxSteps: 50, // Allow more steps for complex interactions
  });

  // 4. Generate object with specific maxSteps
  const objectResult = await agent.generateObject("Create structure", schema, {
    maxSteps: 5, // Limit steps for simple object generation
  });
  ```

  **Parent-Child Agent Inheritance:**

  ```typescript
  // Create specialized subagents
  const contentCreator = new Agent({
    name: "ContentCreator",
    instructions: "Create engaging content",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  const formatter = new Agent({
    name: "Formatter",
    instructions: "Format and style content",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Create supervisor with subagents
  const supervisor = new Agent({
    name: "Supervisor",
    instructions: "Coordinate content creation and formatting",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    subAgents: [contentCreator, formatter],
    maxSteps: 15, // Agent limit
  });

  // Parent-child inheritance examples:

  // 1. Use supervisor's default maxSteps
  const result1 = await supervisor.generateText("Create a blog post");
  // Supervisor uses: maxSteps: 15
  // SubAgents inherit: maxSteps: 15

  // 2. Override with API-level maxSteps
  const result2 = await supervisor.generateText("Create a blog post", {
    maxSteps: 8, // API-level override
  });
  // Supervisor uses: maxSteps: 8
  // SubAgents inherit: maxSteps: 8

  // 3. Direct subagent calls use their own defaults
  const directResult = await contentCreator.generateText("Create content");
  // Uses contentCreator's own maxSteps or default calculation
  ```

  **REST API Usage:**

  ```bash
  # with generateText
  curl -X POST http://localhost:3141/agents/my-agent-id/generate \
       -H "Content-Type: application/json" \
       -d '{
         "input": "Explain quantum physics",
         "options": {
           "maxSteps": 10,
         }
       }'

  # with streamText
  curl -N -X POST http://localhost:3141/agents/supervisor-agent-id/stream \
       -H "Content-Type: application/json" \
       -d '{
         "input": "Coordinate research and writing workflow",
         "options": {
           "maxSteps": 15,
         }
       }'
  ```

  This enhancement provides fine-grained control over agent computational resources while maintaining backward compatibility with existing agent configurations.

## 0.1.51

### Patch Changes

- [#333](https://github.com/VoltAgent/voltagent/pull/333) [`721372a`](https://github.com/VoltAgent/voltagent/commit/721372a59edab1095ee608488ca96b81326fd1cc) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add abort signal support for operation cancellation

  **Abort Signal Support enables graceful cancellation of agent operations.** Users can now cancel expensive operations when they navigate away or change their minds.

  ## 🎯 Key Features

  - **Stream API Cancellation**: `/stream` and `/stream-object` endpoints now handle client disconnection automatically
  - **Agent Method Support**: All agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) support abort signals
  - **SubAgent Propagation**: Abort signals cascade through sub-agent hierarchies

  ## 📋 Usage

  ```typescript
  // Create AbortController
  const abortController = new AbortController();

  // Cancel when user navigates away or clicks stop
  window.addEventListener("beforeunload", () => abortController.abort());

  // Stream request with abort signal
  const response = await fetch("http://localhost:3141/agents/my-agent/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: "Write a very long story...",
      options: { maxTokens: 4000 },
    }),
    signal: abortController.signal, // ✅ Automatic cancellation
  });

  // Manual cancellation after 10 seconds
  setTimeout(() => abortController.abort(), 10000);
  ```

  This prevents unnecessary computation and improves resource efficiency.

## 0.1.50

### Patch Changes

- [#329](https://github.com/VoltAgent/voltagent/pull/329) [`9406552`](https://github.com/VoltAgent/voltagent/commit/94065520f51a1743be91c3b5be9ab5370d47f666) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: userContext changes in onEnd hook now properly reflected in final response

  The `userContext` changes made in the `onEnd` hook were not being reflected in the final response from `.generateText()` and `.generateObject()` methods. This was because the userContext snapshot was taken before the `onEnd` hook execution, causing any modifications made within the hook to be lost.

  **Before**:

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    hooks: createHooks({
      onEnd: ({ context }) => {
        // This change was lost in the final response
        context.userContext.set("agent_response", "bye");
      },
    }),
  });

  const response = await agent.generateText("Hello", {
    userContext: new Map([["agent_response", "hi"]]),
  });

  console.log(response.userContext?.get("agent_response")); // ❌ "hi" (old value)
  ```

  **After**:

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    hooks: createHooks({
      onEnd: ({ context }) => {
        // This change is now preserved in the final response
        context.userContext.set("agent_response", "bye");
      },
    }),
  });

  const response = await agent.generateText("Hello", {
    userContext: new Map([["agent_response", "hi"]]),
  });

  console.log(response.userContext?.get("agent_response")); // ✅ "bye" (updated value)
  ```

## 0.1.49

### Patch Changes

- [#324](https://github.com/VoltAgent/voltagent/pull/324) [`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add enterprise-grade VoltOps Prompt Management platform with team collaboration and analytics

  **VoltOps Prompt Management transforms VoltAgent from a simple framework into an enterprise-grade platform for managing AI prompts at scale.** Think "GitHub for prompts" with built-in team collaboration, version control, environment management, and performance analytics.

  ## 🎯 What's New

  **🚀 VoltOps Prompt Management Platform**

  - **Team Collaboration**: Non-technical team members can edit prompts via web console
  - **Version Control**: Full prompt versioning with commit messages and rollback capabilities
  - **Environment Management**: Promote prompts from development → staging → production with labels
  - **Template Variables**: Dynamic `{{variable}}` substitution with validation
  - **Performance Analytics**: Track prompt effectiveness, costs, and usage patterns

  ## 📋 Usage Examples

  **Basic VoltOps Setup:**

  ```typescript
  import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // 1. Initialize VoltOps client
  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTOPS_PUBLIC_KEY,
    secretKey: process.env.VOLTOPS_SECRET_KEY,
  });

  // 2. Create agent with VoltOps prompts
  const supportAgent = new Agent({
    name: "SupportAgent",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: async ({ prompts }) => {
      return await prompts.getPrompt({
        promptName: "customer-support-prompt",
        label: process.env.NODE_ENV === "production" ? "production" : "development",
        variables: {
          companyName: "VoltAgent Corp",
          tone: "friendly and professional",
          supportLevel: "premium",
        },
      });
    },
  });

  // 3. Initialize VoltAgent with global VoltOps client
  const voltAgent = new VoltAgent({
    agents: { supportAgent },
    voltOpsClient: voltOpsClient,
  });
  ```

- [#324](https://github.com/VoltAgent/voltagent/pull/324) [`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce VoltOpsClient as unified replacement for deprecated telemetryExporter

  **VoltOpsClient** is the new unified platform client for VoltAgent that replaces the deprecated `telemetryExporter`.

  ## 📋 Usage

  ```typescript
  import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";

  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTOPS_PUBLIC_KEY,
    secretKey: process.env.VOLTOPS_SECRET_KEY,
    observability: true, // Enable observability - default is true
    prompts: true, // Enable prompt management - default is true
  });

  const voltAgent = new VoltAgent({
    agents: { myAgent },
    voltOpsClient: voltOpsClient, // ✅ New approach
  });
  ```

  ## 🔄 Migration from telemetryExporter

  Replace the deprecated `telemetryExporter` with the new `VoltOpsClient`:

  ```diff
  import { Agent, VoltAgent } from "@voltagent/core";
  - import { VoltAgentExporter } from "@voltagent/core";
  + import { VoltOpsClient } from "@voltagent/core";

  const voltAgent = new VoltAgent({
    agents: { myAgent },
  - telemetryExporter: new VoltAgentExporter({
  + voltOpsClient: new VoltOpsClient({
      publicKey: process.env.VOLTOPS_PUBLIC_KEY,
      secretKey: process.env.VOLTOPS_SECRET_KEY,
  -   baseUrl: "https://api.voltagent.dev",
    }),
  });
  ```

  ## ⚠️ Deprecation Notice

  `telemetryExporter` is now **deprecated** and will be removed in future versions:

  ```typescript
  // ❌ Deprecated - Don't use
  new VoltAgent({
    agents: { myAgent },
    telemetryExporter: new VoltAgentExporter({...}), // Deprecated!
  });

  // ✅ Correct approach
  new VoltAgent({
    agents: { myAgent },
    voltOpsClient: new VoltOpsClient({...}),
  });
  ```

  **For migration guide, see:** `/docs/observability/developer-console#migration-guide`

  ## 🔧 Advanced Configuration

  ```typescript
  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTOPS_PUBLIC_KEY,
    secretKey: process.env.VOLTOPS_SECRET_KEY,
    baseUrl: "https://api.voltagent.dev", // Default
    observability: true, // Enable observability export - default is true
    prompts: false, // Observability only - default is true
    promptCache: {
      enabled: true, // Enable prompt cache - default is true
      ttl: 300, // 5 minute cache - default is 300
      maxSize: 100, // Max size of the cache - default is 100
    },
  });
  ```

- Updated dependencies [[`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479)]:
  - @voltagent/internal@0.0.4

## 0.1.48

### Patch Changes

- [#296](https://github.com/VoltAgent/voltagent/pull/296) [`4621e09`](https://github.com/VoltAgent/voltagent/commit/4621e09118fc652d8a05f40758b02d5108e38967) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - The `UserContext` was properly propagated through tools and hooks, but was not being returned in the final response from `.generateText()` and `.generateObject()` methods. This prevented post-processing logic from accessing the UserContext data.

  **Before**:

  ```typescript
  const result = await agent.generateText(...);

  result.userContext; // ❌ Missing userContext
  ```

  **After**:

  ```typescript
  const result = await agent.generateText(...);

  return result.userContext; // ✅ Includes userContext

  **How users can see the changes**:

  Now users can access the `userContext` in the response from all agent methods:

  // Set custom context before calling the agent
  const customContext = new Map();
  customContext.set("sessionId", "user-123");
  customContext.set("requestId", "req-456");

  // generateText now returns userContext
  const result = await agent.generateText("Hello", {
    userContext: customContext,
  });

  // Access the userContext from the response
  console.log(result.userContext.get("sessionId")); // 'user-123'
  console.log(result.userContext.get("requestId")); // 'req-456'

  // GenerateObject
  const objectResult = await agent.generateObject("Create a summary", schema, {
    userContext: customContext,
  });
  console.log(objectResult.userContext.get("sessionId")); // 'user-123'

  // Streaming methods
  const streamResult = await agent.streamText("Hello", {
    userContext: customContext,
  });
  console.log(streamResult.userContext?.get("sessionId")); // 'user-123'
  ```

  Fixes: [#283](https://github.com/VoltAgent/voltagent/issues/283)

## 0.1.47

### Patch Changes

- [#311](https://github.com/VoltAgent/voltagent/pull/311) [`1f7fa14`](https://github.com/VoltAgent/voltagent/commit/1f7fa140fcc4062fe85220e61f276e439392b0b4) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core, vercel-ui): Currently the `convertToUIMessages` function does not handle tool calls in steps correctly as it does not properly default filter non-tool related steps for sub-agents, same as the `data-stream` functions and in addition in the core the `operationContext` does not have the `subAgent` fields set correctly.

  ### Changes

  - deprecated `isSubAgentStreamPart` in favor of `isSubAgent` for universal use
  - by default `convertToUIMessages` now filters out non-tool related steps for sub-agents
  - now able to exclude specific parts or steps (from OperationContext) in `convertToUIMessages`

  ***

  ### Internals

  New utils were added to the internal package:

  - `isObject`
  - `isFunction`
  - `isPlainObject`
  - `isEmptyObject`
  - `isNil`
  - `hasKey`

- Updated dependencies [[`1f7fa14`](https://github.com/VoltAgent/voltagent/commit/1f7fa140fcc4062fe85220e61f276e439392b0b4)]:
  - @voltagent/internal@0.0.3

## 0.1.46

### Patch Changes

- [#309](https://github.com/VoltAgent/voltagent/pull/309) [`b81a6b0`](https://github.com/VoltAgent/voltagent/commit/b81a6b09c33d95f7e586501cc058ae8381c854c4) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core): Default to filtering `error` types from the `fullStream` to allow for error handling to happen properly

## 0.1.45

### Patch Changes

- [#308](https://github.com/VoltAgent/voltagent/pull/308) [`33afe6e`](https://github.com/VoltAgent/voltagent/commit/33afe6ef40ef56c501f7fa69be42da730f87d29d) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: subAgents now share conversation steps and context with parent agents

  SubAgents automatically inherit and contribute to their parent agent's operation context, including `userContext` and conversation history. This creates a unified workflow where all agents (supervisor + subagents) add steps to the same `conversationSteps` array, providing complete visibility and traceability across the entire agent hierarchy.

  ## Usage

  ```typescript
  import { Agent, createHooks } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // SubAgent automatically receives parent's context
  const translatorAgent = new Agent({
    name: "Translator Agent",
    hooks: createHooks({
      onStart: ({ context }) => {
        // Access parent's userContext automatically
        const projectId = context.userContext.get("projectId");
        const language = context.userContext.get("language");
        console.log(`Translating for project ${projectId} to ${language}`);
      },
    }),
    instructions: "You are a skilled translator",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Supervisor agent with context
  const supervisorAgent = new Agent({
    name: "Supervisor Agent",
    subAgents: [translatorAgent],
    hooks: createHooks({
      onEnd: ({ context }) => {
        // Access complete workflow history from all agents
        const allSteps = context.conversationSteps;
        console.log(`Total workflow steps: ${allSteps.length}`);
        // Includes supervisor's delegate_task calls + subagent's processing steps
      },
    }),
    instructions: "Coordinate translation workflow",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Usage - context automatically flows to subagents
  const response = await supervisorAgent.streamText("Translate this text", {
    userContext: new Map([
      ["projectId", "proj-123"],
      ["language", "Spanish"],
    ]),
  });

  // Final context includes data from both supervisor and subagents
  console.log("Project:", response.userContext?.get("projectId"));
  ```

- [#306](https://github.com/VoltAgent/voltagent/pull/306) [`b8529b5`](https://github.com/VoltAgent/voltagent/commit/b8529b53313fa97e941ecacb8c1555205de49c19) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core): Revert original fix by @omeraplak to pass the task role as "user" instead of prompt to prevent errors in providers such as Anthropic, Grok, etc.

## 0.1.44

### Patch Changes

- Updated dependencies [[`94de46a`](https://github.com/VoltAgent/voltagent/commit/94de46ab2b7ccead47a539e93c72b357f17168f6)]:
  - @voltagent/internal@0.0.2

## 0.1.43

### Patch Changes

- [#287](https://github.com/VoltAgent/voltagent/pull/287) [`4136a9b`](https://github.com/VoltAgent/voltagent/commit/4136a9bd1a2f687bf009858dda4e56a50574c9c2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: optimize streamText/generateText/genereteObject/streamObject performance with background event publishing and memory operations

  Significantly improved agent response times by optimizing blocking operations during stream initialization. Stream start time reduced by 70-80% while maintaining full conversation context quality.

  ## What's Fixed

  - **Background Event Publishing**: Timeline events now publish asynchronously, eliminating blocking delays
  - **Memory Operations**: Context loading optimized with background conversation setup and input saving

  ## Performance Impact

  - Stream initialization: ~300-500ms → ~150-200ms
  - 70-80% faster response start times
  - Zero impact on conversation quality or history tracking

  Perfect for production applications requiring fast AI interactions.

- [#287](https://github.com/VoltAgent/voltagent/pull/287) [`4136a9b`](https://github.com/VoltAgent/voltagent/commit/4136a9bd1a2f687bf009858dda4e56a50574c9c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add `deepClone` function to `object-utils` module

  Added a new `deepClone` utility function to the object-utils module for creating deep copies of complex JavaScript objects. This utility provides safe cloning of nested objects, arrays, and primitive values while handling circular references and special object types.

  Usage:

  ```typescript
  import { deepClone } from "@voltagent/core/utils/object-utils";

  const original = {
    nested: {
      array: [1, 2, { deep: "value" }],
      date: new Date(),
    },
  };

  const cloned = deepClone(original);
  // cloned is completely independent from original
  ```

  This utility is particularly useful for agent state management, configuration cloning, and preventing unintended mutations in complex data structures.

- [#287](https://github.com/VoltAgent/voltagent/pull/287) [`4136a9b`](https://github.com/VoltAgent/voltagent/commit/4136a9bd1a2f687bf009858dda4e56a50574c9c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: optimize performance with new `BackgroundQueue` utility class and non-blocking background operations

  Added a new `BackgroundQueue` utility class for managing background operations with enhanced reliability, performance, and order preservation. Significantly improved agent response times by optimizing blocking operations during stream initialization and agent interactions.

  ## Performance Improvements

  **All blocking operations have been moved to background jobs**, resulting in significant performance gains:

  - **Agent execution is no longer blocked** by history persistence, memory operations, or telemetry exports
  - **3-5x faster response times** for agent interactions due to non-blocking background processing
  - **Zero blocking delays** during agent conversations and tool executions

  ## Stream Operations Optimized

  - **Background Event Publishing**: Timeline events now publish asynchronously, eliminating blocking delays
  - **Memory Operations**: Context loading optimized with background conversation setup and input saving
  - **Stream initialization**: ~300-500ms → ~150-200ms (70-80% faster response start times)
  - **Zero impact on conversation quality or history tracking**

  Perfect for production applications requiring fast AI interactions with enhanced reliability and order preservation.

## 0.1.42

### Patch Changes

- [#286](https://github.com/VoltAgent/voltagent/pull/286) [`73632ea`](https://github.com/VoltAgent/voltagent/commit/73632ea229917ab4042bb58b61d5e6dbd9b72804) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Fixed issue where fullStream processing was erroring due to inability to access a Nil value

## 0.1.41

### Patch Changes

- [`7705108`](https://github.com/VoltAgent/voltagent/commit/7705108317a8166bb1324838f99691ad8879b94d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: reverted subagent handoff message role from `user` back to `system`.

## 0.1.40

### Patch Changes

- [#284](https://github.com/VoltAgent/voltagent/pull/284) [`003ea5e`](https://github.com/VoltAgent/voltagent/commit/003ea5e0aab1e3e4a1398ed5ebf54b20fc9e27f3) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: subagent task delegation system message handling for Google Gemini compatibility

  Fixed an issue where subagent task delegation was sending tasks as system messages, which caused errors with certain AI models like Google Gemini that have strict system message requirements. The task delegation now properly sends tasks as user messages instead of system messages.

  This change improves compatibility across different AI providers, particularly Google Gemini, which expects a specific system message format and doesn't handle multiple or dynamic system messages well during task delegation workflows.

- [#284](https://github.com/VoltAgent/voltagent/pull/284) [`003ea5e`](https://github.com/VoltAgent/voltagent/commit/003ea5e0aab1e3e4a1398ed5ebf54b20fc9e27f3) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: userContext reference preservation in agent history initialization

## 0.1.39

### Patch Changes

- [#276](https://github.com/VoltAgent/voltagent/pull/276) [`937ccf8`](https://github.com/VoltAgent/voltagent/commit/937ccf8bf84a4261ee9ed2c94aab9f8c49ab69bd) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add dynamic agent parameters with userContext support - #272

  Added dynamic agent parameters functionality that allows agents to adapt their behavior, models, and tools based on runtime context. This enables personalized, multi-tenant, and role-based AI experiences.

  ## Features

  - **Dynamic Instructions**: Agent instructions that change based on user context
  - **Dynamic Models**: Different AI models based on subscription tiers or user roles
  - **Dynamic Tools**: Role-based tool access and permissions
  - **REST API Integration**: Full userContext support via REST endpoints
  - **VoltOps Integration**: Visual testing interface for dynamic agents

  ## Usage

  ```typescript
  import { Agent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const dynamicAgent = new Agent({
    name: "Adaptive Assistant",

    // Dynamic instructions based on user context
    instructions: ({ userContext }) => {
      const role = (userContext.get("role") as string) || "user";
      const language = (userContext.get("language") as string) || "English";

      if (role === "admin") {
        return `You are an admin assistant with special privileges. Respond in ${language}.`;
      } else {
        return `You are a helpful assistant. Respond in ${language}.`;
      }
    },

    // Dynamic model selection based on subscription tier
    model: ({ userContext }) => {
      const tier = (userContext.get("tier") as string) || "free";

      switch (tier) {
        case "premium":
          return openai("gpt-4o");
        case "pro":
          return openai("gpt-4o-mini");
        default:
          return openai("gpt-3.5-turbo");
      }
    },

    // Dynamic tools based on user role
    tools: ({ userContext }) => {
      const role = (userContext.get("role") as string) || "user";

      if (role === "admin") {
        return [basicTool, adminTool];
      } else {
        return [basicTool];
      }
    },

    llm: new VercelAIProvider(),
  });

  // Usage with userContext
  const userContext = new Map([
    ["role", "admin"],
    ["language", "Spanish"],
    ["tier", "premium"],
  ]);

  const response = await dynamicAgent.generateText("Help me manage the system", { userContext });
  ```

  ## REST API Integration

  Dynamic agents work seamlessly with REST API endpoints:

  ```bash
  # POST /agents/my-agent/text
  curl -X POST http://localhost:3141/agents/my-agent/text \
       -H "Content-Type: application/json" \
       -d '{
         "input": "I need admin access",
         "options": {
           "userContext": {
             "role": "admin",
             "language": "Spanish",
             "tier": "premium"
           }
         }
       }'
  ```

  Perfect for multi-tenant applications, role-based access control, subscription tiers, internationalization, and A/B testing scenarios.

## 0.1.38

### Patch Changes

- [#267](https://github.com/VoltAgent/voltagent/pull/267) [`f7e5a34`](https://github.com/VoltAgent/voltagent/commit/f7e5a344a5bcb63d1a225e580f01dfa5886b6a01) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: subagent event ordering and stream injection

  Fixed an issue where subagent events were not being properly included in the main agent's stream before subagent completion. Previously, subagent events (text-delta, tool-call, tool-result, etc.) would sometimes miss being included in the parent agent's real-time stream, causing incomplete event visibility for monitoring and debugging.

## 0.1.37

### Patch Changes

- [#252](https://github.com/VoltAgent/voltagent/pull/252) [`88f2d06`](https://github.com/VoltAgent/voltagent/commit/88f2d0682413d27a7ac2d1d8cd502fd9c665e547) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add userId and conversationId support to agent history tables

  This release adds comprehensive support for `userId` and `conversationId` fields in agent history tables across all memory storage implementations, enabling better conversation tracking and user-specific history management.

  ### New Features

  - **Agent History Enhancement**: Added `userId` and `conversationId` columns to agent history tables
  - **Cross-Implementation Support**: Consistent implementation across PostgreSQL, Supabase, LibSQL, and In-Memory storage
  - **Automatic Migration**: Safe schema migrations for existing installations
  - **Backward Compatibility**: Existing history entries remain functional

  ### Migration Notes

  **PostgreSQL & Supabase**: Automatic schema migration with user-friendly SQL scripts
  **LibSQL**: Seamless column addition with proper indexing
  **In-Memory**: No migration required, immediate support

  ### Technical Details

  - **Database Schema**: Added `userid TEXT` and `conversationid TEXT` columns (PostgreSQL uses lowercase)
  - **Indexing**: Performance-optimized indexes for new columns
  - **Migration Safety**: Non-destructive migrations with proper error handling
  - **API Consistency**: Unified interface across all storage implementations

- [#261](https://github.com/VoltAgent/voltagent/pull/261) [`b63fe67`](https://github.com/VoltAgent/voltagent/commit/b63fe675dfca9121862a9dd67a0fae5d39b9db90) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: subAgent event propagation in fullStream for enhanced streaming experience

  Fixed an issue where SubAgent events (text-delta, tool-call, tool-result, reasoning, source, finish) were not being properly forwarded to the parent agent's fullStream. This enhancement improves the streaming experience by ensuring all SubAgent activities are visible in the parent stream with proper metadata (subAgentId, subAgentName) for UI filtering and display.

## 0.1.36

### Patch Changes

- [#251](https://github.com/VoltAgent/voltagent/pull/251) [`be0cf47`](https://github.com/VoltAgent/voltagent/commit/be0cf47ec6e9640119d752dd6b608097d06bf69d) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add fullStream support and subagent event forwarding

  Added `fullStream` support to the core agent system for enhanced streaming with detailed chunk types (text-delta, tool-call, tool-result, reasoning, finish, error). Also improved event forwarding between subagents for better multi-agent workflows. SubAgent events are now fully forwarded to parent agents, with filtering moved to the client side for better flexibility.

  Real-world example:

  ```typescript
  const response = await agent.streamText("What's the weather in Istanbul?");

  if (response.fullStream) {
    for await (const chunk of response.fullStream) {
      // Filter out SubAgent text, reasoning, and source events for cleaner UI
      if (chunk.subAgentId && chunk.subAgentName) {
        if (chunk.type === "text" || chunk.type === "reasoning" || chunk.type === "source") {
          continue; // Skip these events from sub-agents
        }
      }

      switch (chunk.type) {
        case "text-delta":
          process.stdout.write(chunk.textDelta); // Stream text in real-time
          break;
        case "tool-call":
          console.log(`🔧 Using tool: ${chunk.toolName}`);
          break;
        case "tool-result":
          console.log(`✅ Tool completed: ${chunk.toolName}`);
          break;
        case "reasoning":
          console.log(`🤔 AI thinking: ${chunk.reasoning}`);
          break;
        case "finish":
          console.log(`\n✨ Done! Tokens used: ${chunk.usage?.totalTokens}`);
          break;
      }
    }
  }
  ```

- [#248](https://github.com/VoltAgent/voltagent/pull/248) [`a3b4e60`](https://github.com/VoltAgent/voltagent/commit/a3b4e604e6f79281903ff0c28422e6ee2863b340) Thanks [@alasano](https://github.com/alasano)! - feat(core): add streamable HTTP transport support for MCP

  - Upgrade @modelcontextprotocol/sdk from 1.10.1 to 1.12.1
  - Add support for streamable HTTP transport (the newer MCP protocol)
  - Modified existing `type: "http"` to use automatic selection with streamable HTTP → SSE fallback
  - Added two new transport types:
    - `type: "sse"` - Force SSE transport only (legacy)
    - `type: "streamable-http"` - Force streamable HTTP only (no fallback)
  - Maintain full backward compatibility - existing `type: "http"` configurations continue to work via automatic fallback

  Fixes #246

- [#247](https://github.com/VoltAgent/voltagent/pull/247) [`20119ad`](https://github.com/VoltAgent/voltagent/commit/20119ada182ec5f313a7f46956218d593180e096) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - feat(core): Enhanced server configuration with unified `server` object and Swagger UI control

  Server configuration options have been enhanced with a new unified `server` object for better organization and flexibility while maintaining full backward compatibility.

  **What's New:**

  - **Unified Server Configuration:** All server-related options (`autoStart`, `port`, `enableSwaggerUI`, `customEndpoints`) are now grouped under a single `server` object.
  - **Swagger UI Control:** Fine-grained control over Swagger UI availability with environment-specific defaults.
  - **Backward Compatibility:** Legacy individual options are still supported but deprecated.
  - **Override Logic:** New `server` object takes precedence over deprecated individual options.

  **Migration Guide:**

  **New Recommended Usage:**

  ```typescript
  import { Agent, VoltAgent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "My Assistant",
    instructions: "A helpful assistant",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  new VoltAgent({
    agents: { agent },
    server: {
      autoStart: true,
      port: 3000,
      enableSwaggerUI: true,
      customEndpoints: [
        {
          path: "/health",
          method: "get",
          handler: async (c) => c.json({ status: "ok" }),
        },
      ],
    },
  });
  ```

  **Legacy Usage (Deprecated but Still Works):**

  ```typescript
  new VoltAgent({
    agents: { agent },
    autoStart: true, // @deprecated - use server.autoStart
    port: 3000, // @deprecated - use server.port
    customEndpoints: [], // @deprecated - use server.customEndpoints
  });
  ```

  **Mixed Usage (Server Object Overrides):**

  ```typescript
  new VoltAgent({
    agents: { agent },
    autoStart: false, // This will be overridden
    server: {
      autoStart: true, // This takes precedence
    },
  });
  ```

  **Swagger UI Defaults:**

  - Development (`NODE_ENV !== 'production'`): Swagger UI enabled
  - Production (`NODE_ENV === 'production'`): Swagger UI disabled
  - Override with `server.enableSwaggerUI: true/false`

  Resolves [#241](https://github.com/VoltAgent/voltagent/issues/241)

## 0.1.35

### Patch Changes

- [#240](https://github.com/VoltAgent/voltagent/pull/240) [`8605863`](https://github.com/VoltAgent/voltagent/commit/860586377bff11b9e7ba80e06fd26b0098bd334a) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - trim the system prompt so we don't have extra newlines and offset text

## 0.1.34

### Patch Changes

- [#238](https://github.com/VoltAgent/voltagent/pull/238) [`ccdba7a`](https://github.com/VoltAgent/voltagent/commit/ccdba7ac58e284dcda9f6b7bec2c8d2e69892940) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: user messages saving with proper content serialization

  Fixed an issue where user messages were not being saved correctly to storage due to improper content formatting. The message content is now properly stringified when it's not already a string, ensuring consistent storage format across PostgreSQL and LibSQL implementations.

## 0.1.33

### Patch Changes

- [#236](https://github.com/VoltAgent/voltagent/pull/236) [`5d39cdc`](https://github.com/VoltAgent/voltagent/commit/5d39cdc68c4ec36ec2f0bf86a29dbf1225644416) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Remove userId parameter from addMessage method

  Simplified the `addMessage` method signature by removing the `userId` parameter. This change makes the API cleaner and more consistent with the conversation-based approach where user context is handled at the conversation level.

  ### Changes

  - **Removed**: `userId` parameter from `addMessage` method
  - **Before**: `addMessage(message: MemoryMessage, userId: string, conversationId: string)`
  - **After**: `addMessage(message: MemoryMessage, conversationId: string)`

  ### Migration Guide

  If you were calling `addMessage` with a `userId` parameter, simply remove it:

  ```typescript
  // Before
  await memory.addMessage(message, conversationId, userId);

  // After
  await memory.addMessage(message, conversationId);
  ```

  ### Rationale

  User context is now properly managed at the conversation level, making the API more intuitive and reducing parameter complexity. The user association is handled through the conversation's `userId` property instead of requiring it on every message operation.

  **Breaking Change:**

  This is a minor breaking change. Update your `addMessage` calls to remove the `userId` parameter.

- [#235](https://github.com/VoltAgent/voltagent/pull/235) [`16c2a86`](https://github.com/VoltAgent/voltagent/commit/16c2a863d3ecdc09f09219bd40f2dbf1d789194d) Thanks [@alasano](https://github.com/alasano)! - fix: onHandoff hook invocation to pass arguments as object instead of positional parameters

- [#233](https://github.com/VoltAgent/voltagent/pull/233) [`0d85f0e`](https://github.com/VoltAgent/voltagent/commit/0d85f0e960dbc6e8df6a79a16c775ca7a34043bb) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: adding in missing changeset from [PR #226](https://github.com/VoltAgent/voltagent/pull/226)

## 0.1.32

### Patch Changes

- [#215](https://github.com/VoltAgent/voltagent/pull/215) [`f2f4539`](https://github.com/VoltAgent/voltagent/commit/f2f4539af7722f25a5aad9f01c2b7b5e50ba51b8) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - This release introduces powerful new methods for managing conversations with user-specific access control and improved developer experience.

  ### Simple Usage Example

  ```typescript
  // Get all conversations for a user
  const conversations = await storage.getUserConversations("user-123").limit(10).execute();

  console.log(conversations);

  // Get first conversation and its messages
  const conversation = conversations[0];
  if (conversation) {
    const messages = await storage.getConversationMessages(conversation.id);
    console.log(messages);
  }
  ```

  ### Pagination Support

  ```typescript
  // Get paginated conversations
  const result = await storage.getPaginatedUserConversations("user-123", 1, 20);
  console.log(result.conversations); // Array of conversations
  console.log(result.hasMore); // Boolean indicating if more pages exist
  ```

- [#229](https://github.com/VoltAgent/voltagent/pull/229) [`0eba8a2`](https://github.com/VoltAgent/voltagent/commit/0eba8a265c35241da74324613e15801402f7b778) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: migrate the provider streams to `AsyncIterableStream`

  Example:

  ```typescript
  const stream = createAsyncIterableStream(
    new ReadableStream({
      start(controller) {
        controller.enqueue("Hello");
        controller.enqueue(", ");
        controller.enqueue("world!");
        controller.close();
      },
    })
  );

  for await (const chunk of stream) {
    console.log(chunk);
  }

  // in the agent
  const result = await agent.streamObject({
    messages,
    model: "test-model",
    schema,
  });

  for await (const chunk of result.objectStream) {
    console.log(chunk);
  }
  ```

  New exports:

  - `createAsyncIterableStream`
  - `type AsyncIterableStream`

## 0.1.31

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- [#223](https://github.com/VoltAgent/voltagent/pull/223) [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6) Thanks [@omeraplak](https://github.com/omeraplak)! - Add userContext support to retrievers for tracking references and metadata

  Retrievers can now store additional information (like references, sources, citations) in userContext that can be accessed from agent responses. This enables tracking which documents were used to generate responses, perfect for citation systems and audit trails.

  ```ts
  class MyRetriever extends BaseRetriever {
    async retrieve(input: string, options: RetrieveOptions): Promise<string> {
      // Find relevant documents
      const docs = this.findRelevantDocs(input);

      const references = docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        source: doc.source,
      }));
      options.userContext.set("references", references);

      return docs.map((doc) => doc.content).join("\n");
    }
  }

  // Access references from response
  const response = await agent.generateText("What is VoltAgent?");
  const references = response.userContext?.get("references");
  ```

## 0.1.30

### Patch Changes

- [#201](https://github.com/VoltAgent/voltagent/pull/201) [`04dd320`](https://github.com/VoltAgent/voltagent/commit/04dd3204455b09dc490d1bdfbd0cfeea13c3c409) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: include modelParameters in agent event metadata

  This adds the `modelParameters` field to agent event metadata to improve observability and debugging of model-specific behavior during agent execution.

## 0.1.29

### Patch Changes

- [#191](https://github.com/VoltAgent/voltagent/pull/191) [`07d99d1`](https://github.com/VoltAgent/voltagent/commit/07d99d133232babf78ba4e1c32fe235d5b3c9944) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Remove console based logging in favor of a dev-only logger that will not output logs in production environments by leveraging the NODE_ENV

- [#196](https://github.com/VoltAgent/voltagent/pull/196) [`67b0e7e`](https://github.com/VoltAgent/voltagent/commit/67b0e7ea704d23bf9efb722c0b0b4971d0974153) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add `systemPrompt` and `messages` array to metadata for display on VoltOps Platform

## 0.1.28

### Patch Changes

- [#189](https://github.com/VoltAgent/voltagent/pull/189) [`07138fc`](https://github.com/VoltAgent/voltagent/commit/07138fc85ef27c9136d303233559f6b358ad86de) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Added the 'purpose' field to agents (subagents) to provide a limited description of the purpose of the agent to the supervisor instead of passing the instructions for the subagent directly to the supervisor

  ```ts
  const storyAgent = new Agent({
    name: "Story Agent",
    purpose: "A story writer agent that creates original, engaging short stories.",
    instructions: "You are a creative story writer. Create original, engaging short stories.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });
  ```

  > The supervisor agent's system prompt is automatically modified to include instructions on how to manage its subagents effectively. It lists the available subagents and their `purpose` and provides guidelines for delegation, communication, and response aggregation.

- [#186](https://github.com/VoltAgent/voltagent/pull/186) [`adad41a`](https://github.com/VoltAgent/voltagent/commit/adad41a930e338c4683306b9dbffec22096eba5c) Thanks [@necatiozmen](https://github.com/necatiozmen)! - chore: update "VoltAgent Console" -> "VoltOps Platform"

## 0.1.27

### Patch Changes

- [#126](https://github.com/VoltAgent/voltagent/pull/126) [`2c47bc1`](https://github.com/VoltAgent/voltagent/commit/2c47bc1e9cd845cc60e6e9d7e86df40c98b82614) Thanks [@fav-devs](https://github.com/fav-devs)! - feat: add custom endpoints feature to VoltAgent API server, allowing developers to extend the API with their own endpoints

  ```typescript
  import { VoltAgent } from "@voltagent/core";

  new VoltAgent({
    agents: { myAgent },
    customEndpoints: [
      {
        path: "/api/health",
        method: "get",
        handler: async (c) => {
          return c.json({
            success: true,
            data: { status: "healthy" },
          });
        },
      },
    ],
  });
  ```

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

- [`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add `toolName` to event metadata to ensure `delegate_task` name is visible in VoltOps LLM Observability Platform

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

  We're combining the flexibility of code with the clarity of visual tools (like our **currently live [VoltOps LLM Observability Platform](https://console.voltagent.dev/)**) to make AI development easier, clearer, and more powerful. Join us as we build the future of AI in JavaScript!

  Explore the [Docs](https://voltagent.dev/docs/) and join our [Discord community](https://s.voltagent.dev/discord)!
