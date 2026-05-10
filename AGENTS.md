# VoltAgent

Open-source TypeScript monorepo for building and orchestrating AI agents with pluggable memory, tools, workflows, and observability.

## Critical Rules

- **Verify before asserting.** Read or grep before claiming a hook signature, span attribute key, workflow step option, registry path, or public export exists in this codebase. Memory and prior context drift; the code is authoritative.
- **`safeStringify` for production serialization.** Import from `@voltagent/internal` for logs, telemetry attributes, persistence, request/response bodies, and streamed payloads. `JSON.stringify` is acceptable only in tests, mocks, fixtures, or when matching a platform API.
- **Add a changeset for any published-package change** that affects API, runtime behavior, package contents, dependencies, or migration. See [`contributing/changesets.md`](./contributing/changesets.md).
- **Generated files are not hand-edited.** Regenerate `packages/core/src/registries/*.generated.ts` via `pnpm --dir packages/core generate:model-registry`. Do not pattern-source from `archive/` — it contains deprecated code.
- **Validate scoped first, broaden only when crossing package boundaries.** Run `pnpm --dir packages/<pkg> test` before `pnpm test:all`.
- **Conventional commits, enforced by husky.** Format: `type(scope): subject` (e.g., `fix(core): …`, `feat(server-hono): …`, `chore: …`). The `commit-msg` hook runs commitlint with `@commitlint/config-conventional`. Scope = affected package; omit for repo-wide chores.

## Setup

Requires Node `>=20` and `pnpm@8.10.5` (pinned via `packageManager`).

```bash
pnpm install            # Install workspace deps
pnpm build:all          # Build every package (run before dev for cross-package types)
pnpm dev                # Watch all packages (excludes example apps)
```

## Validation

```bash
# Root (use only when changes cross package boundaries)
pnpm lint
pnpm test:all
pnpm build:all

# Scoped (preferred — fast, focused)
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
pnpm --dir packages/core build
pnpm --dir packages/core test:single -- src/path/to/file.spec.ts
pnpm --dir website build
```

## Boundaries

**Allowed without asking**

- Read files; run lint, typecheck, test, build commands.
- Edit code within a single package; add or update tests; add a changeset.
- Fix typos in `README.md` files and inline comments without changing structure or examples.
- Add new examples under `examples/with-<integration>/` (copy an existing example as the template).

**Ask first**

