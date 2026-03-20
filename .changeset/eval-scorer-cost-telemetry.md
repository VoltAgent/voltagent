---
"@voltagent/core": patch
---

fix: emit LLM judge token and provider cost telemetry on eval scorer spans

VoltAgent now records LLM judge model, token usage, cached tokens, reasoning tokens,
and provider-reported cost details on live eval scorer spans.

This makes scorer-side usage visible in observability backends and enables downstream
cost aggregation to distinguish agent costs from eval scorer costs.
