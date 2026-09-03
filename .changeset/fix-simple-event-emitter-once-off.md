---
"@voltagent/core": patch
---

Fix `SimpleEventEmitter.off()` not removing a listener registered via `once()`. `once()` registers an internal wrapper, so `off(event, listener)` deleted the original function (never in the set) and left the wrapper registered — a removed one-time listener still fired on the next `emit`. `off()` now resolves the original listener back to its wrapper (mirroring Node's `EventEmitter`).
