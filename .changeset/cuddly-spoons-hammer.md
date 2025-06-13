---
"@voltagent/core": patch
---

feat: add fullStream support and subagent event forwarding

Added `fullStream` support to the core agent system for enhanced streaming with detailed chunk types (text-delta, tool-call, tool-result, reasoning, finish, error). Also improved event forwarding between subagents for better multi-agent workflows.

Real-world example:

```typescript
const response = await agent.streamText("What's the weather in Istanbul?");

if (response.fullStream) {
  for await (const chunk of response.fullStream) {
    switch (chunk.type) {
      case "text-delta":
        process.stdout.write(chunk.textDelta); // Stream text in real-time
        break;
      case "tool-call":
        console.log(`🔧 Using tool: ${chunk.toolName}`);
        break;
      case "tool-result":
        console.log(`✅ Tool completed: ${chunk.toolName}`);
        break;
      case "reasoning":
        console.log(`🤔 AI thinking: ${chunk.reasoning}`);
        break;
      case "finish":
        console.log(`\n✨ Done! Tokens used: ${chunk.usage?.totalTokens}`);
        break;
    }
  }
}
```
