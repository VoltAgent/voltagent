import { z } from "zod";
import type { ToolExecuteOptions } from "../../agent/providers/base/types";

/**
 * Enum defining the next action to take after a reasoning step.
 */
export enum NextAction {
  CONTINUE = "continue",
  VALIDATE = "validate",
  FINAL_ANSWER = "final_answer",
}

/**
 * Zod schema for the ReasoningStep data structure.
 */
export const ReasoningStepSchema = z.object({
  id: z.string().uuid(), // Unique ID for the step
  type: z.enum(["thought", "analysis"]), // Type of step
  title: z.string(), // Concise title for the step
  reasoning: z.string(), // The detailed thought or analysis
  action: z.string().optional(), // The action planned based on the thought (for 'thought' type)
  result: z.string().optional(), // The result being analyzed (for 'analysis' type)
  next_action: z.nativeEnum(NextAction).optional(), // What to do next (for 'analysis' type)
  confidence: z.number().min(0).max(1).optional().default(0.8), // Confidence level
  timestamp: z.string().datetime(), // Timestamp of the step creation
  historyEntryId: z.string(), // Link to the main history entry
  agentId: z.string(), // ID of the agent performing the step
});

/**
 * TypeScript type inferred from the ReasoningStepSchema.
 */
export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;

/**
 * Options specific to reasoning tool execution, extending base ToolExecuteOptions.
 */
export interface ReasoningToolExecuteOptions extends ToolExecuteOptions {
  agentId: string;
  historyEntryId: string;
}
