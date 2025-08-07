---
"@voltagent/anthropic-ai": patch
---

feat: deprecate @voltagent/anthropic-ai in favor of @ai-sdk/anthropic

This package is now deprecated. Please migrate to using `@ai-sdk/anthropic` with `@voltagent/vercel-ai` instead.

## Why We're Deprecating

As the VoltAgent team, we've made the strategic decision to deprecate our native provider implementations because:

- **Maintenance Burden**: Keeping up with rapidly evolving AI provider APIs requires significant time and resources that could be better spent on VoltAgent's core features
- **Duplicate Effort**: Vercel AI SDK already provides excellent, well-maintained implementations of these providers - there's no value in duplicating this work
- **Feature Parity**: Implementing all provider-specific features (streaming, tool calling, vision, caching, etc.) is time-consuming and provides no additional benefit over using Vercel's implementations
- **Better Together**: By leveraging Vercel AI SDK, we can focus on what makes VoltAgent unique (agents, workflows, memory) while benefiting from their provider expertise

## Migration Guide

### Step 1: Install New Packages

```bash
npm uninstall @voltagent/anthropic-ai
npm install @voltagent/vercel-ai @ai-sdk/anthropic@1
```

### Step 2: Update Your Code

**Before (deprecated):**

```typescript
import { AnthropicProvider } from "@voltagent/anthropic-ai";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  llm: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  model: "claude-opus-4-1",
});
```

**After (recommended):**

```typescript
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  llm: new VercelAIProvider(),
  model: anthropic("claude-opus-4-1"),
});
```

### Step 3: Environment Variables

The environment variable remains the same:

- `ANTHROPIC_API_KEY` - Your Anthropic API key

## Support

For more information:

- [Migration Guide](https://voltagent.dev/docs/providers/anthropic-ai/) - Complete migration instructions
- [Vercel AI SDK Anthropic Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic)
- [VoltAgent Documentation](https://voltagent.dev/docs/providers/vercel-ai)
