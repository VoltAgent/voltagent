---
title: Workspace Filesystem
slug: /workspaces/filesystem
---

# Workspace Filesystem

> **Note: Workspace Filesystem is Experimental**
> The Workspace API is experimental. Expect iteration and possible breaking changes as we refine the API.

Workspace filesystem provides a persistent (or in-memory) file layer for agents. Use it to store notes, datasets, and intermediate outputs.

## Backend options

In-memory is the default. For disk persistence, use `NodeFilesystemBackend`:

```ts
import { Workspace, NodeFilesystemBackend } from "@voltagent/core";

const workspace = new Workspace({
  filesystem: {
    backend: new NodeFilesystemBackend({
      rootDir: "./.workspace",
    }),
  },
});
```

All filesystem tool paths are workspace-relative and must start with `/`.

### Runtime context in backend factories

Custom backend factories receive `operationContext`, so you can route filesystem storage at runtime (for example, by tenant/account).

```ts
import { Workspace, NodeFilesystemBackend } from "@voltagent/core";

const workspace = new Workspace({
  filesystem: {
    backend: ({ operationContext }) => {
      const tenantId = String(operationContext?.context.get("tenantId") ?? "default");
      return new NodeFilesystemBackend({
        rootDir: `./.workspace/${tenantId}`,
      });
    },
  },
});
```

For production, sanitize tenant IDs before using them in file paths.

## Filesystem tools

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

## Behavior

- `write_file` supports `overwrite` and `create_parent_dirs`
- `delete_file` supports `recursive` to delete directories

## Read-only mode

Mark the filesystem as read-only to block writes and hide write tools from the toolkit:

```ts
const workspace = new Workspace({
  filesystem: {
    readOnly: true,
  },
});
```

When read-only, `workspace_index` and `workspace_index_content` are also disabled.

## Tool policies (filesystem)

Tool policies let you enable/disable tools, require approval, or enforce read-before-write:

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

`requireReadBeforeWrite` forces a `read_file` call before edits/deletes and prompts a re-read if the file changes.

## Security notes

- Keep filesystem access within a workspace root.
- Avoid exposing absolute host paths.
- Prefer read-only mode for untrusted agents.

For broader recommendations, see [Workspace Security](../security).
