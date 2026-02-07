---
title: Workspace Security
slug: /workspaces/security
---

# Workspace Security

> **Note: Workspace Security is Experimental**
> The Workspace API is experimental. Expect iteration and possible breaking changes as we refine the API.

Workspace is powerful; treat it like a production capability. Recommended practices:

- **Filesystem containment**: Keep all file access within a workspace root. Avoid exposing absolute host paths.
- **Read-only mode**: Use `filesystem.readOnly` for agents that should never write.
- **Tool policies**: Require approvals for write/delete and sandbox execution in untrusted contexts.
- **Sandbox isolation**: Prefer `LocalSandbox` with isolation enabled (and a dedicated root directory).
- **Environment variables**: Avoid inheriting the full process environment; pass only what is needed.
- **Timeouts**: Set `operationTimeoutMs` (and sandbox `timeout_ms`) to prevent runaway tasks.
- **Direct search access**: Keep `search.allowDirectAccess` disabled unless you truly need it.
- **Skills allowlist**: Access to skill references/scripts/assets is allowlisted; avoid loading arbitrary files.

## Tool policy defaults

`toolConfig` lets you set workspace-level defaults; agent-level toolkit options merge on top:

```ts
const workspace = new Workspace({
  toolConfig: {
    filesystem: {
      defaults: { needsApproval: true },
      tools: { write_file: { enabled: false } },
    },
  },
});
```

`requireReadBeforeWrite` ensures the agent calls `read_file` on the path before it can modify or delete it. If the file changes after it was read, the tool will ask the agent to re-read it.

## Timeboxing operations

`operationTimeoutMs` applies to workspace tool executions (filesystem, sandbox, search, skills). You can override it per toolkit:

```ts
const agent = new Agent({
  name: "workspace-agent",
  model,
  workspace,
  workspaceToolkits: {
    filesystem: { operationTimeoutMs: 10_000 },
    search: { operationTimeoutMs: 5_000 },
  },
});
```

Combined example (timeboxed tools + isolated local sandbox):

```ts
const workspace = new Workspace({
  operationTimeoutMs: 30_000,
  sandbox: new LocalSandbox({
    rootDir: "/tmp/voltagent",
    isolation: {
      provider: "sandbox-exec",
      allowNetwork: false,
      readWritePaths: ["/tmp/voltagent"],
    },
  }),
});
```
