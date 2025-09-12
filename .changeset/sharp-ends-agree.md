---
"@voltagent/langfuse-exporter": minor
---

feat: add createLangfuseSpanProcessor helper and robust attribute mappings for new OpenTelemetry observability

What changed for you

- New helper: `createLangfuseSpanProcessor` to plug Langfuse export directly into VoltAgent’s OpenTelemetry-based observability without touching core.
- Improved attribute mappings with careful fallbacks to align `@voltagent/core` span attributes and Langfuse fields (usage, model params, input/output, user/session, tags, names).
- Updated `examples/with-langfuse` to demonstrate the new integration.

Quick start

```ts
import { Agent, VoltAgent, VoltAgentObservability } from "@voltagent/core";
import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";

// Configure Observability: add Langfuse via SpanProcessor
const observability = new VoltAgentObservability({
  spanProcessors: [
    createLangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL, // e.g. https://cloud.langfuse.com or self-hosted
      debug: true, // optional
      // batch: { maxQueueSize, maxExportBatchSize, scheduledDelayMillis, exportTimeoutMillis }
    }),
  ],
});

const agent = new Agent({
  name: "Base Agent",
  // ...model, tools, memory
});

new VoltAgent({
  agents: { agent },
  observability,
});
```

Environment variables

- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_BASE_URL` (optional; defaults to Langfuse cloud if omitted)

Mapping details (highlights)

- Usage tokens: `gen_ai.usage.*` ← fallbacks to `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens` from core.
- Model params: prefers `gen_ai.request.*`, falls back to `ai.model.*` from core.
- Input/output (generation): prefers `ai.prompt.messages` / `ai.response.text`, falls back to generic `input` / `output` set by core.
- Input/output (tools): prefers `tool.arguments` / `tool.result`, falls back to `input` / `output`.
- User/session: `enduser.id` ← `user.id`, `session.id` ← `conversation.id`.
- Tags: reads `tags` or parses JSON from `prompt.tags` if present.
- Name: prefers `voltagent.agent.name` then `entity.name` then span name.

Example updated

- See `examples/with-langfuse` for a complete, working setup using `createLangfuseSpanProcessor`.
