---
"@voltagent/core": patch
---

Remove console based logging in favor of a dev-only logger that will not output logs in production environments by leveraging the NODE_ENV