- New dependencies (root or any package) or version bumps of `node`, `pnpm`, `tsup`, `vitest`, `biome`, `typescript`.
- Cross-package public API changes; new public packages; new server runtime adapters.
- Adding nested `AGENTS.md` files (then run `./scripts/sync-agent-instructions.mjs` to refresh symlinks).
- Editing `packages/core/src/registries/*.generated.ts`, `archive/`, deprecated packages, `.changeset/config*.json`, CI workflows, husky hooks, `tools/`, root `tsconfig*.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, root `package.json`.
- Editing `.github/` (issue templates, PR template, workflows, `FUNDING.yml`).
- Removing tests; deleting docs without setting up redirects; bumping example app dependencies.
- Bypassing hooks (`--no-verify`) or skipping commitlint scope conventions.
- Restructuring `packages/`, `examples/`, or top-level `website/` doc trees.

**Never without explicit ask**

- `git push --force` to any shared branch; force-pushing to `main`; amending pushed commits.
- `pnpm publish` / `lerna publish`; deleting packages or public exports.
- Modifying or deleting `.changeset/*.md` files that have already been merged or versioned.
- Committing build outputs (`dist/`, `build/`, `.next/`, `.docusaurus/`) or per-developer IDE config (`.claude.local.md`, `.mcp.json`, `.cursor/`, `.codex/`, `.windsurf/` — see [`contributing/coding-agents.md`](./contributing/coding-agents.md)).
- Committing secrets, local credentials, or `.env*` files.

## Commit Conventions

- **Husky `pre-commit`** runs `lint-staged`: Biome on TS/JS, Prettier on Markdown/MDX.
- **Husky `commit-msg`** runs commitlint with `@commitlint/config-conventional`.
- **Format**: `type(scope): subject`. Scope = the affected package; omit for repo-wide chores. Scopes seen in history: `core`, `server-core`, `server-hono`, `server-elysia`, `serverless-hono`, `internal`, `cli`, `changesets` (CI).

## PR Conventions

- **Fill out the PR template at [`.github/pull_request_template.md`](./.github/pull_request_template.md).** It has the project's canonical checklist (commit-convention link, related issue, tests, docs, changeset link). Do not delete sections.
- **Title** mirrors the conventional-commit scope/type used in your first commit (`fix(core): …`, `feat(server-hono): …`). Not enforced by a bot, but reviewers expect it.
- **Changeset rule** (extends the template's "Changesets have been added" checkbox):
  - Published-package change (API, runtime behavior, package contents, deps, migration) → run `pnpm changeset`, commit the generated `.changeset/*.md`. Patch / minor / major rules in [`contributing/changesets.md`](./contributing/changesets.md).
  - Internal-only change (CI, repo tooling, contributing docs, examples-only fixes) → no changeset needed; check the "Changesets have been added" box only when one was actually added.
- **Releases** are automated by Lerna + Changesets via the `ci(changesets): version packages` PR.

## Code Style

- **Cross-package imports use `@voltagent/<pkg>` in production code**, not relative paths into another package. Test fixtures may reach across packages relatively when stubbing internal types.
- **Avoid new `as any` and `as unknown as T` casts.** Existing core source has them; treat as legacy. New code should narrow with type guards, fix the upstream type, or accept a `// biome-ignore` with a one-line justification.
- **Public APIs preserve inference.** Return types should flow from implementations — over-typing breaks downstream consumers.
- **Use existing managers, registries, and context keys** (`AgentRegistry`, `WorkspaceManager`, `OperationContext`, etc.) before introducing new global state.
- **`console.log` is a Biome error under `packages/core/**`** — use the package logger or `@voltagent/logger` instead.
- Biome handles TS/JS formatting + lint (`pnpm lint:fix`); Prettier handles Markdown/MDX via lint-staged.

```ts
// Good — production serialization
import { safeStringify } from "@voltagent/internal";
span.setAttribute("agent.context", safeStringify(contextMap));

// Acceptable — test fixtures only
const fixture = JSON.stringify({ input: "test" });
```

See [`contributing/linting.md`](./contributing/linting.md).

## Project Structure

```
packages/        # Published packages: core runtime, memory adapters, server runtimes,
                 # telemetry exporters, sandboxes, MCP/A2A servers, SDK, CLI, voice.
examples/        # Runnable apps; naming `with-<integration>`. Copy-pasteable.
website/         # Docusaurus docs site (uses npm — NOT in the pnpm workspace).
contributing/    # Contributor + coding-agent docs.
scripts/, tools/ # Repo tooling.
archive/         # Deprecated code; do not pattern-source from it.
.changeset/      # Pending version bumps. Generated by `pnpm changeset`.
.github/         # PR template, issue templates, workflows.
```

Full layout: [`contributing/structure.md`](./contributing/structure.md).

## Documentation Index

Prefer retrieval-led reasoning — open the linked file before answering. The index points at where things live; the files contain the actual contracts and examples.

```
<docs-index>
root: ./
contributing/:{README.md=contributor-docs index,structure.md=full package list (~25) + naming conventions,tooling.md=pnpm/Lerna/Nx/Biome/tsup/Changesets toolchain,testing.md=Vitest patterns + AI SDK mocking via MockLanguageModelV3,linting.md=Biome commands + VS Code setup,changesets.md=patch/minor/major rules + when changeset is/isn't needed,coding-agents.md=supported agent matrix + CLAUDE.md→AGENTS.md symlink convention}
packages/core/src/:{agent/AGENTS.md=agent runtime, hooks, streaming,workflow/AGENTS.md=workflow steps, suspend/resume, time travel,memory/AGENTS.md=memory contracts, semantic search, working memory,workspace/AGENTS.md=fs, sandbox, search, skills, policy,voltops/AGENTS.md=voltops clients, prompt management, actions,tool/AGENTS.md=tool definition, schema validation, routing,observability/AGENTS.md=otel span names + attribute conventions,mcp/AGENTS.md=MCP bridge (client/server),a2a/AGENTS.md=A2A server registry/protocol}
packages/:{server-core/AGENTS.md=server handlers, schemas, OpenAPI, WebSocket}
website/:{AGENTS.md=docs site setup + Docusaurus gotchas,docs/=user-facing framework docs,docs/getting-started/=quickstart,docs/agents/=agent guides,docs/workflows/=workflow guides,docs/integrations/=provider integrations,observability/=otel + VoltOps docs,recipes/=cookbook,blog/=release notes + posts,static/llms.txt=hand-curated 38KB LLM docs index}
.github/:{pull_request_template.md=canonical PR checklist,workflows/=CI definitions,ISSUE_TEMPLATE/=issue templates}
</docs-index>
```

Memory adapter packages (under `packages/`): `postgres`, `libsql`, `supabase`, `cloudflare-d1`, `voltagent-memory`. Sandboxes: `sandbox-daytona`, `sandbox-e2b`. Exporters: `langfuse-exporter`, `vercel-ai-exporter`. Server runtimes: `server-hono`, `server-elysia`, `serverless-hono`. MCP/A2A: `mcp-server`, `docs-mcp`, `a2a-server`. Read [`contributing/structure.md`](./contributing/structure.md) for the full inventory and naming conventions.
