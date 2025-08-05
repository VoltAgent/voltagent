---
"@voltagent/core": patch
"@voltagent/anthropic-ai": patch
"@voltagent/google-ai": patch
"@voltagent/groq-ai": patch
"@voltagent/xsai": patch
"@voltagent/vercel-ai": patch
"@voltagent/vercel-ui": patch
"@voltagent/docs-mcp": patch
---

Update Zod to v3.25.0 for compatibility with zod-from-json-schema

- Updated Zod dependency to ^3.25.0 across all packages
- Maintained compatibility with zod-from-json-schema@0.0.5
- Fixed TypeScript declaration build hanging issue
- Resolved circular dependency issues in the build process
