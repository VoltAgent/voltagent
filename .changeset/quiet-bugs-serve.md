---
"@voltagent/vercel-ui": patch
---

fix: remove devLogger dependency and use native console methods

Removed the dependency on `@voltagent/internal/dev` logger and replaced devLogger calls with standard console methods (console.error, console.warn) for a cleaner dependency tree and better compatibility.
