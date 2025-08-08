# Deprecated VoltAgent Providers

This directory contains deprecated provider packages that have been replaced by Vercel AI SDK providers.

## Deprecated Packages

- **@voltagent/anthropic-ai** → Use `@ai-sdk/anthropic` with `@voltagent/vercel-ai`
- **@voltagent/google-ai** → Use `@ai-sdk/google` with `@voltagent/vercel-ai`
- **@voltagent/groq-ai** → Use `@ai-sdk/groq` with `@voltagent/vercel-ai`

## Migration Guides

- [Anthropic Migration](https://voltagent.dev/docs/providers/anthropic-ai/)
- [Google AI Migration](https://voltagent.dev/docs/providers/google-ai/)
- [Groq Migration](https://voltagent.dev/docs/providers/groq-ai/)

## Why Archived?

These packages have been archived to:

1. Keep the main codebase clean for contributors
2. Reduce maintenance burden
3. Focus on core VoltAgent features
4. Leverage Vercel AI SDK's well-maintained providers

## Note

These packages are still available on NPM for backward compatibility, but will not receive updates.
