import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { startMcpServer } from "./mcp-server.js";

const logger = createPinoLogger({
  name: "with-mcp-elicitation",
  level: "info",
});

const port = Number.parseInt(process.env.MCP_SERVER_PORT ?? "3142", 10);

const { url } = await startMcpServer(port, logger);

const mcpConfig = new MCPConfiguration({
  servers: {
    demo: {
      type: "http",
      url,
    },
  },
});

const tools = await mcpConfig.getTools();

const agent = new Agent({
  name: "ElicitationAgent",
  instructions: [
    "You are a tool-routing assistant.",
    "When the user asks to delete a customer, call the MCP tool demo_customer_delete.",
    "Keep responses short and confirm the outcome.",
  ].join("\n"),
  model: openai("gpt-4o-mini"),
  tools,
  logger,
});

const response = await agent.generateText("Delete customer 123.", {
  userId: "demo-user",
  conversationId: "demo-session",
  maxSteps: 4,
  elicitation: async (request) => {
    console.log("Elicitation request received", request);

    return {
      action: "accept",
      content: {
        confirm: true,
        reason: "demo approval",
      },
    };
  },
});

console.log("Agent response:", response.text);
