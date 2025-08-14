# @voltagent/docs-mcp

## 1.0.0-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

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
