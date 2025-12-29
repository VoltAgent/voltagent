import { openai } from "@ai-sdk/openai";
import { GRPC } from "@cerbos/grpc";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import type { MCPCanParams } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { startMCPServer } from "./mcp-server.js";

// Configuration
const CERBOS_ADDRESS = process.env.CERBOS_ADDRESS ?? "localhost:3593";
const MCP_SERVER_PORT = Number.parseInt(process.env.MCP_SERVER_PORT ?? "3142", 10);
const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? `http://localhost:${MCP_SERVER_PORT}/mcp`;

// Start MCP server in background
console.log("Starting MCP server...");
startMCPServer(MCP_SERVER_PORT);

// Create Cerbos client
console.log("Connecting to Cerbos PDP...");
const cerbos = new GRPC(CERBOS_ADDRESS, { tls: false });

// Create MCP configuration with authorization using the simple `can` function
console.log("Configuring MCP with authorization...\n");
const mcp = new MCPConfiguration({
  servers: {
    expenses: {
      type: "http",
      url: MCP_SERVER_URL,
    },
  },
  authorization: {
    // Simple `can` function that uses Cerbos for authorization
    // The `action` parameter tells you if this is for discovery or execution
    can: async ({ toolName, serverName, action, userId, context }: MCPCanParams) => {
      // Extract roles from context
      const roles = (context?.get("roles") as string[]) ?? ["user"];

      // You can use the action to decide different behaviors:
      // - "discovery": Tool is being listed (getTools/getToolsets)
      // - "execution": Tool is being executed (callTool)
      console.log(`[Cerbos] Checking ${action} for tool: ${toolName}`);

      // Check with Cerbos - using tool name as action (like demo repo)
      const result = await cerbos.checkResource({
        principal: {
          id: userId ?? "anonymous",
          roles,
        },
        resource: {
          kind: "mcp::expenses",
          id: serverName,
        },
        actions: [toolName],
      });

      const allowed = result.isAllowed(toolName) ?? false;

      console.log(allowed, userId, roles, serverName, toolName, action);
      return {
        allowed,
        reason: allowed ? undefined : `Access denied by Cerbos policy for tool: ${toolName}`,
      };
    },
    filterOnDiscovery: true, // Hide unauthorized tools from tool list
    checkOnExecution: true, // Also verify authorization on each tool call
  },
});

(async () => {
  // Get tools from MCP (will be filtered based on authorization)
  const tools = await mcp.getTools({
    userId: "user-123",
    context: { roles: ["admin"] },
  });

  // Create the agent with MCP tools
  const agent = new Agent({
    name: "Finance Assistant",
    instructions: `You are a helpful finance assistant that helps users manage expenses.
Available actions depend on the user's role:
- Users can list and add expenses
- Managers can also approve/reject expenses
- Admins have full access including delete

Always be helpful and explain what actions are available.`,
    model: openai("gpt-4o-mini"),
    tools,
  });

  // Initialize VoltAgent with honoServer
  new VoltAgent({
    agents: { agent },
    server: honoServer(),
  });
})();
