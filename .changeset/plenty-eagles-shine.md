---
"@voltagent/core": patch
"@voltagent/vercel-ai": patch
---

feat: add cachedInputTokens and reasoningTokens to UsageInfo type

Enhanced the `UsageInfo` type to include additional token usage metrics:

- Added `cachedInputTokens?: number` to track tokens served from cache
- Added `reasoningTokens?: number` to track tokens used for model reasoning

These optional fields provide more granular usage information when supported by the underlying LLM provider. The Vercel AI provider now passes through these values when available from the AI SDK.
