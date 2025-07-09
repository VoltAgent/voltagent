# @voltagent/docs-mcp

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
