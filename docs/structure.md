# Repository Structure

This monorepo is organized using pnpm workspaces and Lerna with the following main directories:

## Overview

```
voltagent/
├── packages/       # Core packages and integrations
├── examples/       # Example implementations
├── website/        # Documentation website and marketplace
├── docs/           # Project documentation
├── scripts/        # Build and utility scripts
├── .changeset/     # Changeset configuration
└── package.json    # Root package configuration
```

## Details

### `packages/`

Core packages, AI provider integrations, and utilities:

- **cli** - VoltAgent CLI for project scaffolding and management
- **core** - Main VoltAgent framework with agent orchestration, memory management, tools, and observability. Includes the `ConversationBuffer` (merges model/tool messages into UI messages for persistence) and `MemoryPersistQueue` (debounced memory write pipeline).
- **create-voltagent-app** - Project initialization tool
- **docs-mcp** - Model Context Protocol documentation server
- **internal** - Internal utilities and shared types used across packages
- **langfuse-exporter** - LangFuse telemetry exporter
- **libsql** - LibSQL database integration
- **logger** - Universal logger implementation
- **postgres** - PostgreSQL database integration
- **sdk** - JavaScript/TypeScript SDK for VoltAgent API
- **server-core** - Core server handlers, schemas, and business logic
- **server-hono** - Hono-based server implementation with API routes
- **supabase** - Supabase client integration
- **vercel-ai-exporter** - Vercel AI telemetry exporter
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

### `docs/`

Project-level documentation:

- **structure.md** - This file, describing repository organization
- **tooling.md** - Development tools and workflows
- Additional architecture and design documents

### `scripts/`

Reusable scripts for the project, for repeatable development tasks.
