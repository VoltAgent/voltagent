---
"@voltagent/core": patch
---

feat: add ChatMessage format for Vercel AI SDK compatibility in onEnd hook

Added `messages` array to the `onEnd` hook arguments with new ChatMessage format that's fully compatible with Vercel AI SDK. Tool calls and results are now grouped within assistant messages in the `toolInvocations` array, making it ready for direct use with Vercel AI's UI components.

```ts
const hooks = createHooks({
  onEnd: async ({ agent, output, error, messages, context }) => {
    // messages now contains ChatMessage[] format compatible with Vercel AI SDK:
    // [
    //   {
    //     id: "msg-1",
    //     role: "user",
    //     content: "What's the weather like in San Francisco today?",
    //     createdAt: new Date()
    //   },
    //   {
    //     id: "msg-2",
    //     role: "assistant",
    //     content: "The weather in San Francisco today is 8°C and rainy.",
    //     createdAt: new Date(),
    //     toolInvocations: [
    //       {
    //         toolCallId: "call_3gafyUbf9cx1FOxqi4tfSq2i",
    //         toolName: "getWeather",
    //         args: { location: "San Francisco" },
    //         state: "result",
    //         step: 0,
    //         result: {
    //           weather: { location: "San Francisco", temperature: 8, condition: "Rainy" },
    //           message: "Current weather in San Francisco: 8°C and rainy."
    //         }
    //       }
    //     ]
    //   }
    // ]

    // Can be used directly with Vercel AI SDK:
    const updatedMessages = appendResponseMessages({
      messages: existingMessages,
      responseMessages: messages,
    });
  },
});
```

New types exported:

- `ChatMessage`: Individual message with Vercel AI SDK compatible structure
- `ChatMessages`: Array type alias for ChatMessage[]
- `ToolInvocation`: Tool call and result information structure
