---
"@voltagent/internal": patch
---

chore: remove console.warn from deepClone function

Removed the console.warn statement from the deepClone function's error handling. Since we require Node.js 17+ where structuredClone is always available, this warning is unnecessary and can clutter logs in development environments.

## What Changed

- Removed `console.warn("Failed to deep clone object, using shallow clone", { error });` from the catch block
- Kept the fallback logic intact for edge cases
- Maintained the development-only condition check even though the warning is removed

This change reduces unnecessary console output while maintaining the same fallback behavior for shallow cloning when structuredClone fails.
