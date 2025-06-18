---
"@voltagent/core": patch
---

fix: subagent event ordering and stream injection

Fixed an issue where subagent events were not being properly included in the main agent's stream before subagent completion. Previously, subagent events (text-delta, tool-call, tool-result, etc.) would sometimes miss being included in the parent agent's real-time stream, causing incomplete event visibility for monitoring and debugging.
