# VoltAgent with battle.training MCP

Demonstrates connecting a VoltAgent agent to the remote Streamable HTTP MCP server at [battle.training](https://battle.training/) (`https://api.battle.training/mcp`).

## Overview

- Uses VoltAgent's `MCPConfiguration` with Streamable HTTP transport
- Discovers live arena tools (`get_started`, `list_ladders`, `get_ladder`, `get_cup`, `get_bot`)
- Exposes an agent via Hono HTTP server that answers tactical and standings queries about battle.training

## Getting Started

```bash
pnpm install
pnpm dev
```
