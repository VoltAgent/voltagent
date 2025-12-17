---
"@voltagent/core": minor
---

feat: add MCP client elicitation support for user input handling

Added support for handling elicitation requests from MCP servers. When an MCP server needs user input during tool execution (e.g., confirmation dialogs, credentials, or form data), you can now dynamically register handlers to process these requests.

## New API

Access the elicitation bridge via `mcpClient.elicitation`:

```ts
const clients = await mcpConfig.getClients();

// Set a persistent handler
clients.myServer.elicitation.setHandler(async (request) => {
  console.log("Server asks:", request.message);
  console.log("Expected schema:", request.requestedSchema);

  const userConfirmed = await promptUser(request.message);

  return {
    action: userConfirmed ? "accept" : "decline",
    content: userConfirmed ? { confirmed: true } : undefined,
  };
});

// One-time handler (auto-removes after first call)
clients.myServer.elicitation.once(async (request) => {
  return { action: "accept", content: { approved: true } };
});

// Remove handler
clients.myServer.elicitation.removeHandler();

// Check if handler exists
if (clients.myServer.elicitation.hasHandler) {
  console.log("Handler registered");
}
```

## Agent-Level Elicitation

Pass elicitation handler directly to `generateText` or `streamText`:

```ts
const response = await agent.generateText("Do something with MCP", {
  userId: "user123",
  elicitation: async (request) => {
    // Handler receives elicitation request from any MCP tool
    const confirmed = await askUser(request.message);
    return {
      action: confirmed ? "accept" : "decline",
      content: confirmed ? { confirmed: true } : undefined,
    };
  },
});
```

This handler is automatically applied to all MCP tools during the request.

## Key Features

- **Dynamic handler management**: Add, replace, or remove handlers at runtime
- **One-time handlers**: Use `.once()` for handlers that auto-remove after first invocation
- **Method chaining**: All methods return `this` for fluent API usage
- **Auto-cancellation**: Requests without handlers are automatically cancelled
- **Agent-level integration**: Pass handler via `generateText`/`streamText` options
- **Full MCP SDK compatibility**: Uses `ElicitRequest` and `ElicitResult` types from `@modelcontextprotocol/sdk`

## Exports

New exports from `@voltagent/core`:

- `MCPClient` - MCP client with elicitation support
- `UserInputBridge` - Bridge class for handler management
- `UserInputHandler` - Handler function type
