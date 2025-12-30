# @voltagent/docs-mcp

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

## 1.0.21

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`

## 1.0.16

### Patch Changes

- [#627](https://github.com/VoltAgent/voltagent/pull/627) [`0dafbf0`](https://github.com/VoltAgent/voltagent/commit/0dafbf06deb0190de5d865ac522127b2702f42ca) Thanks [@Theadd](https://github.com/Theadd)! - fix(docs-mcp): update JSON Schema target to draft-7 for tool compatibilityfix(docs): update JSON Schema target to draft-7 for tool compatibility

  The MCP tool schemas were using JSON Schema draft-2020-12 features that weren't supported by the current validator. Updated to explicitly use draft-7 format for better compatibility.The MCP tool schemas were using JSON Schema draft-2020-12 features that weren't supported by the current validator. Updated to explicitly use draft-7 format for better compatibility.
  - Changed z.toJSONSchema() to use draft-7 target- Changed z.toJSONSchema() to use draft-7 target
  - Fixed tool registration failures due to schema validation errors- Fixed tool registration failures due to schema validation errors
  - Removed dependency on unsupported $dynamicRef feature- Removed dependency on unsupported $dynamicRef feature

  Fixes #626

## 1.0.14

### Patch Changes

- [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core peerDependency version

## 1.0.2

### Patch Changes

- [#571](https://github.com/VoltAgent/voltagent/pull/571) [`b801a8d`](https://github.com/VoltAgent/voltagent/commit/b801a8da47da5cad15b8637635f83acab5e0d6fc) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

## 1.0.2-next.1

### Patch Changes

- [#551](https://github.com/VoltAgent/voltagent/pull/551) [`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

## 1.0.2-next.0

### Patch Changes

- [#551](https://github.com/VoltAgent/voltagent/pull/551) [`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

- Updated dependencies [[`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3)]:
  - @voltagent/core@1.1.7-next.0

## 1.0.1

### Patch Changes

- [#546](https://github.com/VoltAgent/voltagent/pull/546) [`f12f344`](https://github.com/VoltAgent/voltagent/commit/f12f34405edf0fcb417ed098deba62570260fb81) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: align Zod to ^3.25.76 and fix type mismatch with AI SDK

  We aligned Zod versions across packages to `^3.25.76` to match AI SDK peer ranges and avoid multiple Zod instances at runtime.

  Why this matters
  - Fixes TypeScript narrowing issues in workflows when consuming `@voltagent/core` from npm with a different Zod instance (e.g., `ai` packages pulling newer Zod).
  - Prevents errors like "Spread types may only be created from object types" where `data` failed to narrow because `z.ZodTypeAny` checks saw different Zod identities.

  What changed
  - `@voltagent/server-core`, `@voltagent/server-hono`: dependencies.zod → `^3.25.76`.
  - `@voltagent/docs-mcp`, `@voltagent/core`: devDependencies.zod → `^3.25.76`.
  - Examples and templates updated to use `^3.25.76` for consistency (non-publishable).

  Notes for consumers
  - Ensure a single Zod version is installed (consider a workspace override to pin Zod to `3.25.76`).
  - This improves compatibility with `ai@5.x` packages that require `zod@^3.25.76 || ^4`.

## 1.0.0

### Minor Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: update docs & examples for V1

## 1.0.0-next.1

### Minor Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: update docs & examples for V1

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

## 0.2.3

### Patch Changes

- [#462](https://github.com/VoltAgent/voltagent/pull/462) [`23ecea4`](https://github.com/VoltAgent/voltagent/commit/23ecea421b8c699f5c395dc8aed687f94d558b6c) Thanks [@omeraplak](https://github.com/omeraplak)! - Update Zod to v3.25.0 for compatibility with Vercel AI@5
  - Updated Zod dependency to ^3.25.0 across all packages
  - Maintained compatibility with zod-from-json-schema@0.0.5
  - Fixed TypeScript declaration build hanging issue
  - Resolved circular dependency issues in the build process

## 0.2.2

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

## 0.2.1

### Patch Changes

- [#401](https://github.com/VoltAgent/voltagent/pull/401) [`4a7145d`](https://github.com/VoltAgent/voltagent/commit/4a7145debd66c7b1dfb953608e400b6c1ed02db7) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve TypeScript performance issues by fixing Zod dependency configuration (#377)

  Moved Zod from direct dependencies to peer dependencies in @voltagent/vercel-ai to prevent duplicate Zod installations that were causing TypeScript server slowdowns. Also standardized Zod versions across the workspace to ensure consistency.

  Changes:
  - @voltagent/vercel-ai: Moved `zod` from dependencies to peerDependencies
  - @voltagent/docs-mcp: Updated `zod` from `^3.23.8` to `3.24.2`
  - @voltagent/with-postgres: Updated `zod` from `^3.24.2` to `3.24.2` (removed caret)

  This fix significantly improves TypeScript language server performance by ensuring only one Zod version is processed, eliminating the "Type instantiation is excessively deep and possibly infinite" errors that users were experiencing.

- Updated dependencies [[`57c4874`](https://github.com/VoltAgent/voltagent/commit/57c4874d4d4807c50242b2e34ab9574fc6129888), [`da66f86`](https://github.com/VoltAgent/voltagent/commit/da66f86d92a278007c2d3386d22b482fa70d93ff), [`4a7145d`](https://github.com/VoltAgent/voltagent/commit/4a7145debd66c7b1dfb953608e400b6c1ed02db7)]:
  - @voltagent/core@0.1.61

## 0.2.0

### Minor Changes

- [#367](https://github.com/VoltAgent/voltagent/pull/367) [`d71efff`](https://github.com/VoltAgent/voltagent/commit/d71efff5d2b9822d787bfed62329e56ee441774a) Thanks [@Theadd](https://github.com/Theadd)! - feat(docs-mcp): dynamically discover example files

  Refactor the getExampleContent function to dynamically discover all relevant files in an example directory instead of relying on a hardcoded list. This introduces a new discoverExampleFiles helper function that recursively scans for .ts files in src, app, and voltagent directories with depth limits, while retaining backward compatibility. This ensures that documentation examples with complex file structures containing voltagent related code are fully captured and displayed.

  Resolves #365

## 0.1.8

### Patch Changes

- [`00d70cb`](https://github.com/VoltAgent/voltagent/commit/00d70cbb570e4d748ab37e177e4e5df869d52e03) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: update VoltAgent docs MCP configs

## 0.1.1

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

- Updated dependencies [[`937ccf8`](https://github.com/VoltAgent/voltagent/commit/937ccf8bf84a4261ee9ed2c94aab9f8c49ab69bd)]:
  - @voltagent/core@0.1.39
