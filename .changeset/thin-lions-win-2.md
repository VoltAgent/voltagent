---
"@voltagent/core": patch
"@voltagent/server-core": patch
---

feat: add Zod v4 support (backwards-compatible with v3)

What’s new

- Core + server now support `zod` v4 while keeping v3 working.
- Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
- JSON Schema → Zod conversion handles both versions:
  - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
  - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
- Implemented in MCP client (core) and object handlers (server-core).

Why

- Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

Impact

- No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

Notes

- If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).
