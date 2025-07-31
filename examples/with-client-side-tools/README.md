# VoltAgent Client-Side Tools Example

This Next.js example demonstrates how to use client-side tools with VoltAgent, providing a smooth developer experience similar to Vercel AI SDK.

## Features

- 🎨 **UI Tools**: Change theme, show notifications (no data returned to LLM)
- 📊 **Data Tools**: Get location, read clipboard (data returned to LLM)
- 🤝 **Interactive Tools**: Ask for user confirmation
- ⚡ **Smooth DX**: Uses Vercel AI SDK's `useChat` hook
- 🔄 **Automatic Handling**: Tools without `execute` are automatically client-side

## Running the Example

1. Set your OpenAI API key:

```bash
export OPENAI_API_KEY="your-api-key"
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## How It Works

### 1. Define Tools (No Execute = Client-Side)

```typescript
// Client-side tool (no execute function)
const getLocationTool = createTool({
  name: "getLocation",
  description: "Get user's current location",
  parameters: z.object({}),
  // No execute = automatically client-side
});

// Server-side tool (has execute function)
const getWeatherTool = createTool({
  name: "getWeather",
  description: "Get weather for a city",
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    // This runs on the server
    return { temperature: 22, condition: "sunny" };
  },
});
```

### 2. Handle Client-Side Tools with useChat

```typescript
const { messages, input, handleSubmit } = useChat({
  // Automatic client-side tool execution
  async onToolCall({ toolCall }) {
    if (toolCall.toolName === "getLocation") {
      // Return data to LLM
      return await getCurrentLocation();
    }

    if (toolCall.toolName === "changeTheme") {
      // UI-only, no return
      document.documentElement.setAttribute("data-theme", toolCall.args.theme);
    }
  },
});
```

### 3. Interactive Tools

```typescript
// Render interactive tools in the UI
{m.toolInvocations?.map((toolInvocation) => {
  if (toolInvocation.toolName === "askForConfirmation") {
    return (
      <div>
        <p>{toolInvocation.args.message}</p>
        <button onClick={() => addToolResult({
          toolCallId: toolInvocation.toolCallId,
          result: "Yes"
        })}>
          Yes
        </button>
      </div>
    );
  }
})}
```

## Tool Types

1. **UI-Only Tools**: Execute client-side, don't return data

   - Change theme
   - Show notifications

2. **Data-Returning Tools**: Execute client-side, return data to LLM

   - Get location
   - Read clipboard

3. **Interactive Tools**: Require user interaction

   - Ask for confirmation

4. **Server Tools**: Traditional server-side execution
   - Get weather
   - Database queries

## Developer Experience

The integration is designed to be as simple as possible:

1. Tools without `execute` are automatically client-side
2. `useChat` hook handles all the streaming complexity
3. `onToolCall` for automatic execution
4. `addToolResult` for interactive tools
5. Full TypeScript support

## Try These Examples

- "Change the theme to dark mode" - UI tool
- "Show me a notification saying hello" - UI tool
- "What's my current location?" - Data tool
- "What's in my clipboard?" - Data tool
- "What's the weather in San Francisco?" - Server tool
- "Can you ask me to confirm before changing the theme?" - Interactive tool

## Security Considerations

Client-side tools have access to browser APIs, so:

- Always validate tool arguments
- Request user permission for sensitive operations
- Use the interactive pattern for destructive actions
- Consider rate limiting tool executions
