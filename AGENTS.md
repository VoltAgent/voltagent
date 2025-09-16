# VoltAgent

VoltAgent is an open-source TypeScript framework for building and orchestrating AI agents.

## What is VoltAgent?

VoltAgent is a comprehensive framework that enables developers to build sophisticated AI agents with memory, tools, observability, and sub-agent capabilities. It provides direct AI SDK integration with comprehensive OpenTelemetry tracing built-in.

## Overview

- View [`docs/structure.md`](./docs/structure.md) for the repository structure and organization
- View [`docs/tooling.md`](./docs/tooling.md) for development tools and utilities
- View [`docs/testing.md`](./docs/testing.md) for testing guidelines and commands
- View [`docs/linting.md`](./docs/linting.md) for code formatting and linting

## Validating Changes

To validate your changes you can run the following commands:

```bash
pnpm test:all        # Run all tests
pnpm build:all       # Build all packages
pnpm lint            # Run linting checks
pnpm lint:fix        # Auto-fix linting issues
```

## Important Notes for AI Agents

1. **Always check existing patterns** before implementing new features
2. **Use the established registry patterns** for agent and tool management
3. **Maintain type safety** - this is a TypeScript-first codebase
4. **Follow the monorepo structure** - changes may impact multiple packages
5. **Test your changes** - ensure all tests pass before committing

## Gotchas

- **JSON.stringify** SHOULD NEVER BE USED, used the `safeStringify` function instead, imported from `@voltagent/internal`
