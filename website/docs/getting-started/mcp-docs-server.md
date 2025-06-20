---
title: MCP Docs Server
---

# VoltAgent MCP Docs Server

The VoltAgent MCP (Model Context Protocol) Docs Server enables your AI assistants to directly access VoltAgent documentation, examples, and changelogs. This allows your AI assistant to answer VoltAgent-related questions in real-time using the most up-to-date documentation.

## What Does It Do?

With the MCP Docs Server, your AI assistant can:

- 📚 **Search VoltAgent documentation** - Find detailed explanations on any topic
- 🔍 **Browse code examples** - Show working code examples from real projects
- 📋 **Browse changelogs** - Provide information about bug fixes and new features

## Automatic Installation

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::tip Automatic Installation
When you create a new project with `create-voltagent-app@latest`, you'll be asked which IDE you're using (Cursor, Windsurf, or VS Code). The MCP Docs Server will be automatically installed and configured for your chosen IDE. No additional setup is required.
:::

```bash
npm create voltagent-app@latest
# ✔ What is your project named? › my-app
# ✔ Which package manager do you want to use? › npm
# ✔ Which IDE are you using? (For MCP Docs Server configuration) › Cursor
# ✔ MCP Docs Server configured for Cursor!
#   Configuration file created in .cursor/mcp.json
```

## Manual Setup (Advanced)

:::info When is Manual Setup Needed?
Manual setup is only needed if you're adding MCP Docs Server to an existing project that wasn't created with `create-voltagent-app@latest`.
:::

### Quick Setup with CLI

For existing VoltAgent projects, you can use the dedicated CLI command:

```bash
volt mcp setup
```

This interactive command will:

- Create the appropriate configuration files
- Guide you through the setup process

### Manual Configuration

If you prefer manual configuration, directly configure your IDE:

<Tabs>
  <TabItem value="cursor" label="Cursor">

1. **Open Cursor settings**: `Cmd/Ctrl + ,`
2. **Navigate to "Features" > "Model Context Protocol"**
3. **Add a new MCP server**:

```json
{
  "name": "voltagent",
  "command": "npx",
  "args": ["-y", "@voltagent/docs-mcp"]
}
```

**To use a local build**:

```json
{
  "name": "voltagent",
  "command": "node",
  "args": ["path/to/voltagent/packages/docs-mcp/dist/server.js"]
}
```

4. **Save settings** and restart Cursor

  </TabItem>
  <TabItem value="windsurf" label="Windsurf">

1. **Open Windsurf settings**: `Cmd/Ctrl + ,`
2. **Find "Extensions" > "Model Context Protocol"** or search for "MCP" in settings
3. **Add a new MCP server configuration**:

```json
{
  "name": "voltagent",
  "command": "npx",
  "args": ["-y", "@voltagent/docs-mcp"]
}
```

**To use a local build**:

```json
{
  "name": "voltagent",
  "command": "node",
  "args": ["path/to/voltagent/packages/docs-mcp/dist/server.js"]
}
```

4. **Save settings** and restart Windsurf

  </TabItem>
  <TabItem value="vscode" label="VS Code">

**Option 1: With MCP Extension**

1. **Install the MCP extension** (if available) or use the Claude extension that supports MCP
2. **Open VS Code settings**: `Cmd/Ctrl + ,`
3. **Search for "MCP" or "Model Context Protocol"**
4. **Add server configuration**:

**Windows:**

```json
{
  "servers": {
    "voltagent": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@voltagent/docs-mcp"],
      "type": "stdio"
    }
  }
}
```

**macOS/Linux:**

```json
{
  "servers": {
    "voltagent": {
      "command": "npx",
      "args": ["-y", "@voltagent/docs-mcp"],
      "type": "stdio"
    }
  }
}
```

**Option 2: With Claude Desktop**

1. **Edit your Claude Desktop configuration file**:

   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the MCP server**:

```json
{
  "mcpServers": {
    "voltagent": {
      "command": "npx",
      "args": ["-y", "@voltagent/docs-mcp"]
    }
  }
}
```

:::note Automatic Configuration
If you created your project with `create-voltagent-app@latest`, the appropriate configuration files have already been created in your project directory (`.cursor/mcp.json`, `.windsurf/mcp.json`, or `.vscode/mcp.json` depending on your IDE choice).
:::

3. **Restart Claude Desktop**

  </TabItem>
</Tabs>

## Testing Your Setup

After creating your project with `create-voltagent-app@latest` (or completing manual setup), restart your IDE and test the MCP connection by asking your AI assistant questions like:

```
How do I create an agent in VoltAgent?
```

```
Do you have a Next.js example with VoltAgent?
```

```
How do I use the voice features?
```

## CLI Commands

The VoltAgent CLI provides several commands to manage your MCP setup:

### `volt mcp setup`

Interactive setup command that configures MCP for your IDE:

```bash
volt mcp setup        # Interactive setup
volt mcp setup --force # Force overwrite existing configuration
```

### `volt mcp status`

Check the current MCP configuration status:

```bash
volt mcp status
```

### `volt mcp test`

Get test suggestions and troubleshooting tips:

```bash
volt mcp test
```

### `volt mcp remove`

Remove MCP configuration:

```bash
volt mcp remove
```

## Available Tools

The MCP Docs Server provides these tools:

### 📚 Documentation Tools

- **search_voltagent_docs**: Search through documentation
- **get_voltagent_doc**: Get specific documentation file
- **list_voltagent_docs**: List documentation structure

### 🔍 Example Tools

- **search_voltagent_examples**: Search through examples
- **get_voltagent_example**: Get specific example content
- **list_voltagent_examples**: List available examples

### 📋 Changelog Tools

- **list_voltagent_changelogs**: List package changelogs
- **get_voltagent_changelog**: Get specific package changelog
- **search_voltagent_changelogs**: Search across changelogs

## Example Usage Scenarios

### Quick Start Questions

```
"How do I get started with VoltAgent?"
"How do I create the simplest agent example?"
```

### Technology-Specific Questions

```
"How do I integrate VoltAgent with Supabase?"
"Can you explain the voice features?"
"Do you have an example using VoltAgent with Next.js?"
```

### Problem Solving

```
"I'm getting an authentication error, is there a solution?"
"What bug fixes were made in recent updates?"
```

### Code Examples

```
"How do I create an MCP server, show me an example"
"How do I write a tool, I want working code"
```

## Manual Server Execution

If you want to run the server manually:

```bash
# Run with NPX
npx @voltagent/docs-mcp

# Run with local build
node path/to/voltagent/packages/docs-mcp/dist/server.js
```

The server will start and begin listening for MCP connections.

## Troubleshooting

### Server Won't Start

- Ensure your Node.js version is up to date (Node.js 18+)
- Check package installation: `npm ls @voltagent/docs-mcp`

### AI Assistant Can't See Tools

- Restart your editor
- Check your MCP configuration
- Verify the server is running

### Slow Responses

- Check your internet connection
- Test if the server is running locally

:::info Need More Help?
If problems persist, you can join our [VoltAgent Discord](https://s.voltagent.dev/discord) or get support through [GitHub Issues](https://github.com/voltagent/voltagent/issues).
:::
