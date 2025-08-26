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
    onEnd: async (result) => {
      await chatStore.save({
        conversationId: result.conversationId,
        messages: convertToUIMessages(result.operationContext),
      });
    },
  },
});

const result = await agent.generateText("Hello, how are you?");

// You can now fetch the messages from your custom chat store and return to the UI to provide a
// history of the conversation.

app.get("/api/chats/:id", async ({ req }) => {
  const conversation = await chatStore.read(req.param("id"));
  return Response.json(conversation.messages);
});
```

## 🧪 Testing

This package maintains strict test coverage requirements. All code must have comprehensive test coverage with the following thresholds:

### Coverage Requirements

- **Global**: 90% statements, 90% branches, 100% functions, 90% lines
- **Messages module**: 100% statements, 95% branches, 100% functions, 100% lines
- **Utils module**: 100% statements, 100% branches, 100% functions, 100% lines
- **Streams module**: 90% statements, 90% branches, 100% functions, 90% lines

### Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests with strict coverage enforcement
pnpm test:coverage:strict
```

### Coverage Exclusions

The following files are excluded from coverage requirements as they contain only type definitions:

- `src/types.ts`
- `src/streams/type-utils.ts`

## 📄 License

MIT License - see LICENSE file for details.
