---
"@voltagent/voltagent-memory": major
"@voltagent/server-core": major
"@voltagent/postgres": major
"@voltagent/supabase": major
"@voltagent/scorers": major
"@voltagent/libsql": major
"@voltagent/core": major
"@voltagent/a2a-server": major
"@voltagent/ag-ui": major
"@voltagent/docs-mcp": major
"@voltagent/evals": major
"@voltagent/internal": major
"@voltagent/langfuse-exporter": major
"@voltagent/logger": major
"@voltagent/mcp-server": major
"@voltagent/rag": major
"@voltagent/sdk": major
"@voltagent/server-hono": major
"@voltagent/serverless-hono": major
"@voltagent/voice": major
---

feat: VoltAgent 2.x (AI SDK v6)

VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

Migration summary (1.x -> 2.x):

1. Update VoltAgent packages

- `npm run volt update`
- If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`

2. Align AI SDK packages

- `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
- If you use UI hooks, upgrade `@ai-sdk/react` to `^3`

3. Structured output

- `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
- Use `generateText` / `streamText` with `Output.object(...)`

Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/
