import { openai } from "@ai-sdk/openai";
import { Agent, InMemoryStorage, VoltAgent, createTool } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create logger
const logger = createPinoLogger({
  name: "with-subagents",
  level: "info",
});

// Create LibSQL storage for persistent memory
/* const storage = new LibSQLStorage({
  url: "file:./.voltagent/memory.db",
  logger: logger.child({ component: "libsql" }),
}); */

const memory = new InMemoryStorage();

const uppercaseTool = createTool({
  name: "uppercase",
  description: "Converts text to uppercase",
  parameters: z.object({
    text: z.string().describe("The text to convert to uppercase"),
  }),
  execute: async ({ text }: { text: string }) => {
    return { result: text.toUpperCase() };
  },
});

// Create two simple specialized subagents
const contentCreatorAgent = new Agent({
  name: "ContentCreator",
  instructions: "Creates short text content on requested topics",
  model: openai("gpt-4o-mini"),
  memory: memory,
});

const formatterAgent = new Agent({
  name: "Formatter",
  instructions: "Formats and styles text content",
  model: openai("gpt-4o-mini"),
  tools: [uppercaseTool],
  memory: memory,
});

// Create a simple supervisor agent
const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions: "Coordinates between content creation and formatting agents",
  model: openai("gpt-4o-mini"),
  subAgents: [contentCreatorAgent, formatterAgent],
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["error"],
    },
  },
  memory: memory,
});

// Create VoltAgent with the new server provider pattern
new VoltAgent({
  agents: {
    supervisorAgent,
  },
  logger,
  // Use the new honoServer factory with configuration
  server: honoServer(),
});

setTimeout(() => {
  new VoltAgent({
    agents: {
      supervisorAgent,
    },
    logger,
    // Use the new honoServer factory with configuration
    server: honoServer(),
  });
}, 2000);

/* logger.error("VoltAgent initialized with subagents");

(async () => {
  // Stream with full event details
  const result = await supervisorAgent.streamText(
    "3 kelimelik bir hikaye yaz ve format agent ile uppercase yap",
    {
      userId: "1",
      conversationId: "2",
    },
  );

  // Process different event types
  for await (const event of result.fullStream) {
    switch (event.type) {
      case "tool-call":
        console.log("Tool called:", event);
        break;
      case "tool-result":
        console.log("Tool result:", event);
        break;
      case "text-delta":
        // Only appears if included in types array
        console.log("Text:", event);
        break;
    }
  }

  const conversations = await memory.getConversationsByUserId("1");

  const messages = await memory.getUIMessages("1", "2");
})();
 */
