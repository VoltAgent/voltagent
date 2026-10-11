---
"@voltagent/a2a-server": patch
---

Preserve canceled A2A task status when agent streams end normally or deliver a late chunk after cancellation. Avoid starting canceled streams and recheck cancellation after awaiting completion metadata.
