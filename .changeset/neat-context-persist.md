---
"@voltagent/core": patch
---

fix: persist workflow context mutations across steps and downstream agents/tools

Workflows now consistently use the execution context map when building step state.
This ensures context written in one step is visible in later steps and in `andAgent` calls.

Also aligns workflow event/stream context payloads with the normalized runtime context.
