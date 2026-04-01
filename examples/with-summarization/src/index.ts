import { Agent, Memory, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const logger = createPinoLogger({
  name: "with-summarization",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  generateTitle: true,
});

const statusTool = createTool({
  name: "summarization_status",
  description: "Return a lightweight status string for tool-call testing.",
  parameters: z.object({
    note: z.string().optional().describe("Optional note to include in the status"),
  }),
  execute: async ({ note }: { note?: string }) => {
    return `status=ok${note ? ` note=${note}` : ""}`;
  },
});

const agent = new Agent({
  name: "Summarization Agent",
  instructions: "You are a helpful assistant.",
  model: "openai/gpt-5.1",
  memory,
  tools: [statusTool],
  summarization: {
    triggerTokens: 600,
    keepMessages: 6,
    maxOutputTokens: 400,
  },
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});

const buildLongBlock = (topic: string) =>
  Array.from({ length: 8 }, (_, index) => {
    const section = index + 1;
    return [
      `Section ${section}: ${topic}`,
      "Provide a concise overview with key facts, constraints, and open questions.",
      "Include any decisions and follow-up items that should remain in memory.",
      "This text is intentionally verbose to trigger summarization quickly.",
    ].join(" ");
  }).join("\n\n");

(async () => {
  const conversationId = "summarization-demo";
  const userId = "demo-user";
  const providerOptions = {
    openai: {
      reasoningEffort: "medium",
    },
  } as const;

  await agent.generateText(
    `We are drafting a product brief. Start with an outline.\n\n${buildLongBlock("Product scope")}`,
    { conversationId, userId, providerOptions },
  );

  await agent.generateText(
    `Here is additional context. Summarize constraints and risks.\n\n${buildLongBlock(
      "Constraints and risks",
    )}`,
    { conversationId, userId, providerOptions },
  );

  await agent.generateText(
    `Now provide a short summary of the plan and list next steps.\n\n${buildLongBlock(
      "Next steps",
    )}`,
    { conversationId, userId, providerOptions },
  );

  try {
    const toolResult = await agent.generateText(
      "Call the summarization_status tool with note 'post-summarization' and then reply with its result only.",
      {
        conversationId,
        userId,
        providerOptions,
        toolChoice: { type: "tool", toolName: "summarization_status" },
      },
    );

    logger.info("Tool call completed", {
      text: toolResult.text,
      toolCalls: toolResult.toolCalls,
      toolResults: toolResult.toolResults,
    });
  } catch (error) {
    logger.error("Tool call failed after summarization", { error });
    throw error;
  }
})();
