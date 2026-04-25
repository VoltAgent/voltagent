---
"@voltagent/core": patch
---

Register agents synchronously during VoltAgent construction so getAgent and getAgents can return agents with global defaults before ready resolves.
