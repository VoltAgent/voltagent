---
"@voltagent/core": patch
---

fix: subagent task delegation system message handling for Google Gemini compatibility

Fixed an issue where subagent task delegation was sending tasks as system messages, which caused errors with certain AI models like Google Gemini that have strict system message requirements. The task delegation now properly sends tasks as user messages instead of system messages.

This change improves compatibility across different AI providers, particularly Google Gemini, which expects a specific system message format and doesn't handle multiple or dynamic system messages well during task delegation workflows.
