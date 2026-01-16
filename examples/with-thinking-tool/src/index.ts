import { Agent, Memory, type Toolkit, VoltAgent, createReasoningTools } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// Create logger
const logger = createPinoLogger({
  name: "with-thinking-tool",
  level: "info",
});

const reasoningToolkit: Toolkit = createReasoningTools({
  addInstructions: true,
});

const agent = new Agent({
  name: "ThinkingAssistant",
  instructions: `
  You are an AI assistant designed for complex problem-solving and structured reasoning.
  You leverage internal 'think' and 'analyze' tools to methodically work through challenges.

  Your process involves:
  1.  **Understanding:** Using 'think' to clarify the goal, constraints, and break down the problem.
  2.  **Planning:** Again using 'think', outlining sequential steps, identifying information needs, or exploring potential strategies before taking action (like calling other tools).
  3.  **Analyzing:** Employing 'analyze' after gathering information or completing steps to evaluate progress, check if results meet requirements, and decide the next logical move (e.g., continue the plan, revise the plan, conclude).

  Your aim is to provide well-reasoned, accurate, and complete answers by thinking through the process internally.
  `,
  model: "openai/gpt-4o-mini",
  tools: [reasoningToolkit],
  markdown: true,
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
