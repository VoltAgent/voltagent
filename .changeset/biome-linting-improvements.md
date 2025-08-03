---
"create-voltagent-app": patch
"@voltagent/vercel-ai-exporter": patch
"@voltagent/langfuse-exporter": patch
"@voltagent/anthropic-ai": patch
"@voltagent/google-ai": patch
"@voltagent/vercel-ai": patch
"@voltagent/vercel-ui": patch
"@voltagent/docs-mcp": patch
"@voltagent/internal": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/groq-ai": patch
"@voltagent/logger": patch
"@voltagent/voice": patch
"@voltagent/core": patch
"@voltagent/xsai": patch
"@voltagent/cli": patch
"@voltagent/sdk": patch
---

fix: improve code quality with biome linting and package configuration enhancements

This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

**Key improvements:**

- **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
- **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
- **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
- **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
- **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.
