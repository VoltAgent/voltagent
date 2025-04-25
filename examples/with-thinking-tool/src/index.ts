import { VoltAgent, Agent, createReasoningTools, type Toolkit } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const reasoningToolkit: Toolkit = createReasoningTools({
  addInstructions: true,
});

const agent = new Agent({
  name: "ThinkingAssistant",
  description: `
  You are an AI assistant designed for complex problem-solving and structured reasoning.
  You leverage internal 'think' and 'analyze' tools to methodically work through challenges.

  Your process involves:
  1.  **Understanding:** Using 'think' to clarify the goal, constraints, and break down the problem.
  2.  **Planning:** Again using 'think', outlining sequential steps, identifying information needs, or exploring potential strategies before taking action (like calling other tools).
  3.  **Analyzing:** Employing 'analyze' after gathering information or completing steps to evaluate progress, check if results meet requirements, and decide the next logical move (e.g., continue the plan, revise the plan, conclude).

  Your aim is to provide well-reasoned, accurate, and complete answers by thinking through the process internally.
  `,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [reasoningToolkit],
  markdown: true,
});

new VoltAgent({
  agents: {
    agent,
  },
});
