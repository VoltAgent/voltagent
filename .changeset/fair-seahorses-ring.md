---
"@voltagent/core": patch
---

fix: capture provider-reported OpenRouter costs in observability spans

### What's Changed

- Forward OpenRouter provider-reported cost metadata to both LLM spans and root agent spans.
- Record `usage.cost` and `usage.cost_details.upstream_inference_*` attributes for downstream cost consumers.
- Document OpenRouter usage accounting and custom `onEnd` hook-based cost reporting in the observability docs.
