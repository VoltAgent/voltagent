# Core VoltOps Integration

This directory owns VoltOps clients, prompt APIs, prompt management, action clients, local prompt loading, and related types.

## Local Rules

- Preserve wire compatibility with VoltOps APIs. Be cautious with request/response shapes, endpoint paths, auth headers, and error handling.
- Use `safeStringify` for request bodies and structured logging/telemetry.
- Keep prompt template behavior deterministic and covered by tests.
- Avoid changing generated or API-shaped client methods without checking the matching tests and exported types.
- Be careful with global client behavior and precedence rules; existing priority tests document expected selection.

## Tests

Add or update focused tests for client requests, prompt manager behavior, template rendering, and priority rules:

```bash
pnpm --dir packages/core test:single -- src/voltops/path-to-test.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```
