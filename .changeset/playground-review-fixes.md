---
"@voltagent/core": patch
"@voltagent/server-core": patch
"@voltagent/playground": patch
---

Fix AI SDK 7 conversation summarization and permanently cancel suspended workflow checkpoints through the API. Record rejected tool inputs separately from execution and record skipped branch conditions. Include field paths in context validation errors.

Improve playground navigation with separate overview/readable views, historical-run controls, persisted cancellation status, accessible pending actions, restored failure diagnostics and explicit empty JSON strings. Add a real OpenAI playground example with live integration checks.
