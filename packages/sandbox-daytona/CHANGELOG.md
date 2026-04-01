# @voltagent/sandbox-daytona

## 2.0.2

### Patch Changes

- [#1051](https://github.com/VoltAgent/voltagent/pull/1051) [`b0482cb`](https://github.com/VoltAgent/voltagent/commit/b0482cb16e3c2aff786581a1291737f772e1d19d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: align sandbox package core dependency strategy with plugin best practices
  - Update `@voltagent/sandbox-daytona` to use `@voltagent/core` via `peerDependencies` + `devDependencies` instead of runtime `dependencies`.
  - Raise `@voltagent/sandbox-daytona` peer minimum to `^2.3.8` to match runtime usage of `normalizeCommandAndArgs`.
  - Align `@voltagent/sandbox-e2b` development dependency on `@voltagent/core` to `^2.3.8`.

- [#1068](https://github.com/VoltAgent/voltagent/pull/1068) [`b95293b`](https://github.com/VoltAgent/voltagent/commit/b95293bb71f144ea106bcf809f446760af7c4227) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: expose the underlying Daytona SDK sandbox instance from `DaytonaSandbox`.
  - Added a public `getSandbox()` method that returns the original `@daytonaio/sdk` `Sandbox` instance so provider-specific APIs can be used directly.
  - Added `DaytonaSandboxInstance` type export for the underlying SDK sandbox type.

## 2.0.1

### Patch Changes

- [#1025](https://github.com/VoltAgent/voltagent/pull/1025) [`c783943`](https://github.com/VoltAgent/voltagent/commit/c783943fa165734fcadabbd0c6ce12212b3a5969) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce experimental Workspace support with filesystem, sandbox execution, search indexing, and skill discovery; add global workspace defaults and optional sandbox providers (E2B/Daytona). - #1008

  Example:

  ```ts
  import { Agent, Workspace, LocalSandbox, NodeFilesystemBackend } from "@voltagent/core";

  const workspace = new Workspace({
    id: "support-workspace",
    operationTimeoutMs: 30_000,
    filesystem: {
      backend: new NodeFilesystemBackend({
        rootDir: "./.workspace",
      }),
    },
    sandbox: new LocalSandbox({
      rootDir: "./.sandbox",
      isolation: { provider: "detect" },
      cleanupOnDestroy: true,
    }),
    search: {
      autoIndexPaths: ["/notes", "/tickets"],
    },
    skills: {
      rootPaths: ["/skills"],
    },
  });

  const agent = new Agent({
    name: "support-agent",
    model,
    instructions: "Use workspace tools to review tickets and summarize findings.",
    workspace,
    workspaceToolkits: {
      filesystem: {
        toolPolicies: {
          tools: { write_file: { needsApproval: true } },
        },
      },
    },
  });

  const { text } = await agent.generateText(
    [
      "Scan /tickets and /notes.",
      "Use workspace_search to find urgent issues from the last week.",
      "Summarize the top 3 risks and include file paths as citations.",
    ].join("\n"),
    { maxSteps: 40 }
  );
  ```
