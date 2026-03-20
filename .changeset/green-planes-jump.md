---
"@voltagent/core": patch
---

feat: add estimated prompt context telemetry for observability

- record estimated prompt-context breakdown for system instructions, conversation messages, and tool schemas on LLM spans
- expose cached and reasoning token usage on LLM spans for observability consumers
- add tests for prompt-context estimation helpers
