---
"create-voltagent-app": patch
---

feat(create-voltagent-app): add package manager selection with Bun support (#1129)

The CLI now detects available package managers (`pnpm`, `bun`, `yarn`, `npm`) and lets users
choose which one to use during project setup.

The selected package manager is used for dependency installation and post-create run instructions.
If no package manager is detected, the CLI now falls back to `npm` with a clear warning.
