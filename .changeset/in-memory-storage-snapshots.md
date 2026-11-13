---
"@voltagent/core": patch
---

Clone in-memory message writes, conversation-step payloads, and conversation/workflow updates so caller mutations do not change saved cloneable data. Detach nested conversation-step results on read.
