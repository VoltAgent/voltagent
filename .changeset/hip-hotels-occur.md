---
"@voltagent/evals": patch
---

fix: allow experiment scorer configs to declare their own `id`, so `passCriteria` entries that target `scorerId` work reliably and scorer summaries use the caller-provided identifiers.
