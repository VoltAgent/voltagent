---
"@voltagent/core": patch
---

fix(core): add package name validation to updateAllPackages to prevent command injection

`updateAllPackages` concatenated package names from `package.json` directly into shell commands
passed to `execSync()` without validation. The sibling function `updateSinglePackage` already
validated names against a regex. Extracted the validation regex into a shared `VALID_PKG_NAME_RE`
constant and added a `.filter()` step in `updateAllPackages` to skip packages with invalid names,
with a warning log for skipped entries.

Fixes #1205
