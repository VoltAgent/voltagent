---
"@voltagent/google-ai": patch
---

feat: deprecate @voltagent/google-ai in favor of @ai-sdk/google

This package is now deprecated. Please migrate to using `@ai-sdk/google` with `@voltagent/vercel-ai` instead.

## Why We're Deprecating

As the VoltAgent team, we've made the strategic decision to deprecate our native provider implementations because:

- **Maintenance Burden**: Google frequently updates their Gemini API with new models and features - keeping pace requires continuous effort that doesn't add unique value
- **Duplicate Effort**: Vercel AI SDK already provides comprehensive Google AI integration that's actively maintained by their team
- **Feature Parity Challenge**: Implementing all Gemini-specific features (file attachments, safety settings, grounding, etc.) would require substantial development time with no real benefit
- **Strategic Focus**: By using Vercel AI SDK for providers, we can concentrate on VoltAgent's differentiating features like agent orchestration, memory systems, and workflows

## Migration Guide

### Step 1: Install New Packages

```bash
npm uninstall @voltagent/google-ai
npm install @voltagent/vercel-ai @ai-sdk/google@1
```

### Step 2: Update Your Code

**Before (deprecated):**

```typescript
import { GoogleAIProvider } from "@voltagent/google-ai";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  llm: new GoogleAIProvider({
    apiKey: process.env.GOOGLE_AI_API_KEY,
  }),
  model: "gemini-1.5-pro",
});
```

**After (recommended):**

```typescript
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { google } from "@ai-sdk/google";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  llm: new VercelAIProvider(),
  model: google("gemini-1.5-pro"),
});
```

### Step 3: Environment Variables

The environment variable has changed:

- **Before**: `GOOGLE_AI_API_KEY`
- **After**: `GOOGLE_GENERATIVE_AI_API_KEY`

Update your `.env` file:

```env
# Old (deprecated)
GOOGLE_AI_API_KEY=your-api-key

# New
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
```

## Support

For more information:

- [Migration Guide](https://voltagent.dev/docs/providers/google-ai/) - Complete migration instructions
- [Vercel AI SDK Google Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai)
- [VoltAgent Documentation](https://voltagent.dev/docs/providers/vercel-ai)
- [Google AI Studio](https://aistudio.google.com/) - Get your API key
