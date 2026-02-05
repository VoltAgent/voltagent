---
"@voltagent/ag-ui": patch
"@voltagent/core": patch
---

fix: keep streaming message ids consistent with memory by emitting `messageId` on start/start-step chunks and using it for UI stream mapping (leaving text-part ids intact).
