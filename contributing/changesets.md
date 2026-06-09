# Changesets

VoltAgent uses Changesets to version public packages and generate changelog entries.

## Quick Reference

- Run `pnpm changeset` from the repository root.
- Add a changeset for published package API, runtime behavior, package contents, dependency, or migration changes.
- Choose the smallest accurate version type: `patch`, `minor`, or `major`.

## Guidelines

Add a changeset when a change affects a published package's public API, runtime behavior, package contents, dependencies, or migration path.

A changeset is usually not needed for tests, internal refactors with no behavior change, examples-only changes, contributor docs, or local tooling that does not affect a published package.

## Version Type

- **patch**: bug fixes, small behavior corrections, dependency updates, or internal changes that affect package output
- **minor**: backwards-compatible features, new exports, new options, or expanded behavior
- **major**: breaking API changes, removed exports/options, changed defaults, or required migrations

## Creating One

Run the Changesets CLI from the repository root:

```bash
pnpm changeset
```

Select every affected published package and choose the smallest accurate version type. Write the summary for users, not maintainers; explain what changed and any migration needed.

## Config

- Main branch releases use [`.changeset/config.json`](../.changeset/config.json).
- Prerelease branch releases use [`.changeset/config-next.json`](../.changeset/config-next.json).

## Related Docs

- [Development tooling](./tooling.md)
- [Root coding-agent instructions](../AGENTS.md)
