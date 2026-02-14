---
"@voltagent/sandbox-daytona": patch
---

feat: expose the underlying Daytona SDK sandbox instance from `DaytonaSandbox`.

- Added a public `getSandbox()` method that returns the original `@daytonaio/sdk` `Sandbox` instance so provider-specific APIs can be used directly.
- Added `DaytonaSandboxInstance` type export for the underlying SDK sandbox type.
