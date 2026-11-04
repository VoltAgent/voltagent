---
"@voltagent/core": patch
---

fix(core): upgrade the Amazon Bedrock and Google Vertex providers to their AI SDK v6 releases

`@ai-sdk/amazon-bedrock` and `@ai-sdk/google-vertex` move from `3.x` to `^4.0.0`. These upgrades move both providers from `@ai-sdk/provider-utils@3` to `@ai-sdk/provider-utils@4`, aligning them with core's AI SDK v6 dependencies.

Downstream impact, only for `amazon-bedrock/*` and `google-vertex/*` models:

- For Gemini models, if `GOOGLE_VERTEX_API_KEY` is set, Vertex now uses express mode and ignores `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_LOCATION` and `GOOGLE_APPLICATION_CREDENTIALS`. Unset it if you rely on project credentials.
- Bedrock clamps a `temperature` below `0` to `0` and above `1` to `1`, returning a warning in either case.

Known issue: Ollama remains on `ollama-ai-provider-v2@1.x`. Its upgrade is deferred until the upstream streamed-error-handling bug is fixed. We plan to bump it in a follow-up PR.
