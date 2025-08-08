# ⚠️ DEPRECATED: @voltagent/anthropic-ai

This package has been **deprecated** and is no longer maintained.

## Migration Required

Please migrate to using the [Vercel AI SDK's Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) with `@voltagent/vercel-ai` instead.

### Migration Steps

1. **Update your dependencies:**

```bash
# Remove the deprecated package
npm uninstall @voltagent/anthropic-ai

# Install the recommended packages
npm install @voltagent/vercel-ai @ai-sdk/anthropic@1
```

2. **Update your code:**

```typescript
// ❌ Old (deprecated)
import { AnthropicProvider } from "@voltagent/anthropic-ai";

const provider = new AnthropicProvider({
  apiKey: "YOUR_API_KEY",
});

const agent = new Agent({
  name: "Claude Agent",
  llm: provider,
  model: "claude-opus-4-1",
});

// ✅ New (recommended)
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";

const provider = new VercelAIProvider();

const agent = new Agent({
  name: "Claude Agent",
  llm: provider,
  model: anthropic("claude-opus-4-1"),
});
```

## Resources

- 📚 **[Migration Guide](https://voltagent.dev/docs/providers/anthropic-ai/)** - Complete migration documentation
- 📖 **[Providers & Models Documentation](https://voltagent.dev/docs/getting-started/providers-models)** - Learn about the new provider system
- 📦 **[Archived Code](../../archive/deprecated-providers/anthropic-ai/)** - Original source code (read-only)
- 🔗 **[Vercel AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)** - Official documentation

## Why This Change?

1. **Better Maintenance**: Leveraging Vercel AI SDK's well-maintained providers
2. **More Features**: Access to the latest Claude models and capabilities
3. **Unified Interface**: Consistent API across all AI providers
4. **Active Development**: Regular updates and improvements from the Vercel team

## Support

If you need help with migration, please:

- Check the [migration guide](https://voltagent.dev/docs/providers/anthropic-ai/)
- Visit our [GitHub discussions](https://github.com/voltagentdev/voltagent/discussions)
- Review the [examples](https://github.com/voltagentdev/voltagent/tree/main/examples) using the new provider

---

**Note**: The deprecated package is still available on NPM for backward compatibility but will not receive any updates or bug fixes.
