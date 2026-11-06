---
"@voltagent/core": patch
---

Clear a `BackgroundQueue` task's timeout timer when the attempt fails, not just when it succeeds. A failing memory operation left one pending timer per attempt, each keeping the Node event loop alive for the full timeout (30s by default in `MemoryManager`), so a short-lived process could not exit.
