---
"@voltagent/core": patch
---

fix(core): Revert original fix by @omeraplak to pass the task role as "user" instead of prompt to prevent errors in providers such as Anthropic, Grok, etc.
