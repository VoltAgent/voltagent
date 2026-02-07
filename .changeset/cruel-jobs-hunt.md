---
"@voltagent/sandbox-daytona": patch
"@voltagent/serverless-hono": patch
"@voltagent/server-elysia": patch
"@voltagent/sandbox-e2b": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/core": patch
---

feat: introduce experimental Workspace support with filesystem, sandbox execution, search indexing, and skill discovery; add global workspace defaults and optional sandbox providers (E2B/Daytona). - #1008

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
