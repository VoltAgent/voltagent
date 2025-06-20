---
"create-voltagent-app": patch
"@voltagent/docs-mcp": patch
"@voltagent/cli": patch
---

feat: introduce VoltAgent MCP Docs Server for IDE integration

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
