# VoltAgent Client-Side Tools Example

This Next.js example demonstrates how to use client-side tools with VoltAgent, providing a smooth developer experience similar to Vercel AI SDK.

## Features

- 🎨 **UI Tools**: Change theme, show notifications
- 📊 **Data Tools**: Get location, read clipboard
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

4. Start the VoltAgent built-in server in a separate terminal:

```bash
pnpm voltagent:run
```

5. Open [http://localhost:3000](http://localhost:3000)

To inspect runs, open `https://console.voltagent.dev` and connect it to `http://localhost:3141`.

### How It Works

### 1. Define Tools (No Execute = Client-Side)

```typescript
// Client-side tool (no execute function)
const getLocationTool = createTool({
  name: "getLocation",
  description: "Get user's current location",
  parameters: z.object({}),
  // No execute = automatically client-side
});
```

### 2. Handle Client-Side Tools with useChat

```typescript
const [result, setResult] = useState<ClientSideToolResult | null>(null);

const { messages, input, handleSubmit, addToolResult } = useChat({
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  // Automatic client-side tool execution
  async onToolCall({ toolCall }) {
    if (toolCall.toolName === "getLocation") {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload: ClientSideToolResult = {
            tool: "getLocation",
            toolCallId: toolCall.toolCallId,
            output: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          };
          setResult(payload);
        },
        (error) => {
          const payload: ClientSideToolResult = {
            state: "output-error",
            tool: "getLocation",
            toolCallId: toolCall.toolCallId,
            errorText: error.message,
          };
          setResult(payload);
        }
      );
    }
  },
});
```

### 2. Sending back tool results to the model

When a client-side tool is executed, you **MUST** call `addToolResult` to provide the tool result to the model. The model will then use the result to update the conversation state.
Otherwise, the model will consider the tool call as a failure.

```ts
useEffect(() => {
  if (!result) return;
  addToolResult(result);
}, [result, addToolResult]);
```

## Tool Types

1. **Client-side Tools**: Execute client-side, don't return data
   - Change theme
   - Show notifications
   - Get location
   - Read clipboard
   - Ask for confirmation

2. **Server Tools**: Traditional server-side execution
   - Get weather
   - Database queries

## Developer Experience

The integration is designed to be as simple as possible:

1. Tools without `execute` are automatically client-side
2. `useChat` hook handles all the streaming complexity
3. `onToolCall` callback invoked when a tool call is received
4. You **must** call `addToolResult` to send back the tool result.
5. Full TypeScript support

## Try These Examples

- "What's my current location?" - Data tool
- "What's in my clipboard?" - Data tool
- "What's the weather in San Francisco?" - Server tool

## Security Considerations

Client-side tools have access to browser APIs, so:

- Always validate tool arguments
- Request user permission for sensitive operations
- Use the interactive pattern for destructive actions
- Consider rate limiting tool executions
