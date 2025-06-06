---
"@voltagent/voice": minor
"@voltagent/xsai": minor
---

🚨 Breaking Change: Renamed XsAI and Xsai to XSAI

We’ve renamed the XsAI and Xsai classes to XSAI to keep naming consistent across the framework.

What changed?

If you’re using the XsAIProvider or XsAIVoiceProvider, you now need to update your code to use XSAIProvider and XSAIVoiceProvider.

Before:

```ts
import { XsAIVoiceProvider } from "@voltagent/voice";

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new XsAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
  model: "gpt-4o-mini",
});

const voiceProvider = new XsAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY!,
});
```

After:

```ts
import { XSAIVoiceProvider } from "@voltagent/voice";

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new XSAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
  model: "gpt-4o-mini",
});

const voiceProvider = new XSAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY!,
});
```

This change resolves [#140](https://github.com/your-repo/issues/140).
