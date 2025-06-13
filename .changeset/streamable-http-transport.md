---
"@voltagent/core": patch
---

feat(core): add streamable HTTP transport support for MCP

- Upgrade @modelcontextprotocol/sdk from 1.10.1 to 1.12.1
- Add support for streamable HTTP transport (the newer MCP protocol)
- Modified existing `type: "http"` to use automatic selection with streamable HTTP → SSE fallback
- Added two new transport types:
  - `type: "sse"` - Force SSE transport only (legacy)
  - `type: "streamable-http"` - Force streamable HTTP only (no fallback)
- Maintain full backward compatibility - existing `type: "http"` configurations continue to work via automatic fallback

Fixes #246
