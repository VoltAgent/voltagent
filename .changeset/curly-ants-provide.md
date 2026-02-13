---
"@voltagent/core": patch
---

Fix workspace skill prompt injection and guidance for skill access tools.

- Change activated skill prompt injection to include metadata only (`name`, `id`, `description`) instead of embedding full `SKILL.md` instruction bodies.
- Clarify workspace skills system prompt so agents use workspace skill tools for skill access and avoid sandbox commands like `execute_command`, `ls /skills`, or `cat /skills/...`.
