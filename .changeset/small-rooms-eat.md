---
"@voltagent/core": patch
---

feat: forward workspace runtime context to sandbox, search, and skills operations

### What's New

Workspace runtime context is now consistently propagated across workspace toolkits and internals, which enables tenant-aware routing patterns.

- `WorkspaceSandboxExecuteOptions` now includes `operationContext`.
- `execute_command` now forwards `operationContext` to `workspace.sandbox.execute(...)`.
- Search operations now accept/forward filesystem call context in indexing and query flows.
- Skills operations now accept/forward context in discovery, indexing, loading, activation, deactivation, search, and file reads.
- Skills `rootPaths` resolver now receives `operationContext` for dynamic root resolution.

### Multi-tenant workspace example (filesystem + search + skills)

```ts
import { Agent, NodeFilesystemBackend, Workspace } from "@voltagent/core";

const workspace = new Workspace({
  filesystem: {
    backend: ({ operationContext }) => {
      const tenantId = String(operationContext?.context.get("tenantId") ?? "default");
      return new NodeFilesystemBackend({
        rootDir: `./.workspace/${tenantId}`,
      });
    },
  },
  search: {
    autoIndexPaths: [{ path: "/", glob: "**/*.md" }],
  },
  skills: {
    rootPaths: async ({ operationContext }) => {
      const tenantId = String(operationContext?.context.get("tenantId") ?? "default");
      return ["/skills/common", `/skills/tenants/${tenantId}`];
    },
  },
});

const agent = new Agent({
  name: "tenant-aware-agent",
  model,
  workspace,
});

await agent.generateText("Search tenant docs and use relevant skills", {
  context: new Map([["tenantId", "acme"]]),
});
```

### Tenant-aware remote sandbox routing example (E2B/Daytona)

```ts
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";

class TenantSandboxRouter implements WorkspaceSandbox {
  name = "tenant-router";
  private readonly sandboxes = new Map<string, WorkspaceSandbox>();

  constructor(private readonly factory: (tenantId: string) => WorkspaceSandbox) {}

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const tenantId = String(options.operationContext?.context.get("tenantId") ?? "default");

    let sandbox = this.sandboxes.get(tenantId);
    if (!sandbox) {
      sandbox = this.factory(tenantId);
      this.sandboxes.set(tenantId, sandbox);
    }

    return sandbox.execute(options);
  }
}
```

If you call `workspace.sandbox.execute(...)` directly (outside toolkit execution), pass `operationContext` explicitly when you need tenant/account routing.
