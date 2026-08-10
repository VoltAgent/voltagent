---
"@voltagent/evals": patch
---

Fixed experiment `summary.passRate` counting items whose scorers were all sampled out as passes. Those items have no evaluation evidence, but `evaluateItemStatus()` returns `passed` for them, so lowering scorer sampling pushed the pass rate toward 1 and a `{ type: "passRate" }` criterion could pass on results that were never scored. Sampled-out items are now excluded from the pass rate, matching how skipped scorer results are already excluded from a scorer's own pass rate; a run with nothing evaluated reports `passRate: null`. `successCount`, `failureCount`, `errorCount`, and `skippedCount` are unchanged.
