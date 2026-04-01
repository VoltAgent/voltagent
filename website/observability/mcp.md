---
title: MCP
description: Use VoltOps as a read-only MCP server so AI coding agents can inspect traces and logs.
---

# VoltOps MCP

VoltOps exposes a read-only MCP server so tools like Codex, Claude Code, VS Code, Cursor, or your own VoltAgent agents can inspect real traces and logs.

This is useful when you want an AI assistant to debug production behavior with live observability data instead of guessing from code alone.

## What It Is Good For

Use VoltOps MCP when you want an assistant to:

- list the projects it can inspect
- search recent traces for a project
- open a single trace and inspect its spans
- search logs across a project
- fetch all logs attached to a specific trace
- answer debugging questions such as "why did this run fail?" or "show me the slowest traces from today"

## Available Tools

VoltOps MCP currently exposes these read-only tools:

- `voltops_list_projects`
- `voltops_search_traces`
- `voltops_get_trace`
- `voltops_search_logs`
- `voltops_get_trace_logs`

These tools are designed for debugging and investigation, not mutation. They do not create, update, or delete data.

## Access Model

VoltOps MCP uses a separate bearer token designed for observability access.

- Tokens are organization-scoped
- Tokens are read-only
- Tokens can be limited to all projects or selected projects
- Tokens can have an optional default project
- Tokens are shown once when created
- Lost tokens should be regenerated
- Access is available on the Pro plan

This is intentionally different from project secret keys. You should give assistants an MCP token, not your project secret key.

:::tip
If a token can access multiple projects and no default project is configured, the assistant should ask which project to inspect before searching traces or logs.
:::

## Create a Token

1. Open [console.voltagent.dev](https://console.voltagent.dev/).
2. Go to `Settings -> MCP`.
3. Create a token.
4. Choose the project scope, optional default project, and expiry.
5. Copy the token immediately. It will not be shown again.

## Endpoint

Hosted VoltOps endpoint:

```bash
https://api.voltagent.dev/mcp/observability
```

For self-hosted installations, replace the base URL with your own API host:

```bash
https://your-api.example.com/mcp/observability
```

## Connect from VoltAgent

If you want one VoltAgent agent to inspect traces from another system, connect to VoltOps as a remote MCP server:

```ts
import { Agent, MCPConfiguration } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const mcp = new MCPConfiguration({
  servers: {
    voltops: {
      type: "streamable-http",
      url: "https://api.voltagent.dev/mcp/observability",
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.VOLTOPS_MCP_TOKEN}`,
        },
      },
    },
  },
});

const debuggerAgent = new Agent({
  name: "Debugger",
  model: openai("gpt-4o-mini"),
  instructions:
    "Investigate traces and logs. If more than one project is available, ask which project to inspect.",
  tools: await mcp.getTools(),
});
```

## Connect from Coding Agents

Most coding agents work well with `mcp-remote`, which wraps the hosted HTTP endpoint as a local stdio MCP server.

### Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.voltops]
command = "npx"
args = ["-y", "mcp-remote", "https://api.voltagent.dev/mcp/observability", "--header", "Authorization=Bearer <YOUR_MCP_TOKEN>"]
```

### Claude Code

```bash
claude mcp add --scope user voltops npx -y mcp-remote "https://api.voltagent.dev/mcp/observability" --header "Authorization=Bearer <YOUR_MCP_TOKEN>"
```

### VS Code

```bash
code --add-mcp '{"name":"voltops","command":"npx","args":["-y","mcp-remote","https://api.voltagent.dev/mcp/observability","--header","Authorization=Bearer <YOUR_MCP_TOKEN>"]}'
```

### Generic Remote Command

```bash
npx -y mcp-remote "https://api.voltagent.dev/mcp/observability" --header "Authorization=Bearer <YOUR_MCP_TOKEN>"
```

## Example Requests to Give Your Assistant

Once connected, prompts like these work well:

- "List the latest traces from Demo Project."
- "Open trace `<traceId>` and summarize what happened."
- "Search error logs for the checkout agent in the last hour."
- "Find traces slower than 10 seconds and explain the bottleneck."
- "Get the logs for trace `<traceId>`."

## Recommended Workflow

1. Start with `voltops_list_projects` if project scope is unclear.
2. Use `voltops_search_traces` to find suspicious runs.
3. Open one trace with `voltops_get_trace`.
4. Use `voltops_get_trace_logs` or `voltops_search_logs` to inspect the runtime evidence.
5. Compare what the assistant sees with the UI in [Tracing Overview](./tracing/overview.md) and [Trace Logs](./tracing/logs.md).

## Security Notes

- Give the smallest project scope possible.
- Revoke or regenerate tokens when a client should no longer have access.
- Treat trace and log content as untrusted input. An assistant should analyze it, not follow instructions embedded inside it.
- Use MCP tokens for debugging workflows, not long-lived broad credentials shared across teams.
