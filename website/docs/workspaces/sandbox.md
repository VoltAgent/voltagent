---
title: Workspace Sandbox
slug: /workspaces/sandbox
---

# Workspace Sandbox

> **Note: Workspace Sandbox is Experimental**
> The Workspace API is experimental. Expect iteration and possible breaking changes as we refine the API.

The sandbox toolkit adds `execute_command` with timeout/env/cwd control and automatic stdout/stderr eviction when output is large.

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

Install the provider package you need (for example `@voltagent/sandbox-e2b` or `@voltagent/sandbox-daytona`), then configure it on the workspace:

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

### Tenant-aware E2B router example

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

### Tenant-aware Daytona router example

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

Notes:

- `onStdout`/`onStderr` are optional streaming hooks for UI integration.
- `timeoutMs` and `signal` should be enforced to avoid runaway processes.
