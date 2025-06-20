import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { voltAgentDocsTools } from "./index.js";

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

// Map VoltAgent tools to MCP tools
const mcpTools = voltAgentDocsTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.parameters,
}));

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: mcpTools,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Find the corresponding VoltAgent tool
  const tool = voltAgentDocsTools.find((t) => t.name === name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    // Execute the tool with proper args
    const result = await tool.execute(args || ({} as any));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle process termination
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
