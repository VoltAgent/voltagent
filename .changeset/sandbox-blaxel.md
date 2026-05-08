---
"@voltagent/sandbox-blaxel": minor
---

Add `@voltagent/sandbox-blaxel`, a new VoltAgent workspace sandbox provider built on `@blaxel/core`. Implements `execute()` with polling-based stdout/stderr streaming, timeout and `AbortSignal` enforcement via `sandbox.process.kill()`, output truncation, and `destroy()` via `sandbox.delete()`. Also exposes `getSandbox()` for direct access to the underlying Blaxel SDK.
