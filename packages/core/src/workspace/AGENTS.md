# Core Workspace

**Security-sensitive.** Owns workspace filesystem access, sandbox execution, search (BM25 + optional vector), skills, timeouts, and tool policy. Local and sandbox implementations expose the same `Workspace` shape.

## Critical Rules

- **Path normalization is non-negotiable.** All filesystem paths flow through `NodeFilesystemBackend.resolvePath()` (in `filesystem/backends/filesystem.ts`): backslashes → forward slashes, leading slashes stripped, `path.normalize()`, then containment check via `path.relative(this.cwd, abs)` (rejects `..` escapes and absolute path injection when `contained=true`, the default).
- **Tool policy is enforced before execution.** Filesystem, sandbox, search, and skills toolkits resolve per-tool `enabled` and `needsApproval` from `WorkspaceToolPolicy`. Removing or weakening these checks is a security regression.
- **Workspace operations honor `operationTimeoutMs` when configured.** Enforced by `withOperationTimeout()` in `timeout.ts` via `Promise.race` + `AbortSignal`. `Workspace` itself has no default — when undefined, enforcement is skipped. `LocalSandbox` separately defaults to 30000 ms.
- **Sandbox commands are tokenized, not shelled.** `normalizeCommandAndArgs()` in `sandbox/command-normalization.ts` parses quotes/escapes to extract command + args. No `shell: true` execution.
- **Search is deterministic and offline.** BM25 lexical (default `"bm25"`) or hybrid with vector embeddings. Auto-indexing runs at `Workspace.init()` via `ensureAutoIndex()`; failures log and are non-blocking. No network access in the search code path.
- **Skills are filesystem-bound.** Discovered from `rootPaths` (default `["/skills"]`) by glob (default `"**/SKILL.md"`). Agents access skills only through workspace tools.
- **`safeStringify` for telemetry attributes** — keep cardinality low; never log raw file content or absolute system paths.

## Workspace Interface

```ts
class Workspace {
  readonly id: string;
  readonly scope: "agent" | "conversation";
  readonly filesystem: WorkspaceFilesystem;
  readonly sandbox?: WorkspaceSandbox;
  readonly skills?: WorkspaceSkills;
  status: "idle" | "initializing" | "ready" | "destroyed" | "error";

  async init(): Promise<void>;
  async destroy(): Promise<void>;
  getInfo(): WorkspaceInfo;
  getPathContext(): WorkspacePathContext;
  getToolsConfig(): WorkspaceToolConfig | undefined;

  createFilesystemToolkit(options?): Toolkit;
  createSandboxToolkit(options?): Toolkit;
  createSearchToolkit(options?): Toolkit;
  createSkillsToolkit(options?): Toolkit;
  createSkillsPromptHook(options?): AgentHooks;
}
```

## Filesystem Safety

`NodeFilesystemBackend.resolvePath(key: string): string` — single source of truth for path safety. With `contained=true` (default), the resolved absolute path is validated against `this.cwd`; any `..` or absolute injection rejects with an error before the backend touches disk.

Backend interface methods (`backend.ts`): `read`, `write`, `edit`, `delete`, `stat`, `mkdir`, `grep`, `glob`. All implementations must preserve containment guarantees.

## Sandbox

```ts
interface WorkspaceSandbox {
  name: string;
  status?: "idle" | "ready" | "destroyed" | "error";
  start?(): Promise<void>;
  stop?(): Promise<void>;
  destroy?(): Promise<void>;
  getInfo?(): Record<string, unknown>;
  getInstructions?(): string | null;
  execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult>;
}
```

`LocalSandbox` (`sandbox/local.ts`) wraps `child_process.spawn` with timeout, output buffering (default ~5 MB), and OS-specific isolation (`sandbox-exec` on macOS, `bwrap` on Linux when available). External providers live in `packages/sandbox-daytona` and `packages/sandbox-e2b`.

## Search & Skills

- **Auto-index**: configured via `WorkspaceSearchConfig.autoIndexPaths`, e.g., `[{ path: "/src", glob: "**/*.ts" }]`. Runs at `Workspace.init()`; partial failures retry with `OperationContext` and log on final failure.
- **Modes**: `"bm25"` (lexical) or `"hybrid"` (BM25 + vector). Default is `"hybrid"` when both an embedding adapter and a vector adapter are configured, otherwise `"bm25"`. Stays deterministic and offline.
- **Skills**: each skill is a directory containing `SKILL.md` plus optional `references/`, `scripts/`, `assets/`. Activated/deactivated via the workspace tools `workspace_activate_skill` / `workspace_deactivate_skill`.

## Tool Policy

```ts
type WorkspaceToolPolicy = {
  enabled?: boolean;
  needsApproval?: boolean | ((args: unknown) => boolean);
};

type WorkspaceFilesystemToolPolicy = WorkspaceToolPolicy & {
  requireReadBeforeWrite?: boolean;
};
```

Policies pass into toolkit factories and are merged with workspace `toolConfig`. Resolved before each tool call:

```ts
const policy = this.resolveSearchToolPolicy(name);
if (policy?.enabled === false) throw new Error(`Tool '${name}' is disabled by policy`);
if (policy?.needsApproval) throw new Error(`Tool '${name}' requires approval`);
```

## Boundaries (security model)

**Allowed without asking**

- Adding tests.
- Refactoring within existing safety guarantees.
- Improving error messages.
- Narrowing scopes.
- Adding telemetry that uses `safeStringify`.

**Ask first**

- Adding a new sandbox provider (validate isolation).
- Changing skill-loading semantics.
- Changing default `operationTimeoutMs`.
- Adding new toolkit types.
- Changing search algorithm or default mode.

**Never without an explicit, security-reviewed request**

- Broadening file access roots (`contained=false`).
- Removing or weakening path normalization.
- Removing tool policy enforcement.
- Removing timeout enforcement.
- Adding network calls to search/auto-index.
- Adding `shell: true` to sandbox execution.

## Tests

```bash
pnpm --dir packages/core test:single -- src/workspace/index.spec.ts
pnpm --dir packages/core test:single -- src/workspace/timeout.spec.ts
pnpm --dir packages/core test:single -- src/workspace/filesystem/index.spec.ts
pnpm --dir packages/core test:single -- src/workspace/filesystem/node-filesystem-backend.spec.ts
pnpm --dir packages/core test:single -- src/workspace/sandbox/local.spec.ts
pnpm --dir packages/core test:single -- src/workspace/search/index.spec.ts
pnpm --dir packages/core typecheck
```

Coverage areas: path containment (`filesystem/`), command tokenization + isolation (`sandbox/`), BM25 ranking + auto-index retry (`search/`), skill discovery (`skills/`), policy merging + timeout enforcement (root + `timeout.spec.ts`).

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
- External sandbox providers: `packages/sandbox-daytona`, `packages/sandbox-e2b`
