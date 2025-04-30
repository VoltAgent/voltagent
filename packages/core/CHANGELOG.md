# @voltagent/core

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
    instructions: "Use these tools to find current information online.",
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
    description: "An agent equipped with reasoning tools.",
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
