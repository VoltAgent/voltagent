# VoltAgent

VoltAgent is an open-source TypeScript monorepo for building and orchestrating AI agents.

## Repository Layout

- `packages/*` contains published packages.
- `packages/core` contains the core runtime for agents, workflows, memory, tools, observability, workspaces, and VoltOps integration.
- `examples/*` contains runnable example apps. Keep examples simple and copy-pasteable.
- `website` contains the Docusaurus documentation site.
- `tools` contains repository tooling.
- `archive` contains deprecated packages and historical code. Do not use archived code as the first pattern source.

## Baseline Tooling

- Use Node `>=20` and `pnpm@8.10.5`.
- This is a TypeScript-first codebase. Preserve type safety and public API types.
- Biome formats and lints TS/JS. Prettier formats markdown and MDX through lint-staged.
- Prefer existing package scripts over ad hoc commands.

## Contributor Docs

- Contributor index: [`contributing/README.md`](./contributing/README.md)
- Repository structure: [`contributing/structure.md`](./contributing/structure.md)
- Development tooling: [`contributing/tooling.md`](./contributing/tooling.md)
- Testing: [`contributing/testing.md`](./contributing/testing.md)
- Linting and formatting: [`contributing/linting.md`](./contributing/linting.md)
- Changesets: [`contributing/changesets.md`](./contributing/changesets.md)

## Validation

Prefer scoped validation for the package you touched, then broaden only when the change crosses package boundaries.

Useful root commands:

```bash
pnpm lint
pnpm test:all
pnpm build:all
```

Useful package-scoped commands:

```bash
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
pnpm --dir packages/core build
pnpm --dir website build
```

If you cannot run a relevant validation command, say why in the final response.

## Implementation Rules

- Check nearby patterns before adding new abstractions.
- Keep edits scoped to the package and behavior requested.
- Update tests with behavior changes. Add regression tests for bugs.
- For public API, runtime behavior, package contents, dependency, or migration changes in published packages, add a changeset. See [`contributing/changesets.md`](./contributing/changesets.md).
- Do not hand-edit generated files unless the file clearly documents manual edits.

## Serialization

Use `safeStringify` from `@voltagent/internal` or `@voltagent/internal/utils` for production serialization, including request bodies, logs, persistence, telemetry attributes, and streamed payloads.

`JSON.stringify` is acceptable in tests, mocks, fixtures, or when intentionally matching a platform API.

## Core Registry Files

Do not hand-edit generated model registry files under `packages/core/src/registries`. Update the source/generator and run:

```bash
pnpm --dir packages/core generate:model-registry
```
