---
"@voltagent/core": patch
---

Return workflow race results as soon as the first step settles, even when a losing step remains pending. Close all race child spans, remove them from the serverless active span bridge, and handle late losing rejections without waiting for them. Preserve suspended and cancelled statuses when a control-flow signal wins the race.
