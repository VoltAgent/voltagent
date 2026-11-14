---
"@voltagent/core": patch
---

fix(core): flush approved `needsApproval` tool results to memory as soon as execution completes and preserve executed tool parts when a client resends an older message, so an interrupted turn no longer causes a resent approval to re-execute the tool without a new approval prompt
