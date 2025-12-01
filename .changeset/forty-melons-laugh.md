---
"@voltagent/core": patch
---

fix: remove redundant "You are ${this.name}" prefix from system prompt construction - #813

The system prompt construction in `Agent` class was redundantly prepending "You are ${this.name}" even when the user provided their own system prompt. This change removes the prefix, allowing the user's instructions to be used exactly as provided.
