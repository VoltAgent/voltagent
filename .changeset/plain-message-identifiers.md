---
"@voltagent/core": patch
---

Use dictionaries without inherited keys for in-memory message storage so user and conversation identifiers such as constructor, toString and __proto__ do not break message operations or user isolation, including after clearing storage.
