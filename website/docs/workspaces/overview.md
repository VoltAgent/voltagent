---
title: Workspace
slug: /workspaces
---

# Workspace

> **Note: Workspace is Experimental**
> The Workspace API is experimental. Expect iteration and possible breaking changes as we refine the API.

Workspace gives agents a persistent home base with filesystem, sandbox execution, search, and skills. It keeps tool usage structured and observable while staying configurable per agent or conversation.

## Quick start

```ts
import { Agent, Workspace, LocalSandbox, InMemoryVectorAdapter } from "@voltagent/core";

const workspace = new Workspace({
  id: "demo-workspace",
  operationTimeoutMs: 30000,
  filesystem: {
    // Defaults to in-memory. Swap in NodeFilesystemBackend or a custom backend for persistence.
  },
  sandbox: new LocalSandbox(),
  search: {
    autoIndexPaths: ["/"],
    embedding: "openai:text-embedding-3-small",
    vector: new InMemoryVectorAdapter(),
  },
  skills: {
    rootPaths: ["/skills"],
  },
});

const agent = new Agent({
  name: "workspace-agent",
  model,
  instructions: "Use workspace tools when needed.",
  workspace,
  // workspaceToolkits is optional; defaults add filesystem + sandbox + search + skills
});
```

If you only want specific toolkits:

```ts
const agent = new Agent({
  name: "workspace-agent",
  model,
  instructions: "Use workspace tools when needed.",
  workspace,
  workspaceToolkits: {
    filesystem: false,
    sandbox: {},
    search: {},
    skills: {},
  },
});
```

You can also set a global workspace on the VoltAgent instance. Agents inherit it unless they pass their own `workspace` or set `workspace: false`:

```ts
import { Agent, VoltAgent, Workspace } from "@voltagent/core";

const workspace = new Workspace({ id: "shared-workspace" });

const volt = new VoltAgent({
  workspace,
  agents: {
    support: new Agent({ name: "support", model }),
  },
});
```

Skills root resolvers can receive context:

```ts
const workspace = new Workspace({
  skills: {
    rootPaths: async ({ workspace, filesystem }) => ["/skills", `/skills/${workspace.id}`],
  },
});
```

## Workspace lifecycle + utilities

You can initialize or tear down the workspace explicitly, and inspect runtime info:

```ts
await workspace.init();

const info = workspace.getInfo();
const pathContext = workspace.getPathContext();
const toolsConfig = workspace.getToolsConfig();

await workspace.destroy();
```

## Guides

- [Filesystem](./filesystem)
- [Search](./search)
- [Sandbox](./sandbox)
- [Skills](./skills)
- [Security](./security)
