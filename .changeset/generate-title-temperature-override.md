---
"@voltagent/core": patch
---

fix(core): allow disabling conversation title temperature

Conversation title generation now keeps the existing default `temperature: 0`, while allowing `generateTitle.temperature: null` to omit the parameter for reasoning models that do not support temperature. Unsupported temperature warnings are surfaced at warn level with guidance, and title generation failures are logged at warn level instead of debug.
