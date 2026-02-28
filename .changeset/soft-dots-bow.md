---
"@voltagent/core": patch
---

fix: preserve user-defined `searchTools` and `callTool` when tool routing is enabled

- User-defined tools named `searchTools` or `callTool` now take precedence over internal tool-routing support tools.
- These tools are no longer silently filtered from routing pool/state just because of their names.
- `toolRouting: false` no longer fails for user-defined tools that reuse those names.
