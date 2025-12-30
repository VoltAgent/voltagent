# @voltagent/langfuse-exporter

## 2.0.2

### Patch Changes

- [`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

## 2.0.1

### Patch Changes

- [`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

## 2.0.0

### Major Changes

- [#894](https://github.com/VoltAgent/voltagent/pull/894) [`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/core@2.0.0

## 1.1.3

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`

## 1.1.2

### Patch Changes

- [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core peerDependency version

## 1.1.1

## 1.1.1-next.0

### Patch Changes

- Updated dependencies [[`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3)]:
  - @voltagent/core@1.1.7-next.0

## 1.1.0

### Minor Changes

- [#554](https://github.com/VoltAgent/voltagent/pull/554) [`3a70b05`](https://github.com/VoltAgent/voltagent/commit/3a70b05515d04ea7bc39135d3d399ecd7a59dbe3) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add createLangfuseSpanProcessor helper and robust attribute mappings for new OpenTelemetry observability

  What changed for you
  - New helper: `createLangfuseSpanProcessor` to plug Langfuse export directly into VoltAgent’s OpenTelemetry-based observability without touching core.
  - Improved attribute mappings with careful fallbacks to align `@voltagent/core` span attributes and Langfuse fields (usage, model params, input/output, user/session, tags, names).
  - Updated `examples/with-langfuse` to demonstrate the new integration.

  Quick start

  ```ts
  import { Agent, VoltAgent, VoltAgentObservability } from "@voltagent/core";
  import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";

  // Configure Observability: add Langfuse via SpanProcessor
  const observability = new VoltAgentObservability({
    spanProcessors: [
      createLangfuseSpanProcessor({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL, // e.g. https://cloud.langfuse.com or self-hosted
        debug: true, // optional
        // batch: { maxQueueSize, maxExportBatchSize, scheduledDelayMillis, exportTimeoutMillis }
      }),
    ],
  });

  const agent = new Agent({
    name: "Base Agent",
    // ...model, tools, memory
  });

  new VoltAgent({
    agents: { agent },
    observability,
  });
  ```

  Environment variables
  - `LANGFUSE_PUBLIC_KEY`
  - `LANGFUSE_SECRET_KEY`
  - `LANGFUSE_BASE_URL` (optional; defaults to Langfuse cloud if omitted)

  Mapping details (highlights)
  - Usage tokens: `gen_ai.usage.*` ← fallbacks to `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` from core.
  - Model params: prefers `gen_ai.request.*`, falls back to `ai.model.*` from core.
  - Input/output (generation): prefers `ai.prompt.messages` / `ai.response.text`, falls back to generic `input` / `output` set by core.
  - Input/output (tools): prefers `tool.arguments` / `tool.result`, falls back to `input` / `output`.
  - User/session: `enduser.id` ← `user.id`, `session.id` ← `conversation.id`.
  - Tags: reads `tags` or parses JSON from `prompt.tags` if present.
  - Name: prefers `voltagent.agent.name` then `entity.name` then span name.

  Example updated
  - See `examples/with-langfuse` for a complete, working setup using `createLangfuseSpanProcessor`.

## 1.0.0

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

## 0.1.5

### Patch Changes

- [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve code quality with biome linting and package configuration enhancements

  This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

  **Key improvements:**
  - **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
  - **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
  - **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
  - **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
  - **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

  These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.

## 0.1.4

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

## 0.1.3

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.1.2

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

- Updated dependencies [[`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3)]:
  - @voltagent/core@0.1.14

## 0.1.1

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

- Updated dependencies [[`004df81`](https://github.com/VoltAgent/voltagent/commit/004df81fa6a23571391e6ddeba0dfe6bfea267e8)]:
  - @voltagent/core@0.1.12
