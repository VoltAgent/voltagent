---
"@voltagent/core": patch
"@voltagent/vercel-ai": patch
---

feat: add client-side tools support with onToolCall callback API - #362

This feature enables tools to be executed on the client side, allowing for interactive tool handling without server-side execution. The implementation includes:

**Core Features:**

- Tools can now omit the `execute` function to be treated as client-side tools
- New `onToolCall` callback API for handling tool calls during streaming
- Automatic stream continuation after client-side tool execution
- Support for both `streamText` and `generateText` methods

**API Changes:**

- Added `messages` property to `ProviderTextStreamResponse` for accessing conversation history
- Added `onToolCall` callback to handle client-side tool execution
- Added `ToolResultPart` type for proper tool result message formatting

**Usage Example:**

```typescript
// Define client-side tools without execute function
const weatherTool = createTool({
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string(),
  }),
  // No execute function - handled on client
});

// Use onToolCall to handle tool execution
const stream = await agent.streamText({
  prompt: "What's the weather in London?",
  tools: [weatherTool],
});

// Handle tool calls on the client
stream.onToolCall(async (toolCall) => {
  if (toolCall.toolName === "get_weather") {
    // Execute tool logic on client
    return await fetchWeatherData(toolCall.args.location);
  }
});

// Stream will automatically continue with tool results
for await (const chunk of stream.textStream) {
  console.log(chunk);
}
```

**Provider Support:**

- Currently supported by `@voltagent/vercel-ai` provider
- Throws error if provider doesn't support messages property
- Seamless integration with existing streaming infrastructure

**Technical Implementation:**

- Stream continuation mechanism for handling tool results
- Proper type safety with `StreamPart` types instead of `any`
- Maintains all existing stream features (fullStream, textStream, etc.)
