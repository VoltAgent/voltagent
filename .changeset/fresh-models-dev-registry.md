---
"@voltagent/core": patch
---

Regenerate the model provider registry from models.dev, adding 156 providers and their model IDs. The six providers models.dev no longer lists (firmware, github-models, iflowcn, kimi-for-coding, llama, v0) stay registered so existing model IDs keep resolving. Six providers that models.dev moved to packages core has no adapter for (cloudflare-ai-gateway, gitlab, google-vertex-anthropic, openrouter, sap-ai-core, venice) keep their previous configuration. So does cloudflare-workers-ai, which models.dev moved to `@ai-sdk/openai-compatible` with a `${CLOUDFLARE_ACCOUNT_ID}` placeholder in its URL that core does not expand. Fixes #1476.
