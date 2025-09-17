# ⚠️ DEPRECATED: @voltagent/google-ai

This package has been **deprecated** and is no longer maintained.

## Migration Required

Please migrate to using the [Vercel AI SDK's Google providers](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) with `@voltagent/vercel-ai` instead.

### Migration Steps

1. **Update your dependencies:**

```bash
# Remove the deprecated package
npm uninstall @voltagent/google-ai

# Install the recommended packages
npm install ai @ai-sdk/google

# For Vertex AI users
npm install ai @ai-sdk/google-vertex
```

2. **Update your code:**

```typescript
// ❌ Old (deprecated)
import { GoogleAIProvider } from "@voltagent/google-ai";

const provider = new GoogleAIProvider({
  apiKey: "YOUR_API_KEY",
});

const agent = new Agent({
  name: "Gemini Agent",
  llm: provider,
  model: "gemini-2.0-flash-exp",
});

// ✅ New (recommended) - Google AI
import { google } from "@ai-sdk/google";

const agent = new Agent({
  name: "Gemini Agent",
  model: google("gemini-2.0-flash-exp"),
});

// ✅ New (recommended) - Vertex AI
import { vertex } from "@ai-sdk/google-vertex";

const agent = new Agent({
  name: "Vertex Gemini Agent",
  model: vertex("gemini-2.0-flash-exp"),
});
```

## Resources

- 📚 **[Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)** - Complete migration documentation
- 📖 **[Providers & Models Documentation](https://voltagent.dev/docs/getting-started/providers-models)** - Learn about the new provider system
- 📦 **[Archived Code](../../archive/deprecated-providers/google-ai/)** - Original source code (read-only)
- 🔗 **[ai-sdk Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)** - Google AI documentation
- 🔗 **[ai-sdk Vertex Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex)** - Vertex AI documentation

## Why This Change?

1. **Better Maintenance**: Leveraging Vercel AI SDK's well-maintained providers
2. **More Features**: Access to the latest Gemini models and capabilities
3. **Unified Interface**: Consistent API across all AI providers
4. **Dual Support**: Both Google AI Studio and Vertex AI platforms
5. **Active Development**: Regular updates and improvements from the Vercel team

## Support

If you need help with migration, please:

- Check the [migration guide](https://voltagent.dev/docs/providers/google-ai/)
- Visit our [GitHub discussions](https://github.com/voltagentdev/voltagent/discussions)
- Review the [examples](https://github.com/voltagentdev/voltagent/tree/main/examples) using the new provider

---

**Note**: The deprecated package is still available on NPM for backward compatibility but will not receive any updates or bug fixes.
