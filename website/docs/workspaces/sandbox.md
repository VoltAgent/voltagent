---
title: Workspace Sandbox
slug: /workspaces/sandbox
---

# Workspace Sandbox

:::warning Experimental
The Workspace API is experimental. Expect iteration and possible breaking changes as we refine the API.
:::

A sandbox is an isolated environment where an agent can run shell commands without touching the host. Usually a container, a remote VM, or an OS-level jail. VoltAgent reaches them through the `WorkspaceSandbox` interface. First-party providers exist for [Blaxel](#blaxel), [Daytona](#daytona), and [E2B](#e2b), plus `LocalSandbox` for running things locally.

Agents interact with the sandbox through a tool called `execute_command`. They pass a command (plus optional env vars, working directory, and timeout), and the workspace runs it in the sandbox and returns the result. Large stdout or stderr gets truncated so the model doesn't drown in logs.

## LocalSandbox basics

By default, `LocalSandbox` uses a `.sandbox/` directory under the current working directory.

```ts
const workspace = new Workspace({
  sandbox: new LocalSandbox({
    rootDir: "/tmp/voltagent",
  }),
});
```

You can opt into cleaning the auto-created root directory on destroy:

```ts
const workspace = new Workspace({
  sandbox: new LocalSandbox({
    cleanupOnDestroy: true,
  }),
});
```

## Isolation (macOS + Linux)

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

Auto-detect a provider:

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

### Native config overrides

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

## Remote sandbox providers

Every provider implements `WorkspaceSandbox`, so the workspace toolkit drives them all the same way. Need something the abstraction doesn't expose? `sandbox.getSandbox()` returns the underlying client.

### Available providers

| Provider | Package                      | Upstream docs                                  |
| -------- | ---------------------------- | ---------------------------------------------- |
| Blaxel   | `@voltagent/sandbox-blaxel`  | [docs.blaxel.ai](https://docs.blaxel.ai)       |
| Daytona  | `@voltagent/sandbox-daytona` | [daytona.io/docs](https://www.daytona.io/docs) |
| E2B      | `@voltagent/sandbox-e2b`     | [e2b.dev/docs](https://e2b.dev/docs)           |

### Blaxel

Cloud sandbox runtime with multi-region edge presence. Pre-warms HTTP/2 connections so the first `execute()` doesn't pay a cold-start penalty. Built on [`@blaxel/core`](https://www.npmjs.com/package/@blaxel/core).

Install:

```bash
pnpm add @voltagent/sandbox-blaxel
```

_Pulls in `@blaxel/core` automatically. No separate install._

Configure it on a workspace:

```ts
import { Workspace } from "@voltagent/core";
import { BlaxelSandbox } from "@voltagent/sandbox-blaxel";

const workspace = new Workspace({
  sandbox: new BlaxelSandbox({
    apiKey: process.env.BL_API_KEY,
    workspace: process.env.BL_WORKSPACE,
    config: { name: "voltagent-prod", region: "us-pdx-1" },
  }),
});
```

When you want filesystem, previews, or sessions APIs, grab the underlying client:

```ts
import { BlaxelSandbox } from "@voltagent/sandbox-blaxel";

const sandbox = new BlaxelSandbox({
  apiKey: process.env.BL_API_KEY,
  workspace: process.env.BL_WORKSPACE,
  config: { name: "voltagent-prod" },
});

const workspace = new Workspace({ sandbox });

const blaxelSandbox = await sandbox.getSandbox();
const file = await blaxelSandbox.fs.read("/workspace/file.txt");
```

Multi-tenant routing: one Blaxel sandbox per tenant, picked from `operationContext`.

```ts
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";
import { Workspace } from "@voltagent/core";
import { BlaxelSandbox } from "@voltagent/sandbox-blaxel";

class TenantBlaxelSandboxRouter implements WorkspaceSandbox {
  name = "tenant-blaxel-router";
  status = "ready" as const;
  // In production, add LRU/TTL eviction here and dispose evicted sandboxes
  // (for example via stop/destroy) to avoid unbounded per-tenant growth.
  private readonly sandboxes = new Map<string, BlaxelSandbox>();

  getInfo() {
    return {
      provider: "tenant-blaxel-router",
      status: this.status,
      sandboxCount: this.sandboxes.size,
    };
  }

  private getSandboxForTenant(tenantId: string): BlaxelSandbox {
    let sandbox = this.sandboxes.get(tenantId);
    if (!sandbox) {
      sandbox = new BlaxelSandbox({
        apiKey: process.env.BL_API_KEY,
        workspace: process.env.BL_WORKSPACE,
        config: { name: `tenant-${tenantId}` },
      });
      this.sandboxes.set(tenantId, sandbox);
    }
    return sandbox;
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const tenantId = String(options.operationContext?.context.get("tenantId") ?? "default");
    return this.getSandboxForTenant(tenantId).execute(options);
  }
}

const workspace = new Workspace({
  sandbox: new TenantBlaxelSandboxRouter(),
});
```

### Daytona

Sandbox plus dev-environment platform. Hosted or self-hosted. Built on [`@daytonaio/sdk`](https://www.npmjs.com/package/@daytonaio/sdk).

Install:

```bash
pnpm add @voltagent/sandbox-daytona
```

_Pulls in `@daytonaio/sdk` automatically. No separate install._

Configure it on a workspace:

```ts
import { Workspace } from "@voltagent/core";
import { DaytonaSandbox } from "@voltagent/sandbox-daytona";

const workspace = new Workspace({
  sandbox: new DaytonaSandbox({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: "http://localhost:3000",
  }),
});
```

For Daytona-specific APIs, grab the underlying client:

```ts
import { DaytonaSandbox } from "@voltagent/sandbox-daytona";

const sandbox = new DaytonaSandbox({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: "http://localhost:3000",
});

const workspace = new Workspace({ sandbox });

const daytonaSandbox = await sandbox.getSandbox();
const response = await daytonaSandbox.process.executeCommand("ls -la");
```

Multi-tenant routing: one Daytona sandbox per tenant, dispatched via `operationContext`.

```ts
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";
import { Workspace } from "@voltagent/core";
import { DaytonaSandbox } from "@voltagent/sandbox-daytona";

class TenantDaytonaSandboxRouter implements WorkspaceSandbox {
  name = "tenant-daytona-router";
  status = "ready" as const;
  // In production, add LRU/TTL eviction here and dispose evicted sandboxes
  // (for example via stop/destroy) to avoid unbounded per-tenant growth.
  private readonly sandboxes = new Map<string, DaytonaSandbox>();

  getInfo() {
    return {
      provider: "tenant-daytona-router",
      status: this.status,
      sandboxCount: this.sandboxes.size,
    };
  }

  private getSandboxForTenant(tenantId: string): DaytonaSandbox {
    let sandbox = this.sandboxes.get(tenantId);
    if (!sandbox) {
      sandbox = new DaytonaSandbox({
        apiKey: process.env.DAYTONA_API_KEY,
        apiUrl: process.env.DAYTONA_API_URL,
        // Example strategy: pass tenant metadata to your Daytona create params
        createParams: { name: `tenant-${tenantId}` },
      });
      this.sandboxes.set(tenantId, sandbox);
    }
    return sandbox;
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const tenantId = String(options.operationContext?.context.get("tenantId") ?? "default");
    return this.getSandboxForTenant(tenantId).execute(options);
  }
}

const workspace = new Workspace({
  sandbox: new TenantDaytonaSandboxRouter(),
});
```

### E2B

Cloud sandboxes built for AI agent workloads: code interpreters, browser automation, that kind of thing. Built on [`e2b`](https://www.npmjs.com/package/e2b).

Install:

```bash
pnpm add @voltagent/sandbox-e2b
```

_Pulls in `e2b` automatically. No separate install._

Configure it on a workspace:

```ts
import { Workspace } from "@voltagent/core";
import { E2BSandbox } from "@voltagent/sandbox-e2b";

const workspace = new Workspace({
  sandbox: new E2BSandbox({
    apiKey: process.env.E2B_API_KEY,
  }),
});
```

For E2B-specific APIs (filesystem, code interpreter sessions, etc.), grab the underlying client:

```ts
import { E2BSandbox } from "@voltagent/sandbox-e2b";

const sandbox = new E2BSandbox({
  apiKey: process.env.E2B_API_KEY,
});

const workspace = new Workspace({ sandbox });

const e2bSandbox = await sandbox.getSandbox();
const bytes = await e2bSandbox.files.read("/workspace/file.txt", { format: "bytes" });
```

Multi-tenant routing: one E2B sandbox per tenant, keyed on `operationContext`.

```ts
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";
import { Workspace } from "@voltagent/core";
import { E2BSandbox } from "@voltagent/sandbox-e2b";

class TenantE2BSandboxRouter implements WorkspaceSandbox {
  name = "tenant-e2b-router";
  status = "ready" as const;
  // In production, add LRU/TTL eviction here and dispose evicted sandboxes
  // (for example via stop/destroy) to avoid unbounded per-tenant growth.
  private readonly sandboxes = new Map<string, E2BSandbox>();

  getInfo() {
    return {
      provider: "tenant-e2b-router",
      status: this.status,
      sandboxCount: this.sandboxes.size,
    };
  }

  private getSandboxForTenant(tenantId: string): E2BSandbox {
    let sandbox = this.sandboxes.get(tenantId);
    if (!sandbox) {
      sandbox = new E2BSandbox({
        apiKey: process.env.E2B_API_KEY,
        // Example strategy: map tenant to a template/session naming scheme
        template: `tenant-${tenantId}`,
      });
      this.sandboxes.set(tenantId, sandbox);
    }
    return sandbox;
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const tenantId = String(options.operationContext?.context.get("tenantId") ?? "default");
    return this.getSandboxForTenant(tenantId).execute(options);
  }
}

const workspace = new Workspace({
  sandbox: new TenantE2BSandboxRouter(),
});
```

## Custom sandbox provider

You can implement `WorkspaceSandbox` and plug it into `Workspace` directly.

```ts
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";
import { Workspace } from "@voltagent/core";

class CustomSandbox implements WorkspaceSandbox {
  name = "custom";
  status = "ready" as const;

  getInfo() {
    return { provider: "custom-sandbox", status: this.status };
  }

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const start = Date.now();
    // TODO: run command in your custom environment
    // Respect options.timeoutMs, options.signal, and stream via onStdout/onStderr when possible.

    return {
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: Date.now() - start,
      timedOut: false,
      aborted: false,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
  }
}

const workspace = new Workspace({
  sandbox: new CustomSandbox(),
});
```

## Access runtime context in custom sandboxes

When `execute_command` runs through the workspace sandbox toolkit, VoltAgent forwards the current operation context to your sandbox as `options.operationContext`.

This lets you build custom routing, such as tenant-aware sandbox selection.

```ts
import type {
  WorkspaceSandbox,
  WorkspaceSandboxExecuteOptions,
  WorkspaceSandboxResult,
} from "@voltagent/core";

class TenantAwareSandbox implements WorkspaceSandbox {
  name = "tenant-aware";
  status = "ready" as const;

  async execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult> {
    const tenantId = String(options.operationContext?.context.get("tenantId") ?? "default");

    // Route by tenant (for example: separate container/session per tenant).
    // Implement your own provider lookup here.
    const start = Date.now();
    return {
      stdout: `running for tenant ${tenantId}`,
      stderr: "",
      exitCode: 0,
      durationMs: Date.now() - start,
      timedOut: false,
      aborted: false,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
  }
}
```

If you call `workspace.sandbox.execute(...)` directly (outside the toolkit), pass `operationContext` yourself if you need it.

For full per-provider tenant routing examples, see the [Remote sandbox providers](#remote-sandbox-providers) section above.

Notes:

- `onStdout`/`onStderr` are optional streaming hooks for UI integration.
- `timeoutMs` and `signal` should be enforced to avoid runaway processes.
