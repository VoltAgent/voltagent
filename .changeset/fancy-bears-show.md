---
"@voltagent/core": patch
---

fix: prevent workflow failures from observability flush concurrency limits by serializing flushes and defaulting to serverless-only flush in auto mode
