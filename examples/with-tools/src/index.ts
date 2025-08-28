import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// Import all the tools
import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

// Create logger
const logger = createPinoLogger({
  name: "with-tools",
  level: "info",
});

// Create the agent with tools
const agent = new Agent({
  name: "Assistant with Tools",
  instructions: "A helpful assistant that can use tools to provide better answers",
  model: openai("gpt-4o-mini"),
  // TODO: Fix memory type compatibility
  // memory: new LibSQLStorage({
  //   url: "file:./.voltagent/memory.db",
  //   logger: logger.child({ component: "libsql" }),
  // }),
  tools: [checkCalendarTool, addCalendarEventTool, searchTool],
  memory: new LibSQLStorage({}),
});

// Test dynamic tool addition
agent.addTools([weatherTool]);

// Initialize the VoltAgent with server
new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});

(async () => {
  const response = await agent.streamText("istanbulun hava durumu nedir?");

  for await (const chunk of response.fullStream) {
    console.log("Subagent response:", (chunk as any).text);
  }

  for await (const chunk of response.toUIMessageStream({
    onFinish: ({ messages }) => {
      console.log("Save messages:", { messages });
    },
  })) {
    console.log("Subagent response2:", { chunk });
  }

  const response2 = await agent.generateText("istanbulun hava durumu nedir?");

  const hede = response2.text;

  console.log(hede);
})();
