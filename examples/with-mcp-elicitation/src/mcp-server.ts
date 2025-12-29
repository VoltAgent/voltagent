import { VoltAgent, createTool } from "@voltagent/core";
import type { Logger } from "@voltagent/logger";
import { MCPServer } from "@voltagent/mcp-server";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const confirmationSchema = {
  type: "object",
  properties: {
    confirm: {
      type: "boolean",
      description: "Set to true to confirm deletion",
    },
    reason: {
      type: "string",
      description: "Optional reason for deleting the customer",
    },
  },
  required: ["confirm"],
} as const;

type ConfirmationContent = {
  confirm?: boolean;
  reason?: string;
};

const customerDeleteTool = createTool({
  name: "customer_delete",
  description: "Delete a customer after the user confirms the action.",
  parameters: z.object({
    customerId: z.string().describe("Customer ID to delete"),
  }),
  execute: async ({ customerId }, operationContext) => {
    const request = operationContext?.elicitation;
    if (!request) {
      throw new Error("Elicitation bridge unavailable; cannot request confirmation");
    }

    const response = await request({
      mode: "form",
      message: `Confirm deletion of customer ${customerId}?`,
      requestedSchema: confirmationSchema,
    });

    const payload = response as { action?: string; content?: ConfirmationContent } | undefined;
    const confirmed = payload?.action === "accept" && payload.content?.confirm === true;

    return confirmed ? `Customer ${customerId} deleted.` : `Deletion cancelled for ${customerId}.`;
  },
});

async function waitForServerReady(voltAgent: VoltAgent, timeoutMs = 5000): Promise<void> {
  const server = voltAgent.getServerInstance();
  if (!server) {
    return;
  }

  const startTime = Date.now();
  while (!server.isRunning()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("MCP server did not start in time");
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export async function startMcpServer(port = 3142, logger?: Logger): Promise<{ url: string }> {
  const mcpServer = new MCPServer({
    name: "mcp-elicitation-example",
    version: "0.1.0",
    protocols: {
      http: true,
      sse: true,
      stdio: true,
    },
    capabilities: {
      elicitation: true,
    },
    tools: {
      customerDeleteTool,
    },
  });

  const voltAgent = new VoltAgent({
    logger,
    mcpServers: {
      demo: mcpServer,
    },
    server: honoServer({ port }),
  });

  await waitForServerReady(voltAgent);

  const serverId = mcpServer.getMetadata().id;
  const url = `http://localhost:${port}/mcp/${serverId}/mcp`;

  return { url };
}
