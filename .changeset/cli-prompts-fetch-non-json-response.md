---
"@voltagent/cli": patch
---

Handle non-JSON upstream responses in `volt prompts pull` / `volt prompts push` so the CLI surfaces a rich, correlated error (`Failed to parse prompt '<name>' response: ... (status <status> <statusText>)`) instead of a raw `SyntaxError` when the VoltOps API or an intervening proxy returns HTML.
