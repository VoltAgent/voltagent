---
"@voltagent/core": patch
---

fix(core): escape template variable names in `createSimpleTemplateEngine` so keys containing regex metacharacters (`items[0]`, `user.name`, `a|b`, `total)`) substitute literally instead of being skipped, matching unrelated placeholders, or throwing
