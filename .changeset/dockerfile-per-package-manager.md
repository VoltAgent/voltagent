---
"create-voltagent-app": patch
---

Render the generated Dockerfile from the package manager selected in the wizard: each stage copies only the lockfile that exists for the project and runs that manager's install command (npm ci, yarn/pnpm via corepack, bun on the oven/bun image) instead of unconditionally copying `yarn.lock*` and `pnpm-lock.yaml*`, which failed the first `docker build` for npm and bun projects.
