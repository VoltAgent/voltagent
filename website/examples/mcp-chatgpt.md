---
id: 6
slug: chatgpt-app
title: ChatGPT App With VoltAgent
description: Deploy the VoltAgent-based AI agent, expose it over MCP, and connect it to ChatGPT Apps.
repository: https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp-server
---

# Building a ChatGPT App With VoltAgent

This guide shows how to use VoltAgent to deploy an MCP server and connect it to ChatGPT Apps using the Apps SDK.

Our starting point is the `with-mcp-server` example, which bundles multiple agents, helper tools, and an expense approval workflow behind a Model Context Protocol surface.

### Setup

#### Create the app

Use the VoltAgent CLI to bootstrap the example locally:

```bash
pnpm create voltagent-app@latest -- --example with-mcp-server
cd with-mcp-server
```

The project comes pre-configured with a VoltAgent runtime, the Hono server provider, and an MCP configuration.

#### Configure the MCP server

Inside `examples/with-mcp-server/src/index.ts`, an MCPServer instance exposes VoltAgent registries to MCP clients:

```typescript
const mcpServer = new MCPServer({
  name: "voltagent-example",
  version: "0.1.0",
  description: "VoltAgent MCP stdio example",
  protocols: { stdio: true, http: true, sse: true },
  workflows: { expenseApprovalWorkflow },
  adapters: {
    prompts: {
      /* prompt registry */
    },
    resources: {
      /* read-only knowledge assets */
    },
    elicitation: {
      /* human-in-the-loop approvals */
    },
  },
});
```

The adapters demonstrate how prompts, resources, and elicitation bridges can be surfaced to MCP clients without modifying the global VoltAgent registry.

#### Register the MCP server with VoltAgent

The same file wires agents, workflows, and the MCP server into a single VoltAgent instance:

```typescript
new VoltAgent({
  agents: {
    supervisorAgent,
    translatorAgent,
    storyWriter,
    assistant,
  },
  mcpServers: { mcpServer },
  server: honoServer({ port: 3141 }),
  logger,
});
```

Key agents include:

- `AssistantAgent` with helper tools like `current_time` and `confirm_action`.
- `SupervisorAgent` that delegates to the creative `StoryWriterAgent` or `TranslatorAgent`.
- Tooling that demonstrates elicitation (manual approval) flows for risky operations.

#### Add the expense approval workflow

The example ships with an `Expense Approval Workflow` built via `createWorkflowChain`:

```typescript
const expenseApprovalWorkflow = createWorkflowChain({
  id: "expense-approval",
  name: "Expense Approval Workflow",
  purpose: "Process expense reports with manager approval for high amounts",
  input: z.object({
    /* request payload */
  }),
  result: z.object({
    /* final status */
  }),
})
  .andThen({
    /* suspend/resume step for manager approval */
  })
  .andThen({
    /* final decision logging */
  });
```

When the claimed amount exceeds $500, the workflow suspends and triggers the MCP elicitation adapter, which—inside the example—auto-approves but can be wired to a human reviewer.

### Local Verification

#### Start the development server

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

You should see:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ✓ Swagger UI:   http://localhost:3141/ui
  ...
```

- Use `http://localhost:3141` as the base URL to inspect agents, tools, prompts, and resources. VoltOps Console at https://console.voltagent.dev lists the MCP endpoints once the server is online.
- Trigger the `expense-approval` workflow; for amounts over $500, the example’s elicitation adapter simulates a manager granting approval.

### Connect to ChatGPT

#### Publish the local server

Because ChatGPT only talks to HTTPS endpoints, tunnel your development server before you move into the Apps SDK flow. Run the VoltAgent CLI tunnel command:

```bash
pnpm volt tunnel 3141
# Forwarding: https://<slug>.tunnel.voltagent.dev -> http://127.0.0.1:3141
```

Keep the tunnel running; the VoltAgent example listens on `3141`, so the default command already forwards the correct port. (You can omit the `3141` argument to rely on the default.) See the [Local Tunnel guide](https://voltagent.dev/deployment-docs/local-tunnel/) for more options (including `npx` usage).

#### Create the ChatGPT connector

Open ChatGPT, head to **Settings → Apps**, and work through the following:

1. **Turn on developer access.** Under **Connectors → Advanced**, switch on Developer Mode (your OpenAI partner contact or workspace admin needs to grant this once).
2. **Create the connector record.** Choose **Connectors → Create**, then point the form at your tunnel:
   - _Name_: `VoltAgent Expense MCP`
   - _Description_: `Expense approval workflow, prompts, and helper tools powered by VoltAgent.`
   - _URL_: `https://<slug>.tunnel.voltagent.dev/mcp/voltagent-example/mcp`
3. **Skip auth while testing.** Leave authentication off until the service is hosted in production.

![ChatGPT Connector Form](https://cdn.voltagent.dev/website/examples/mcp-chatgpt/7-mcp.webp)

#### Exercise the connector from ChatGPT

Once the connector is created, open a new ChatGPT conversation and pick the `VoltAgent Expense MCP` connector from the Apps menu. Suggested smoke tests:

- Call the `current_time` tool to confirm basic tool execution.
- Submit an expense scenario (for example, “File a $750 hardware reimbursement for employee-123”).  
  The model should trigger the workflow, hit the elicitation adapter, and respond with the manager decision produced by the demo integration.

![ChatGPT Tool Invocation](https://cdn.voltagent.dev/website/examples/mcp-chatgpt/2.verify.webp)

After verifying the connector, VoltAgent tools and workflows remain available over MCP, HTTP, SSE, and stdio. Swap the mock elicitation handler for the approval channel your team relies on, enrich the prompt and resource adapters with real documentation, and expose the service behind an authenticated HTTPS endpoint before sharing it.

---

### Credits

This example adapts the original walkthrough authored by [Ekim Cem Ülger](https://www.linkedin.com/in/ekimcem/). You can read the initial article on: [Building a ChatGPT App with VoltAgent and the Apps SDK](https://dev.to/ekimcem/building-a-chatgpt-app-with-voltagent-and-the-apps-sdk-4j21).
