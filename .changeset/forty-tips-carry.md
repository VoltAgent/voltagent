---
"@voltagent/core": patch
---

fix: unwrap provider-executed tool outputs when persisting conversation history so Anthropic’s `server_tool_use` IDs stay unique on replay
