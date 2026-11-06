---
"create-voltagent-app": patch
---

fix: replace retired default models for the Anthropic and Google providers - new projects now use `anthropic/claude-sonnet-5-5` and `google/gemini-3.6-flash` instead of `anthropic/claude-3-5-sonnet` and `google/gemini-2.0-flash`, which the providers have shut down
