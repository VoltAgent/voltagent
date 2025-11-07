# @voltagent/cli

## 0.1.15

### Patch Changes

- [#767](https://github.com/VoltAgent/voltagent/pull/767) [`cc1f5c0`](https://github.com/VoltAgent/voltagent/commit/cc1f5c032cd891ed4df0b718885f70853c344690) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add tunnel command

  ## New: `volt tunnel`

  Expose your local VoltAgent server over a secure public URL with a single command:

  ```bash
  pnpm volt tunnel 3141
  ```

  The CLI handles tunnel creation for `localhost:3141` and keeps the connection alive until you press `Ctrl+C`. You can omit the port argument to use the default.

## 0.1.14

### Patch Changes

- [#734](https://github.com/VoltAgent/voltagent/pull/734) [`2084fd4`](https://github.com/VoltAgent/voltagent/commit/2084fd491db4dbc89c432d1e72a633ec0c42d92b) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: auto-detect package managers and add automatic installation to `volt update` command

  ## The Problem

  The `volt update` CLI command had several UX issues:
  1. Only updated `package.json` without installing packages
  2. Required users to manually run installation commands
  3. Always suggested `npm install` regardless of the user's actual package manager (pnpm, yarn, or bun)
  4. No way to skip automatic installation when needed

  This was inconsistent with the HTTP API's `updateSinglePackage` and `updateAllPackages` functions, which properly detect and use the correct package manager.

  ## The Solution

  Enhanced the `volt update` command to match the HTTP API behavior:

  **Package Manager Auto-Detection:**
  - Automatically detects package manager by checking lock files:
    - `pnpm-lock.yaml` → runs `pnpm install`
    - `yarn.lock` → runs `yarn install`
    - `package-lock.json` → runs `npm install`
    - `bun.lockb` → runs `bun install`

  **Automatic Installation:**
  - After updating `package.json`, automatically runs the appropriate install command
  - Shows detected package manager and installation progress
  - Works in both interactive mode and `--apply` mode

  **Optional Skip:**
  - Added `--no-install` flag to skip automatic installation when needed
  - Useful for CI/CD pipelines or when manual control is preferred

  ## Usage Examples

  **Default behavior (auto-install with detected package manager):**

  ```bash
  $ volt update
  Found 3 outdated VoltAgent packages:
    @voltagent/core: 1.1.34 → 1.1.35
    @voltagent/server-hono: 0.1.10 → 0.1.11
    @voltagent/cli: 0.0.45 → 0.0.46

  ✓ Updated 3 packages in package.json

  Detected package manager: pnpm
  Running pnpm install...
  ⠹ Installing packages...
  ✓ Packages installed successfully
  ```

  **Skip automatic installation:**

  ```bash
  $ volt update --no-install
  ✓ Updated 3 packages in package.json
  ⚠ Automatic installation skipped
  Run 'pnpm install' to install updated packages
  ```

  **Non-interactive mode:**

  ```bash
  $ volt update --apply
  ✓ Updates applied to package.json
  Detected package manager: pnpm
  Running pnpm install...
  ✓ Packages installed successfully
  ```

  ## Benefits
  - **Better UX**: No manual steps required - updates are fully automatic
  - **Package Manager Respect**: Uses your chosen package manager (pnpm/yarn/npm/bun)
  - **Consistency**: CLI now matches HTTP API behavior
  - **Flexibility**: `--no-install` flag for users who need manual control
  - **CI/CD Friendly**: Works seamlessly in automated workflows

## 0.1.13

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12
  - @voltagent/evals@1.0.3
  - @voltagent/sdk@1.0.1

## 0.1.12

### Patch Changes

- [#674](https://github.com/VoltAgent/voltagent/pull/674) [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add eval commands

- Updated dependencies [[`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b), [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b)]:
  - @voltagent/evals@1.0.0
  - @voltagent/sdk@1.0.0

## 0.1.11

### Patch Changes

- [#621](https://github.com/VoltAgent/voltagent/pull/621) [`f4fa7e2`](https://github.com/VoltAgent/voltagent/commit/f4fa7e297fec2f602c9a24a0c77e645aa971f2b9) Thanks [@omeraplak](https://github.com/omeraplak)! - ## @voltagent/core
  - Folded the serverless runtime entry point into the main build – importing `@voltagent/core` now auto-detects the runtime and provisions either the Node or serverless observability pipeline.
  - Rebuilt serverless observability on top of `BasicTracerProvider`, fetch-based OTLP exporters, and an execution-context `waitUntil` hook. Exports run with exponential backoff, never block the response, and automatically reuse VoltOps credentials (or fall back to the in-memory span/log store) so VoltOps Console transparently swaps to HTTP polling when WebSockets are unavailable.
  - Hardened the runtime utilities for Workers/Functions: added universal `randomUUID`, base64, and event-emitter helpers, and taught the default logger to emit OpenTelemetry logs without relying on Node globals. This removes the last Node-only dependencies from the serverless bundle.

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { serverlessHono } from "@voltagent/serverless-hono";
  import { openai } from "@ai-sdk/openai";

  import { weatherTool } from "./tools";

  const assistant = new Agent({
    name: "serverless-assistant",
    instructions: "You are a helpful assistant.",
    model: openai("gpt-4o-mini"),
  });

  const voltAgent = new VoltAgent({
    agents: { assistant },
    serverless: serverlessHono(),
  });

  export default voltAgent.serverless().toCloudflareWorker();
  ```

  ## @voltagent/serverless-hono
  - Renamed the edge provider to **serverless** and upgraded it to power any fetch-based runtime (Cloudflare Workers, Vercel Edge Functions, Deno Deploy, Netlify Functions).
  - Wrapped the Cloudflare adapter in a first-class `HonoServerlessProvider` that installs a scoped `waitUntil` bridge, reuses the shared routing layer, and exposes a `/ws` health stub so VoltOps Console can cleanly fall back to polling.
  - Dropped the manual environment merge – Workers should now enable the `nodejs_compat_populate_process_env` flag (documented in the new deployment guide) instead of calling `mergeProcessEnv` themselves.

  ## @voltagent/server-core
  - Reworked the observability handlers around the shared storage API, including a new `POST /setup-observability` helper that writes VoltOps keys into `.env` and expanded trace/log queries that match the serverless storage contract.

  ## @voltagent/cli
  - Added `volt deploy --target <cloudflare|vercel|netlify>` to scaffold the right config files. The Cloudflare template now ships with the required compatibility flags (`nodejs_compat`, `nodejs_compat_populate_process_env`, `no_handle_cross_request_promise_resolution`) so new projects run on Workers without extra tweaking.

## 0.1.10

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

## 0.1.9

### Patch Changes

- [`00d70cb`](https://github.com/VoltAgent/voltagent/commit/00d70cbb570e4d748ab37e177e4e5df869d52e03) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: update VoltAgent docs MCP configs

## 0.1.8

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

## 0.1.7

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

## 0.1.6

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

## 0.1.5

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

## 0.1.4

### Patch Changes

- [#73](https://github.com/VoltAgent/voltagent/pull/73) [`ac6ecbc`](https://github.com/VoltAgent/voltagent/commit/ac6ecbc235a10a947a9f60155b04335761e6ac38) Thanks [@necatiozmen](https://github.com/necatiozmen)! - feat: Add placeholder `add` command

  Introduces the `add <agent-slug>` command. Currently, this command informs users that the feature for adding agents from the marketplace is upcoming and provides a link to the GitHub discussions for early feedback and participation.

## 0.1.3

### Patch Changes

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:
  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.

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
