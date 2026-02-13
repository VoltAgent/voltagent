---
"@voltagent/sandbox-daytona": patch
"@voltagent/sandbox-e2b": patch
---

fix: align sandbox package core dependency strategy with plugin best practices

- Update `@voltagent/sandbox-daytona` to use `@voltagent/core` via `peerDependencies` + `devDependencies` instead of runtime `dependencies`.
- Raise `@voltagent/sandbox-daytona` peer minimum to `^2.3.8` to match runtime usage of `normalizeCommandAndArgs`.
- Align `@voltagent/sandbox-e2b` development dependency on `@voltagent/core` to `^2.3.8`.
