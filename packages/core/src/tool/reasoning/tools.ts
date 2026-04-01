import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getGlobalLogger } from "../../logger";
import { createTool } from "../index";
import { NextAction, type ReasoningStep, ReasoningStepSchema } from "./types";

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
  id: "reasoning-think",
  name: "think",
  description:
    "Use this tool as a scratchpad to reason about the task and work through it step-by-step. Helps break down problems and track reasoning. Use it BEFORE making other tool calls or generating the final response.",
  parameters: thinkParametersSchema,
  execute: async (args, options): Promise<string> => {
    const { title, thought, action, confidence } = args;
    const system = options?.systemContext;
    const agentId = (system?.get("agentId") as string | undefined) || undefined;
    const historyEntryId = (system?.get("historyEntryId") as string | undefined) || undefined;
    const logger = options?.logger || getGlobalLogger().child({ component: "reasoning-tools" });

    if (!agentId || !historyEntryId) {
      logger.error("Think tool requires agentId and historyEntryId in options");
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
      logger.error("Error processing or emitting thought step", { error });
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
  id: "reasoning-analyze",
  name: "analyze",
  description:
    "Use this tool to analyze the results from a previous reasoning step or tool call and determine the next action.",
  parameters: analyzeParametersSchema,
  execute: async (args, options): Promise<string> => {
    const { title, result, analysis, next_action, confidence } = args;
    const system = options?.systemContext;
    const agentId = (system?.get("agentId") as string | undefined) || undefined;
    const historyEntryId = (system?.get("historyEntryId") as string | undefined) || undefined;
    const logger = options?.logger || getGlobalLogger().child({ component: "reasoning-tools" });

    if (!agentId || !historyEntryId) {
      logger.error("Analyze tool requires agentId and historyEntryId in options");
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
      logger.error("Error processing or emitting analysis step", { error });
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return `Error recording analysis step: ${errorMessage}`;
    }
  },
});
