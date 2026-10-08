---
"@voltagent/core": patch
---

chore(core): bump `@aihubmix/ai-sdk-provider` to `^2.2.1`

The `^1.0.1` range was stuck on `1.0.x`. 2.x keeps the same `createAihubmix` API and AI SDK v6 (LanguageModelV3) target, and brings:

- Streaming fix for OpenAI-compatible models (switched to `@ai-sdk/openai-compatible`)
- Custom `fetch` is now forwarded to Claude / Gemini / Responses models
- No redundant `Authorization` header for Claude / Gemini models (uses `x-api-key` / `x-goog-api-key` only)
