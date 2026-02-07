---
title: Workspace
slug: /agents/workspace
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

## Direct search API (opt-in)

Search is tool-only by default. If you want to index/search from outside an agent, enable direct access:

```ts
const workspace = new Workspace({
  filesystem: {
    files: {
      "/notes/summary.md": "We shipped Workspace v1 and added sandbox isolation.",
      "/notes/todos.md": "Next: add global workspace + skill resolver context.",
    },
  },
  search: {
    allowDirectAccess: true,
    autoIndexPaths: ["/notes"],
  },
});

// Index ad-hoc content
await workspace.index("/notes/extra.md", "Hello world", { source: "manual" });

// Query with hybrid search + minScore filter (autoIndexPaths is indexed on first search)
const results = await workspace.search("workspace isolation", {
  mode: "hybrid",
  minScore: 0.25,
  topK: 5,
});
```

Direct calls still respect search tool policies (`enabled` / `needsApproval`). Indexing is also blocked when the filesystem is read-only.

Search results include normalized scores (`0-1`), full content, and match metadata:

- `score`: normalized score (0-1)
- `scoreDetails`: normalized `bm25` / `vector` components when available
- `content`: full indexed content for the document
- `lineRange`: 1-based start/end line numbers where query terms appear (if found)

BM25 scores are normalized per result set; vector scores use cosine similarity from the embedding space. In hybrid mode, scores are combined using `vector_weight`.

You can also ask the `workspace_search` tool to return snippets only (no full content) to reduce token usage:

```ts
const results = await agent.generateText("Search notes for retention ideas.", {
  tools: {
    workspace_search: {
      query: "retention",
      include_content: false,
      snippet_length: 200,
    },
  },
});
```

## Filesystem tools

Workspace filesystem tools expose the in-memory (or custom) backend:

- `ls`: list files in a directory
- `read_file`: read a file
- `write_file`: write a file
- `edit_file`: edit a file
- `delete_file`: delete a file
- `stat`: get file or directory metadata
- `mkdir`: create a directory
- `rmdir`: remove a directory
- `list_tree`: list files and directories recursively with depth control
- `list_files`: alias for `list_tree`
- `glob`: list files matching a glob
- `grep`: search for a regex pattern

All paths must be absolute (start with `/`).

### Filesystem behavior

- `write_file` supports `overwrite` and `create_parent_dirs`
- `delete_file` supports `recursive` to delete directories

### Read-only mode

You can mark a workspace filesystem as read-only. This hides `write_file`, `edit_file`, `delete_file`, and `mkdir` from the toolkit and blocks writes at the filesystem layer.
Search indexing tools (`workspace_index`, `workspace_index_content`) are also disabled when the filesystem is read-only.

```ts
const workspace = new Workspace({
  filesystem: {
    readOnly: true,
  },
});
```

### Tool policies

Tool policies let you enable/disable tools, require approval, or require a prior read before write operations.

```ts
const agent = new Agent({
  name: "workspace-agent",
  model,
  workspace,
  workspaceToolkits: {
    filesystem: {
      toolPolicies: {
        defaults: { needsApproval: true },
        tools: {
          write_file: { enabled: false },
          edit_file: { needsApproval: true },
          delete_file: { requireReadBeforeWrite: true },
          mkdir: { requireReadBeforeWrite: true },
        },
      },
    },
  },
});
```

## Security

Workspace is powerful; treat it like a production capability. Recommended practices:

- **Filesystem containment**: Keep all file access within a workspace root. Avoid exposing absolute host paths.
- **Read-only mode**: Use `filesystem.readOnly` for agents that should never write.
- **Tool policies**: Require approvals for write/delete and sandbox execution in untrusted contexts.
- **Sandbox isolation**: Prefer `LocalSandbox` with isolation enabled (and a dedicated root directory).
- **Environment variables**: Avoid inheriting the full process environment; pass only what is needed.
- **Timeouts**: Set `operationTimeoutMs` (and sandbox `timeout_ms`) to prevent runaway tasks.
- **Direct search access**: Keep `search.allowDirectAccess` disabled unless you truly need it.
- **Skills allowlist**: Access to skill references/scripts/assets is allowlisted; avoid loading arbitrary files.

