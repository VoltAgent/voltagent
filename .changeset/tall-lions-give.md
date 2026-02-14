---
"@voltagent/sandbox-e2b": patch
---

feat: expose the underlying E2B SDK sandbox instance from `E2BSandbox`.

- Added a public `getSandbox()` method that returns the original `e2b` `Sandbox` instance so provider-specific APIs (for example `files.read`) can be used directly.
- Added `E2BSandboxInstance` type export for the underlying SDK sandbox type.
