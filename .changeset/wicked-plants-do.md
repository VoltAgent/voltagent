---
"create-voltagent-app": patch
"@voltagent/vercel-ai-exporter": patch
"@voltagent/langfuse-exporter": patch
"@voltagent/voltagent-memory": patch
"ai-ad-generator": patch
"example-with-live-evals": patch
"@voltagent/serverless-hono": patch
"with-jwt-auth": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/a2a-server": patch
"@voltagent/mcp-server": patch
"@voltagent/docs-mcp": patch
"@voltagent/internal": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/scorers": patch
"@voltagent/libsql": patch
"@voltagent/logger": patch
"@voltagent/evals": patch
"@voltagent/core": patch
"@voltagent/cli": patch
"@voltagent/sdk": patch
---

- Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
- Upgraded dependency: `ai` → `^5.0.76`
