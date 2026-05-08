# Tooling

Development tools and utilities used in this repository.

## Quick Reference

- **package manager**: pnpm
- **monorepo**: Lerna and Nx
- **language**: TypeScript
- **formatter**: Biome for TS/JS, Prettier for markdown/MDX through lint-staged
- **linter**: Biome
- **build system**: tsup
- **release management**: Changesets

## Tools

## pnpm

Fast, disk space efficient package manager with built-in workspace support for managing dependencies across the monorepo.

### Links

- [Documentation](https://pnpm.io/pnpm-cli)

## lerna

Lerna is a tool for managing JavaScript projects with multiple packages.

### Links

- [Documentation](https://lerna.js.org/docs/introduction)

## nx

High-performance build system optimized for JavaScript and TypeScript monorepos with smart caching and parallel execution. Lerna delegates task orchestration to Nx.

### Links

- [Documentation](https://nx.dev/getting-started/intro)

## Biome

All-in-one toolchain for TypeScript and JavaScript linting and formatting.

### Links

- [Documentation](https://biomejs.dev/guides/getting-started/)

## TypeScript

Strongly typed programming language that builds on JavaScript, providing static type checking at compile time.

### Links

- [Documentation](https://www.typescriptlang.org/docs/)

## tsup

Builds and bundles TypeScript code into JavaScript.

### Links

- [Documentation](https://tsup.egoist.dev/)

## Changesets

Manages package versioning and changelog entries for public package changes.

See [Changesets](./changesets.md) for when a changeset is required.

### Links

- [Documentation](https://github.com/changesets/changesets)

## Related Docs

- [Repository structure](./structure.md)
- [Testing](./testing.md)
- [Linting and formatting](./linting.md)
- [Changesets](./changesets.md)
