---
title: Docs for AI Assistants
slug: /ai-assistants
hide_table_of_contents: true
---

# Docs for AI Assistants

VoltAgent supports two ways to give AI assistants access to up-to-date documentation. Pick the option that fits your workflow.

## Option 1: Local Skills

```bash
npx skills add VoltAgent/skills
```

Use this when your assistant can read local files. It uses the version-matched docs bundled with your project, so no additional setup is required.

## Option 2: MCP Docs Server

Use this when you want IDE-based access (Cursor, Windsurf, VS Code) or a remote assistant to query docs over MCP.

### What it does

The MCP Docs Server lets assistants:

- Search VoltAgent documentation
- Browse code examples
- Read changelogs

### Automatic install

When you create a new project with `create-voltagent-app@latest`, you can choose your IDE and the MCP Docs Server configuration files are generated automatically.

```bash
npm create voltagent-app@latest
# ✔ What is your project named? › my-app
# ✔ Which IDE are you using? (For MCP Docs Server configuration) › Cursor
# ✔ MCP Docs Server configured for Cursor!
#   Configuration file created in .cursor/mcp.json
```

### Manual setup

For existing projects, run:

```bash
volt mcp setup
```

Or configure your IDE directly.

#### Cursor

```json
{
  "name": "voltagent",
  "command": "npx",
  "args": ["-y", "@voltagent/docs-mcp"]
}
```

#### Windsurf

```json
{
  "name": "voltagent",
  "command": "npx",
  "args": ["-y", "@voltagent/docs-mcp"]
}
```

#### VS Code (macOS/Linux)

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

#### VS Code (Windows)

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

### Test it

Restart your IDE and ask:

```text
How do I create an agent in VoltAgent?
```

```text
Do you have a Next.js example with VoltAgent?
```

## When to use which

- **Local Skills**: best for repo-local assistants and offline workflows
- **MCP Docs Server**: best for IDE integrations and remote assistants
