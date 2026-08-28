---
"@voltagent/core": patch
---

Add Eden AI as a built-in model provider. Eden AI is an EU-based, OpenAI-compatible LLM gateway, so it is registered through the shared `@ai-sdk/openai-compatible` adapter and reached with `edenai/<vendor>/<model>` model ids (e.g. `edenai/openai/gpt-4o-mini`). Reads `EDENAI_API_KEY` and defaults to `https://api.edenai.run/v3`, with `EDENAI_BASE_URL` supported for the EU endpoint.
