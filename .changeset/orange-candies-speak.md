---
"@voltagent/anthropic-ai": patch
"@voltagent/groq-ai": patch
"@voltagent/core": patch
---

Fixes Issue [#87]("https://github.com/VoltAgent/voltagent/issues/87")

Added JSON schema support for REST API `generateObject` and `streamObject` functions. The system now accepts JSON schemas which are internally converted to Zod schemas for validation. This enables REST API usage where Zod schemas cannot be directly passed.

Additional Changes:

- Included the JSON schema from `options.schema` in the system message for the `generateObject` and `streamObject` functions in both `anthropic-ai` and `groq-ai` providers.
- Enhanced schema handling to convert JSON schemas to Zod internally for seamless REST API compatibility.
