---
"@voltagent/core": patch
---

fix: subAgent event propagation in fullStream for enhanced streaming experience

Fixed an issue where SubAgent events (text-delta, tool-call, tool-result, reasoning, source, finish) were not being properly forwarded to the parent agent's fullStream. This enhancement improves the streaming experience by ensuring all SubAgent activities are visible in the parent stream with proper metadata (subAgentId, subAgentName) for UI filtering and display.
