---
"@voltagent/vercel-ai": major
---

Update Vercel AI SDK to v5.0.0

Major upgrade to Vercel AI SDK v5 with significant improvements:

## Package Updates

- Updated `ai` package to v5.0.0
- Updated `@ai-sdk/provider` to v2.0.0
- Updated `@ai-sdk/provider-utils` to v3.0.0
- Updated all other `@ai-sdk/*` packages to v2.0.0
- Updated peer dependency `zod` to ^3.25.0 (required by AI SDK v5)

## Key Changes

- **Breaking**: New provider interface with improved type safety
- **Improved Streaming**: Enhanced streaming capabilities with better error handling
- **Better TypeScript Support**: Stricter types and improved inference
- **Unified Provider API**: Consistent interface across all AI providers
- **Performance**: Optimized token usage and response handling

## Migration Notes

- Provider implementations updated to use new `@ai-sdk/provider` v2.0.0 interface
- Maintained backward compatibility with existing VoltAgent agent interfaces
- All streaming methods now use the improved v5 streaming protocol
- Error handling enhanced with more descriptive error types
