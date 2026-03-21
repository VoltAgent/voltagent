---
"@voltagent/core": patch
---

fix: tighten prompt-context usage telemetry

- redact nested large binary fields when estimating prompt context usage
- preserve circular-reference detection when serializing nested prompt message content
- exclude runtime-only tool metadata from tool schema token estimates
- avoid emitting cached and reasoning token span attributes when their values are zero
