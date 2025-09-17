# ⚠️ DEPRECATED: @voltagent/groq-ai

This package has been **deprecated** and is no longer maintained.

## Migration Required

Please migrate to using the [Vercel AI SDK's Groq provider](https://ai-sdk.dev/providers/ai-sdk-providers/groq) with `@voltagent/vercel-ai` instead.

### Migration Steps

1. **Update your dependencies:**

```bash
# Remove the deprecated package
npm uninstall @voltagent/groq-ai

# Install the recommended packages
npm install ai @ai-sdk/groq
```

2. **Update your code:**

```typescript
// ❌ Old (deprecated)
import { GroqProvider } from "@voltagent/groq-ai";

const provider = new GroqProvider({
  apiKey: "YOUR_API_KEY",
});

const agent = new Agent({
  name: "Groq Agent",
  llm: provider,
  model: "llama-3.3-70b-versatile",
});

// ✅ New (recommended)
import { groq } from "@ai-sdk/groq";

const agent = new Agent({
  name: "Groq Agent",
  model: groq("llama-3.3-70b-versatile"),
});
```

## Resources

- 📚 **[Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)** - Complete migration documentation
- 📖 **[Providers & Models Documentation](https://voltagent.dev/docs/getting-started/providers-models)** - Learn about the new provider system
- 📦 **[Archived Code](../../archive/deprecated-providers/groq-ai/)** - Original source code (read-only)
- 🔗 **[ai-sdk Groq Provider](https://ai-sdk.dev/providers/ai-sdk-providers/groq)** - Official documentation

## Why This Change?

1. **Better Maintenance**: Leveraging Vercel AI SDK's well-maintained providers
2. **More Features**: Access to the latest Groq-supported models
3. **Unified Interface**: Consistent API across all AI providers
4. **High Performance**: Optimized for Groq's LPU inference engine
5. **Active Development**: Regular updates and improvements from the Vercel team

## Support

If you need help with migration, please:

- Check the [migration guide](https://voltagent.dev/docs/providers/groq-ai/)
- Visit our [GitHub discussions](https://github.com/voltagentdev/voltagent/discussions)
- Review the [examples](https://github.com/voltagentdev/voltagent/tree/main/examples) using the new provider

---

**Note**: The deprecated package is still available on NPM for backward compatibility but will not receive any updates or bug fixes.
