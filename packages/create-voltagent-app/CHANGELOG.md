# create-voltagent-app

## 0.2.14

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

## 0.2.13

### Patch Changes

- [#857](https://github.com/VoltAgent/voltagent/pull/857) [`056bbda`](https://github.com/VoltAgent/voltagent/commit/056bbdac8502a21bf4d317d05a9492658afc406a) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: use LibSQL for persistent observability in project template

  Previously, projects created with `create-voltagent-app` used in-memory observability storage, which meant traces and spans were lost on restart.

  Now the template uses `LibSQLObservabilityAdapter` to persist observability data to `.voltagent/observability.db`, matching the existing persistent memory setup. This ensures agent traces, spans, and logs are retained across restarts for better debugging and monitoring during development.

## 0.2.11

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`

## 0.2.10

### Patch Changes

- [#587](https://github.com/VoltAgent/voltagent/pull/587) [`28d4268`](https://github.com/VoltAgent/voltagent/commit/28d42689e1f2c0f1304f0f934bd09ba510e493bc) Thanks [@wayneg123](https://github.com/wayneg123)! - Switch the app template to bundle with tsdown so the production build runs under Node ESM without manual .js extensions or bespoke import mappers.

## 0.2.9

### Patch Changes

- [`59b4a3e`](https://github.com/VoltAgent/voltagent/commit/59b4a3ecaa5353228bc142f3f175c95a1e4f6d8c) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add VoltAgent v1 support

## 0.2.9-next.0

### Patch Changes

- [#541](https://github.com/VoltAgent/voltagent/pull/541) [`59b4a3e`](https://github.com/VoltAgent/voltagent/commit/59b4a3ecaa5353228bc142f3f175c95a1e4f6d8c) Thanks [@voltagent-bot](https://github.com/voltagent-bot)! - feat: add VoltAgent v1 support

## 0.2.8

### Patch Changes

- [#462](https://github.com/VoltAgent/voltagent/pull/462) [`23ecea4`](https://github.com/VoltAgent/voltagent/commit/23ecea421b8c699f5c395dc8aed687f94d558b6c) Thanks [@omeraplak](https://github.com/omeraplak)! - Update Zod to v3.25.0 for compatibility with Vercel AI@5
  - Updated Zod dependency to ^3.25.0 across all packages
  - Maintained compatibility with zod-from-json-schema@0.0.5
  - Fixed TypeScript declaration build hanging issue
  - Resolved circular dependency issues in the build process

## 0.2.7

### Patch Changes

- [#463](https://github.com/VoltAgent/voltagent/pull/463) [`760a294`](https://github.com/VoltAgent/voltagent/commit/760a294e4d68742d8701d54dc1c541c87959e5d8) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: update base template to always include VoltOpsClient for observability

  ### What's New

  The create-voltagent-app template now always includes VoltOpsClient configuration, making it easier for users to enable production observability with a single click from the VoltOps Console.

  ### Changes
  - **Always Include VoltOpsClient**: The base template now imports and configures VoltOpsClient by default
  - **Environment-Based Configuration**: VoltOpsClient reads keys from `VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY` environment variables
  - **Seamless Console Integration**: Works with the new one-click observability setup in VoltOps Console

  ### Template Structure

  ```typescript
  import { VoltAgent, VoltOpsClient, Agent } from "@voltagent/core";

  // ... agent configuration ...

  new VoltAgent({
    agents: { agent },
    workflows: { expenseApprovalWorkflow },
    logger,
    voltOpsClient: new VoltOpsClient({
      publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
      secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
    }),
  });
  ```

  ### Benefits
  - **Zero Configuration**: New projects are ready for observability out of the box
  - **Console Integration**: Enable observability with one click from VoltOps Console
  - **Production Ready**: Template follows best practices for production deployments

  This change ensures all new VoltAgent projects created with create-voltagent-app are ready for production observability from day one.

## 0.2.6

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

## 0.2.3

### Patch Changes

- [#404](https://github.com/VoltAgent/voltagent/pull/404) [`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add @voltagent/logger with createPinoLogger to new project templates

  Enhanced the create-voltagent-app templates to include @voltagent/logger by default in new projects. This provides new VoltAgent applications with production-ready logging capabilities out of the box.

  **Changes:**
  - Added `@voltagent/logger` as a dependency in generated projects
  - Updated templates to import and use `createPinoLogger` instead of relying on the default ConsoleLogger
  - New projects now have pretty-formatted, colored logs in development
  - Automatic environment-based configuration (pretty in dev, JSON in production)

  **Generated Code Example:**

  ```typescript
  import { createPinoLogger } from "@voltagent/logger";

  const logger = createPinoLogger({
    level: "info",
    name: "my-voltagent-app",
  });

  const voltAgent = new VoltAgent({
    agents: [agent],
    logger,
  });
  ```

  This ensures new VoltAgent projects start with professional logging capabilities, improving the developer experience and making applications production-ready from day one.

## 0.2.0

### Minor Changes

- [`8b143cb`](https://github.com/VoltAgent/voltagent/commit/8b143cbd6f4349fe62158d7e78a5a239fec7a9e2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: modernize create-voltagent-app CLI
  - Add AI provider selection (OpenAI, Anthropic, Google, Groq, Mistral, Ollama)
  - Add optional API key input with skip option
  - Automatic .env file generation based on selected provider
  - Package manager detection - only show installed ones
  - Auto-install dependencies after project creation
  - Full Windows support with cross-platform commands
  - Ollama local LLM support with default configuration
  - Dynamic template generation based on selected AI provider

### Patch Changes

- [`8b143cb`](https://github.com/VoltAgent/voltagent/commit/8b143cbd6f4349fe62158d7e78a5a239fec7a9e2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: include create-voltagent-app in build:all script

  The create-voltagent-app package was not being built during GitHub Actions release workflow because it doesn't have the @voltagent/ scope prefix. Added explicit scope to build:all command to ensure the CLI tool is properly built before publishing.

## 0.1.33

### Patch Changes

- [#371](https://github.com/VoltAgent/voltagent/pull/371) [`6ddedc2`](https://github.com/VoltAgent/voltagent/commit/6ddedc2b9be9c3dc4978dc53198a43c2cba74945) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add comprehensive workflow example to new projects

  This change enhances the `create-voltagent-app` template by including a new, comprehensive workflow example. The goal is to provide new users with a practical, out-of-the-box demonstration of VoltAgent's core workflow capabilities.

  The new template now includes:
  - A `comprehensive-workflow` that showcases the combined use of `andThen`, `andAgent`, `andAll`, `andRace`, and `andWhen`.
  - A dedicated `workflows` directory (`src/workflows`) to promote a modular project structure.
  - The workflow uses a self-contained `sentimentAgent`, separating it from the main project agent to ensure clarity and avoid conflicts.

  This provides a much richer starting point for developers, helping them understand and build their own workflows more effectively.

## 0.1.31

### Patch Changes

- [`00d70cb`](https://github.com/VoltAgent/voltagent/commit/00d70cbb570e4d748ab37e177e4e5df869d52e03) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: update VoltAgent docs MCP configs

## 0.1.28

### Patch Changes

- [#278](https://github.com/VoltAgent/voltagent/pull/278) [`85d979d`](https://github.com/VoltAgent/voltagent/commit/85d979d5205f23ab6e3a85e68af6c46fa7c0f648) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce VoltAgent MCP Docs Server for IDE integration

  Added comprehensive MCP (Model Context Protocol) Docs Server integration to enable AI assistants in IDEs to access VoltAgent documentation directly. This feature allows developers to ask their AI assistants questions about VoltAgent directly within their development environment.

  **New Features:**
  - **`@voltagent/docs-mcp`** package: MCP server that provides access to VoltAgent documentation
  - **CLI MCP commands**: Setup, test, status, and remove MCP configurations
    - `volt mcp setup` - Interactive setup for Cursor, Windsurf, or VS Code
    - `volt mcp test` - Test MCP connection and provide usage examples
    - `volt mcp status` - Show current MCP configuration status
    - `volt mcp remove` - Remove MCP configuration
  - **IDE Configuration**: Automatic configuration file generation for supported IDEs
  - **Multi-IDE Support**: Works with Cursor, Windsurf, and VS Code

  **Usage:**

  ```bash
  # Setup MCP for your IDE
  volt mcp setup

  # Test the connection
  volt mcp test

  # Check status
  volt mcp status
  ```

  Once configured, developers can ask their AI assistant questions like:
  - "How do I create an agent in VoltAgent?"
  - "Is there a VoltAgent example with Next.js?"
  - "How do I use voice features?"
  - "What are the latest updates?"

  The MCP server provides real-time access to VoltAgent documentation, examples, and best practices directly within the IDE environment.

## 0.1.26

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

## 0.1.21

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

## 0.1.18

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

## 0.1.16

### Patch Changes

- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435).

## 0.1.14

### Patch Changes

- [`8e6d2e9`](https://github.com/VoltAgent/voltagent/commit/8e6d2e994398c1a727d4afea39d5e34ffc4a5fca) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: add README

## 0.1.11

### Patch Changes

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:
  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.
