# Repository Structure

This monorepo is organized using pnpm workspaces, Lerna, and Nx with the following main directories:

## Quick Reference

```
voltagent/
├── packages/       # Core packages and integrations
├── examples/       # Example implementations
├── website/        # Documentation website and marketplace
├── contributing/   # Contributor and project documentation
├── scripts/        # Build and utility scripts
├── tools/          # Repository tooling packages
├── archive/        # Deprecated packages and historical code
├── .changeset/     # Changeset configuration
└── package.json    # Root package configuration
```

## Directory Details

### `packages/`

Core packages, AI provider integrations, and utilities:

- **a2a-server** - Agent-to-Agent protocol server implementation
- **ag-ui** - AG-UI adapter for agents and CopilotKit runtimes
- **cli** - VoltAgent CLI for project scaffolding and management
- **cloudflare-d1**, **libsql**, **postgres**, **supabase**, **voltagent-memory** - Memory and storage adapters
- **core** - Main VoltAgent framework with agent orchestration, memory management, tools, workflows, observability, workspaces, and VoltOps integration
- **create-voltagent-app** - Project initialization tool
- **docs-mcp** - Model Context Protocol documentation server
- **evals**, **scorers** - Evaluation and scoring utilities
- **internal** - Internal utilities and shared types used across packages
- **langfuse-exporter**, **vercel-ai-exporter** - Telemetry exporters
- **logger** - Universal logger implementation
- **mcp-server** - Model Context Protocol server implementation
- **rag**, **resumable-streams** - Retrieval and streaming utilities
- **sandbox-daytona**, **sandbox-e2b** - Sandbox provider integrations
- **sdk** - JavaScript/TypeScript SDK for VoltAgent API
- **server-core** - Core server handlers, schemas, and business logic
- **server-elysia**, **server-hono**, **serverless-hono** - Server runtime integrations
- **voice** - Voice interaction capabilities

#### Conventions

Packages are named using the following conventions:

- `@voltagent/*` - Core framework packages
- `@voltagent/*-exporter` - Telemetry exporters
- `voltagent-example-*` - Example applications

Certain packages are `deprecated` and include a `DEPRECATED.md` file with migration instructions in the root of the package (i.e. `google-ai`).

### `examples/`

Example implementations demonstrating VoltAgent usage:

- Basic agent examples
- Integration patterns
- Advanced use cases
- Best practices demonstrations

#### Conventions

Examples are named using the following conventions:

- `with-*` - Example application using the specific integration (i.e. `with-chroma` or `with-google-ai`)

### `website/`

Documentation website built with Docusaurus:

- **docs/** - Technical documentation
- **blog/** - Blog posts and tutorials
- **static/** - Static assets and images

### `contributing/`

Contributor and project-level documentation:

- **README.md** - Contributor documentation index and repository links
- **structure.md** - This file, describing repository organization
- **tooling.md** - Development tools and workflows
- **testing.md** - Testing guidelines and commands
- **linting.md** - Formatting and linting guidelines
- **changesets.md** - Package versioning and changelog guidelines
- **coding-agents.md** - Supported coding-agent instruction files

### `scripts/`

Reusable scripts for the project, for repeatable development tasks.

### `tools/`

Repository tooling packages and generators used by the monorepo.

### `archive/`

Deprecated packages and historical code. Prefer current package patterns before using archived code as a reference.

## Related Docs

- [Development tooling](./tooling.md)
- [Testing](./testing.md)
- [Coding-agent compatibility](./coding-agents.md)
