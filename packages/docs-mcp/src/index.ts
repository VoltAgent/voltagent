import { z } from "zod";
import { voltAgentDocsTools } from "./tools";

// Start MCP Server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Map VoltAgent tools to MCP tools
const mcpTools = voltAgentDocsTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: z.toJSONSchema(tool.parameters, { target: "draft-7" }),
}));

console.error("=== VoltAgent Docs MCP Server Starting ===");
console.error(`Loaded ${mcpTools.length} tools:`);
mcpTools.forEach((tool, index) => {
  console.error(`  ${index + 1}. ${tool.name} - ${tool.description}`);
});
console.error("===========================================");

// Create server instance
const server = new Server(
  {
    name: "voltagent-docs-mcp",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("=== LIST TOOLS REQUEST RECEIVED ===");
  console.error(`Returning ${mcpTools.length} tools to client`);
  mcpTools.forEach((tool, index) => {
    console.error(`  ${index + 1}. ${tool.name}`);
  });
  console.error("====================================");

  return {
    tools: mcpTools,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  console.error("=== TOOL CALL REQUEST ===");
  console.error(`Tool: ${request.params.name}`);
  console.error("Args:", request.params.arguments);
  console.error("========================");

  const { name, arguments: args } = request.params;

  // Find the corresponding VoltAgent tool
  const tool = voltAgentDocsTools.find((t) => t.name === name);

  if (!tool) {
    console.error(`ERROR: Unknown tool: ${name}`);
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    // Execute the tool with proper args
    const result = await tool.execute(args || ({} as any));

    console.error(`Tool ${name} executed successfully`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`Tool execution failed for ${name}:`, error);
    throw new Error(
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("=== VoltAgent docs MCP server is running ===");

  // Handle process termination
  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down server...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down server...");
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
