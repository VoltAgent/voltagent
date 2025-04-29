# @voltagent/core

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
