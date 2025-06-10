---
"@voltagent/google-ai": patch
"@voltagent/vercel-ai": patch
"@voltagent/groq-ai": patch
"@voltagent/xsai": patch
---

fix: add toolName to tool-result steps

Tool result steps now include the toolName field, ensuring proper identification of which tool generated each result in conversation flows and hook messages.
