---
"@voltagent/server-core": patch
---

fix(server-core): report requested port conflicts instead of silently switching ports

When a server provider is configured with an explicit port and that port is already in use, VoltAgent now stops with guidance for configuring a different port instead of automatically binding to another available port. Calls without an explicit port keep the previous automatic fallback behavior.
