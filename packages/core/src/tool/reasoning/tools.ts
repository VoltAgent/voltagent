import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { createTool } from "..";
import type { ToolExecuteOptions } from "../../agent/providers/base/types";
import {
  NextAction,
  type ReasoningStep,
  ReasoningStepSchema,
  type ReasoningToolExecuteOptions,
} from "./types";

const REASONING_INSTRUCTIONS = `
You have access to the 'think' and 'analyze' tools to work through problems step-by-step and structure your thought process. You should ALWAYS 'think' before making tool calls or generating a response.

1.  **Think** (scratchpad):
    *   Purpose: Use the 'think' tool as a scratchpad to break down complex problems, outline steps, and decide on immediate actions within your reasoning flow. Use this to structure your internal monologue.
    *   Usage: Call 'think' BEFORE making other tool calls or generating a response. Explain your reasoning and specify the intended action (e.g., "make a tool call", "perform calculation", "ask clarifying question").

2.  **Analyze** (evaluation):
    *   Purpose: Evaluate the result of a think step or a set of tool calls. Assess if the result is expected, sufficient, or requires further investigation.
    *   Usage: Call 'analyze' AFTER a set of tool calls or a thought process. Determine the 'next_action' based on your analysis: 'continue' (more reasoning needed), 'validate' (seek external confirmation/validation if possible), or 'final_answer' (ready to conclude).
    *   Explain your reasoning highlighting whether the result is correct/sufficient.

## IMPORTANT GUIDELINES
*   **Always Think First:** You should use the 'think' tool before making other tool calls or generating a response, unless the request is extremely simple.
*   **Iterate to Solve:** Use the 'think' and 'analyze' tools iteratively to build a clear reasoning path. The typical flow is Think -> [Tool Calls if needed] -> [Analyze if needed] -> ... -> final_answer. Repeat this cycle until you reach a satisfactory conclusion.
*   **Make multiple tool calls in parallel:** After a 'think' step, you can make multiple tool calls in parallel if needed.
*   **Keep Thoughts Internal:** The reasoning steps (thoughts and analyses) are for your internal process only. Do not share them directly with the user unless asked to explain your reasoning.
*   **Conclude Clearly:** When your analysis determines the 'next_action' is 'final_answer', provide a concise and accurate final answer to the user based on your reasoning steps.
`;

// --- Think Tool ---

const thinkParametersSchema = z.object({
  title: z.string().describe("A concise title for this thinking step"),
  thought: z.string().describe("Your detailed thought or reasoning for this step"),
  action: z
    .string()
    .optional()
    .describe("Optional: What you plan to do next based on this thought"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.8)
    .describe("Optional: How confident you are about this thought (0.0 to 1.0)"),
});

export const thinkTool = createTool({
  name: "think",
  description:
    "Use this tool as a scratchpad to reason about the task and work through it step-by-step. Helps break down problems and track reasoning. Use it BEFORE making other tool calls or generating the final response.",
  parameters: thinkParametersSchema,
  execute: async (args, options?: ToolExecuteOptions): Promise<string> => {
    const { title, thought, action, confidence } = args;
    const reasoningOptions = options as ReasoningToolExecuteOptions | undefined;
    const { agentId, historyEntryId } = reasoningOptions || {};

    if (!agentId || !historyEntryId) {
      console.error("Think tool requires agentId and historyEntryId in options.");
      return "Error: Missing required agentId or historyEntryId in execution options.";
    }

    const step: ReasoningStep = {
      id: uuidv4(),
      type: "thought",
      title,
      reasoning: thought,
      action,
      confidence,
      timestamp: new Date().toISOString(),
      agentId,
      historyEntryId,
      // result and next_action are not applicable for 'thought'
    };

    try {
      ReasoningStepSchema.parse(step);

      return `Thought step "${title}" recorded successfully.`;
    } catch (error) {
      console.error("Error processing or emitting thought step:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return `Error recording thought step: ${errorMessage}`;
    }
  },
});

// --- Analyze Tool ---

const analyzeParametersSchema = z.object({
  title: z.string().describe("A concise title for this analysis step"),
  result: z
    .string()
    .describe("The outcome or result of the previous action/thought being analyzed"),
  analysis: z.string().describe("Your analysis of the result"),
  next_action: z
    .nativeEnum(NextAction)
    .describe(
      `What to do next based on the analysis: "${NextAction.CONTINUE}", "${NextAction.VALIDATE}", or "${NextAction.FINAL_ANSWER}"`,
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.8)
    .describe("Optional: How confident you are in this analysis (0.0 to 1.0)"),
});

export const analyzeTool = createTool({
  name: "analyze",
  description:
    "Use this tool to analyze the results from a previous reasoning step or tool call and determine the next action.",
  parameters: analyzeParametersSchema,
  execute: async (args, options?: ToolExecuteOptions): Promise<string> => {
    const { title, result, analysis, next_action, confidence } = args;
    const reasoningOptions = options as ReasoningToolExecuteOptions | undefined;
    const { agentId, historyEntryId } = reasoningOptions || {};

    if (!agentId || !historyEntryId) {
      console.error("Analyze tool requires agentId and historyEntryId in options.");
      return "Error: Missing required agentId or historyEntryId in execution options.";
    }

    const step: ReasoningStep = {
      id: uuidv4(),
      type: "analysis",
      title,
      reasoning: analysis,
      result,
      next_action, // Already validated as NextAction enum by Zod
      confidence,
      timestamp: new Date().toISOString(),
      agentId,
      historyEntryId,
      // action is not applicable for 'analysis'
    };

    try {
      ReasoningStepSchema.parse(step);

      return `Analysis step "${title}" recorded successfully. Next action: ${next_action}.`;
    } catch (error) {
      console.error("Error processing or emitting analysis step:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return `Error recording analysis step: ${errorMessage}`;
    }
  },
});
