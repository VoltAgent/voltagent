# VoltAgent Vercel UI SDK Integration

VoltAgent integration with the Vercel UI SDK for building agentic applications.

## 🚀 Quick Start

```bash
npm install @voltagent/vercel-ui
```

```typescript
import { convertToUIMessages } from "@voltagent/vercel-ui";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  id: "assistant",
  name: "Assistant",
  purpose: "A helpful assistant that can answer questions and help with tasks.",
  instructions: "You are a helpful assistant that can answer questions and help with tasks.",
  model: "gpt-4.1-mini",
  llm: new VercelAIProvider(),
  hooks: {
    onFinish: (result) => {
      chatStore.save({
        conversationId: result.conversationId,
        messages: convertToUIMessages(result.operationContext),
      });
    },
  },
});

const result = await agent.generateText("Hello, how are you?", {
  hooks: {},
});
```

## 🔧 Usage Examples

```typescript

```

## 🔗 Links

- [Documentation](https://voltagent.dev/docs-observability/)
- [Console Dashboard](https://console.voltagent.dev)
- [API Reference](https://voltagent.dev/docs-observability/)

## 📄 License

MIT License - see LICENSE file for details.
