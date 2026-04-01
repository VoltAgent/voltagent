import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const statusTool = createTool({
  name: "status",
  description: "Return the current time in ISO format",
  parameters: z.object({}),
  async execute() {
    return {
      timestamp: new Date().toISOString(),
    };
  },
});

export const assistant = new Agent({
  id: "supportagent",
  name: "SupportAgent",
  instructions: "Reply with helpful answers and include the current time when relevant.",
  model: "openai/gpt-4o-mini",
  tools: [statusTool],
});

export const tools = { status: statusTool };
