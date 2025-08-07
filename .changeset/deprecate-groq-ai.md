---
"@voltagent/groq-ai": patch
---

feat: deprecate @voltagent/groq-ai in favor of @ai-sdk/groq

This package is now deprecated. Please migrate to using `@ai-sdk/groq` with `@voltagent/vercel-ai` instead.

## Why We're Deprecating

As the VoltAgent team, we've made the strategic decision to deprecate our native provider implementations because:

- **Maintenance Burden**: Groq regularly adds new models and updates their API - maintaining our own implementation requires constant updates that don't provide unique value to VoltAgent users
- **No Added Value**: Our implementation would essentially mirror what Vercel AI SDK already provides excellently - there's no benefit in maintaining duplicate code
- **Resource Allocation**: The time spent maintaining provider integrations is better invested in VoltAgent's core strengths: agent systems, tool orchestration, and workflow management
- **Ecosystem Benefits**: Using Vercel AI SDK gives users access to 30+ providers with a consistent interface, rather than just the few we could realistically maintain

## Migration Guide

### Step 1: Install New Packages

```bash
npm uninstall @voltagent/groq-ai
npm install @voltagent/vercel-ai @ai-sdk/groq
```

### Step 2: Update Your Code

**Before (deprecated):**

```typescript
import { GroqProvider } from "@voltagent/groq-ai";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  llm: new GroqProvider({
    apiKey: process.env.GROQ_API_KEY,
  }),
  model: "mixtral-8x7b-32768",
});
```

**After (recommended):**

```typescript
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { groq } from "@ai-sdk/groq";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  llm: new VercelAIProvider(),
  model: groq("mixtral-8x7b-32768"),
});
```

### Step 3: Environment Variables

The environment variable remains the same:

- `GROQ_API_KEY` - Your Groq API key

## Support

For more information:

- [Migration Guide](https://voltagent.dev/docs/providers/groq-ai/) - Complete migration instructions
- [Vercel AI SDK Groq Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/groq)
- [VoltAgent Documentation](https://voltagent.dev/docs/providers/vercel-ai)
- [Groq Console](https://console.groq.com/) - Get your API key and view usage
