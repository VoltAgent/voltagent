---
"@voltagent/cli": patch
"@voltagent/server-core": patch
---

feat: add tunnel command

## New: `volt tunnel`

Expose your local VoltAgent server over a secure public URL with a single command:

```bash
pnpm volt tunnel 3141
```

The CLI handles tunnel creation for `localhost:3141` and keeps the connection alive until you press `Ctrl+C`. You can omit the port argument to use the default.
