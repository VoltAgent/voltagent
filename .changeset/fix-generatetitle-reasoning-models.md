---
"@voltagent/core": patch
---

fix(core): support reasoning models in generateTitle by making temperature configurable

Reasoning models (gpt-5-mini, o1, o3) reject the `temperature` parameter. Previously, `generateTitle` hardcoded `temperature: 0`, causing silent failures that fell back to the default "Conversation" title.

Temperature is now omitted by default (letting the AI SDK / provider decide), and can be explicitly set via `generateTitle.temperature` in `ConversationTitleConfig`. The error log level is also upgraded from `debug` to `warn` for better visibility.
