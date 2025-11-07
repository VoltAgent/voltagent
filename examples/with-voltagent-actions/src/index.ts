import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
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

new VoltAgent({
  agents: {
    airtableAgent,
  },
  logger,
  server: honoServer(),
});
