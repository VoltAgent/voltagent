---
"@voltagent/core": patch
---

fix: supervisor now prefers each sub-agent’s `purpose` over full `instructions` when listing specialized agents, keeping prompts concise and preventing accidental directive leakage; added test coverage, docs, and example updates to encourage setting a short purpose per sub-agent.
