---
"@voltagent/core": patch
---

fix: workspace built-in toolkit schemas are now compatible with both Zod v3 and v4 - #1043

This resolves runtime failures like `Cannot read properties of undefined (reading '_zod')` when using workspace tools such as `execute_command` with newer AI SDK + Zod combinations.

### What changed

- Updated workspace toolkit record schemas to explicit key/value form (`z.record(z.string(), valueSchema)`) for Zod v4-safe JSON schema conversion.
- Added regression coverage to validate workspace toolkit schema conversion against `zod/v4`.

### Impact

- Built-in workspace tools (notably sandbox and search toolkit paths) now initialize and execute reliably across supported Zod versions.
