# Client-Side Tools Example

This example demonstrates how to use VoltAgent with client-side tools that require user approval before execution.

## Overview

Client-side tools are tools that don't have a server-side `execute` function. Instead, they're meant to be executed on the client (browser, CLI, etc.). This example shows:

1. How to define client-side tools (without `execute` function)
2. How to detect when the agent wants to use a client-side tool
3. How to implement user approval before executing the tool
4. How to send tool results back to the agent

## Running the Example

1. Install dependencies:

```bash
pnpm install
```

2. Set up your environment variables:

```bash
# Create a .env file with your OpenAI API key
echo "OPENAI_API_KEY=your-api-key-here" > .env
```

3. Run the example:

```bash
pnpm dev
```

## How It Works

1. **Client-side tools** are defined without an `execute` function
2. When streaming responses, the agent will emit `tool-call` events with `clientSide: true`
3. The client prompts the user for approval before executing the tool
4. After execution, the result is sent back as a message with role `tool`

## Example Tools

- **changeSystemTheme**: Changes the system theme (light/dark mode)
- **showNotification**: Shows a system notification
- **openUrl**: Opens a URL in the browser (requires approval)

## Security Considerations

Always implement user approval for client-side tools that:

- Access system resources
- Open external URLs
- Make changes to the user's environment
- Could potentially be harmful if misused
