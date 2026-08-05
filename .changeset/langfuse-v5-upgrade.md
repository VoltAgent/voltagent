---
"@voltagent/langfuse-exporter": minor
---

Upgrade to Langfuse JS SDK v5 via @langfuse/otel

Replaced the custom v3 OTel-based exporter with a thin wrapper around `LangfuseSpanProcessor` from `@langfuse/otel`. Added `ai.*`/`usage.*` to `gen_ai.*` attribute normalization and scoped `shouldExportSpan` filtering.
