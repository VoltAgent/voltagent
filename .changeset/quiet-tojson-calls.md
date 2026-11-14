---
"@voltagent/internal": patch
---

Avoid invoking `toJSON` a second time when safely serializing objects. Let `JSON.stringify` perform the conversion before checking for circular references.