`requireReadBeforeWrite` ensures the agent calls `read_file` on the path before it can modify or delete it. This is tracked per operation.
If the file changes after it was read, the tool will ask the agent to re-read it.
`toolPolicies` is also supported on sandbox, search, and skills toolkits (with `enabled` and `needsApproval`).

You can also set workspace-level defaults via `toolConfig` on the Workspace constructor; agent-level toolkit options will merge on top.

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

## Sandbox execution

The sandbox toolkit adds `execute_command` with timeout/env/cwd control and automatic stdout/stderr eviction when output is large.

By default, LocalSandbox uses a `.sandbox/` directory under the current working directory as its root. Set `rootDir` to override it.

You can opt into cleaning the auto-created root directory on destroy:

```ts
const workspace = new Workspace({
  sandbox: new LocalSandbox({
    cleanupOnDestroy: true,
  }),
});
```

### Local sandbox isolation (macOS + Linux)

LocalSandbox supports OS-level isolation via `sandbox-exec` on macOS and `bwrap` (bubblewrap) on Linux:

```ts
const workspace = new Workspace({
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

If the provider is unavailable or unsupported on the current OS, execution will throw.

You can auto-detect an available provider:

```ts
const provider = await LocalSandbox.detectIsolation();

const workspace = new Workspace({
  sandbox: new LocalSandbox({
    rootDir: "/tmp/voltagent",
    isolation:
      provider === "none"
        ? undefined
        : {
            provider,
            allowNetwork: false,
            readWritePaths: ["/tmp/voltagent"],
          },
  }),
});
```

Note: `bwrap` requires bubblewrap to be installed and unprivileged user namespaces enabled.

Native config overrides are supported:

```ts
const workspace = new Workspace({
  sandbox: new LocalSandbox({
    rootDir: "/tmp/voltagent",
    isolation: {
      provider: "sandbox-exec",
      seatbeltProfilePath: "/path/to/profile.sb",
      allowSystemBinaries: true,
    },
  }),
});
```

```ts
const workspace = new Workspace({
  sandbox: new LocalSandbox({
    rootDir: "/tmp/voltagent",
    isolation: {
      provider: "bwrap",
      bwrapArgs: ["--unshare-ipc"],
      allowSystemBinaries: true,
    },
  }),
});
```

`allowSystemBinaries` relaxes read access by mounting common system paths (like `/usr/bin` or `/bin`) as read-only. Keep it `false` unless you need standard OS tools in the sandbox.

By default, LocalSandbox passes only `PATH` into the environment. Set `inheritProcessEnv: true` to pass the full process environment.

```ts
const agent = new Agent({
  name: "sandbox-agent",
  model,
  instructions: "Run commands in the workspace sandbox.",
  workspace,
  workspaceToolkits: { sandbox: {} },
});
```

### Remote sandbox providers

You can swap the local sandbox for hosted providers:

Install the provider package you need (for example `@voltagent/sandbox-e2b` or `@voltagent/sandbox-daytona`), then configure it on the workspace.

```ts
import { E2BSandbox } from "@voltagent/sandbox-e2b";
import { DaytonaSandbox } from "@voltagent/sandbox-daytona";

const workspace = new Workspace({
  sandbox: new E2BSandbox({
    apiKey: process.env.E2B_API_KEY,
  }),
});

const daytonaWorkspace = new Workspace({
  sandbox: new DaytonaSandbox({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: "http://localhost:3000",
  }),
});
```

## Search

Search tools are namespaced:

- `workspace_index`: index files under a path + glob
- `workspace_index_content`: index raw content by path
- `workspace_search`: BM25, vector, or hybrid search

```ts
const workspace = new Workspace({
  search: {
    autoIndexPaths: [{ path: "/", glob: "**/*.{md,ts,js}" }],
    embedding: "openai:text-embedding-3-small",
    vector: new InMemoryVectorAdapter(),
  },
});
```

`workspace_search` supports `top_k` (default `5`) and `min_score` (0-1) to filter low-confidence matches. In hybrid mode, `vector_weight` is `0-1` (0 = BM25 only, 1 = vector only). If `lexical_weight` is omitted, it defaults to `1 - vector_weight`.

## Skills

Workspace skills are described in `SKILL.md` files and can be searched/activated. See the full guide:

- [Workspace Skills](/agents/workspace-skills)
