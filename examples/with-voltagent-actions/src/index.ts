import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { createComposio, createVoltOpsMcpServer } from "./config";
import {
  createAirtableRecordTool,
  deleteAirtableRecordTool,
  getAirtableRecordTool,
  listAirtableRecordsTool,
  updateAirtableRecordTool,
} from "./tools";

const logger = createPinoLogger({
  name: "with-voltagent-actions",
  level: "info",
});

const airtableAgent = new Agent({
  name: "Airtable Actions Assistant",
  instructions:
    "You are an operations assistant who manages Airtable records using the provided actions. List, inspect, create, update, or delete rows exactly as requested.",
  model: openai("gpt-4o-mini"),
  tools: [
    listAirtableRecordsTool,
    createAirtableRecordTool,
    updateAirtableRecordTool,
    deleteAirtableRecordTool,
    getAirtableRecordTool,
  ],
});

async function bootstrap() {
  const actionsMcp = new MCPConfiguration({
    servers: {
      airtable: createVoltOpsMcpServer(),
      composio: createComposio(),
    },
  });

  const voltopsTools = await actionsMcp.getToolsets();

  const mcpActionsAgent = new Agent({
    name: "VoltOps MCP Actions Agent",
    instructions:
      "You orchestrate Airtable syncs exclusively through the VoltOps MCP tools (airtable_create_record, airtable_list_records, etc.). Always pick the appropriate tool and feed it the payload requested by the user.",
    model: openai("gpt-4o-mini"),
    tools: voltopsTools.airtable.getTools(),
  });

  const composioActionsAgent = new Agent({
    name: "Composio MCP Actions Agent",
    instructions:
      "You orchestrate Airtable syncs exclusively through the VoltOps MCP tools (airtable_create_record, airtable_list_records, etc.). Always pick the appropriate tool and feed it the payload requested by the user.",
    model: openai("gpt-4o-mini"),
    tools: voltopsTools.composio.getTools(),
  });

  new VoltAgent({
    agents: {
      airtableAgent,
      mcpActionsAgent,
      composioActionsAgent,
    },
    logger,
    server: honoServer(),
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start VoltAgent with VoltOps actions", { error });
  process.exitCode = 1;
});
