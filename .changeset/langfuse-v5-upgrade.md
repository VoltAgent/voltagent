---
"@voltagent/langfuse-exporter": major
---

Upgrade to Langfuse JS SDK v5 via @langfuse/otel

Replaced the custom v3 OTel-based exporter with a thin wrapper around `LangfuseSpanProcessor` from `@langfuse/otel`.

**Breaking changes**

- The `LangfuseExporter` class and the `createLangfuseSpanProcessor` wrapper around it are gone. `VoltAgentLangfuseProcessor` (a `SpanProcessor` wrapping `@langfuse/otel`) is now the entry point.
- The `@opentelemetry/*` and `langfuse@^3` dependencies are replaced by `@langfuse/otel@^5`.

**Migration**

```diff
- import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";
+ import { VoltAgentLangfuseProcessor } from "@voltagent/langfuse-exporter";

  const observability = new VoltAgentObservability({
    spanProcessors: [
-     createLangfuseSpanProcessor({ publicKey, secretKey, baseUrl }),
+     new VoltAgentLangfuseProcessor({ publicKey, secretKey, baseUrl }),
    ],
  });
```

`createLangfuseSpanProcessor` is still exported as a deprecated factory that forwards to the new class, so existing code keeps working.

Also added `ai.*`/`usage.*` → `gen_ai.*` attribute normalization, `prompt.tags` → `langfuse.trace.tags` mapping, and a default `shouldExportSpan` that covers VoltAgent's `@voltagent/core` instrumentation scope.
