---
"@voltagent/internal": patch
---

fix(anthropic-ai): replace JSON.stringify with safeStringify in archived anthropic-ai provider

This is a code quality improvement in the archived anthropic-ai provider package. Replaced forbidden JSON.stringify usage with the project-mandated safeStringify function from @voltagent/internal to comply with code guidelines documented in AGENTS.md.
