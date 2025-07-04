import type { Merge } from "type-fest";
import type { z } from "zod";
import type { StreamPart } from "../providers";
import type { ProviderOptions } from "../types";
import { Agent } from "..";

export type SubAgentStreamPart = Merge<
  StreamPart,
  {
    subAgentId: string;
    subAgentName: string;
  }
>;

/**
 * Available methods for subagent execution
 */
export type SubAgentMethod = "streamText" | "generateText" | "streamObject" | "generateObject";

/**
 * Base configuration for a subagent with specific method and options
 */
interface BaseSubAgentConfig {
  /** The agent to be used as a subagent */
  agent: Agent<any>; // Using any to avoid circular dependency
  /** Provider options for the specific method call */
  options?: ProviderOptions;
}

/**
 * Configuration for text-based subagent methods (streamText and generateText)
 */
export interface TextSubAgentConfig extends BaseSubAgentConfig {
  /** The method to use when calling the subagent */
  method: "streamText" | "generateText";
  /** Schema for object generation methods (optional for text methods) */
  schema?: z.ZodType;
}

/**
 * Configuration for object-based subagent methods (streamObject and generateObject)
 */
export interface ObjectSubAgentConfig extends BaseSubAgentConfig {
  /** The method to use when calling the subagent */
  method: "streamObject" | "generateObject";
  /** Schema for object generation methods (required for object methods) */
  schema: z.ZodType;
}

/**
 * Configuration for a subagent with specific method and options
 * Schema is required for object generation methods (streamObject and generateObject)
 */
export type SubAgentConfigObject = TextSubAgentConfig | ObjectSubAgentConfig;

/**
 * Union type for subagent configuration
 * - Direct Agent instance (backward compatibility): defaults to streamText method
 * - SubAgentConfigObject: allows specifying method, schema, and options
 */
export type SubAgentConfig =
  | Agent<any> // Direct Agent instance for backward compatibility (defaults to streamText)
  | SubAgentConfigObject; // New configuration object with explicit method

/**
 * Helper function to create a subagent configuration with specific method and options
 * This provides a convenient API for configuring subagents with different execution methods
 *
 * @param config - The configuration object containing agent, method, and optional schema/options
 * @returns A SubAgentConfigObject that can be used in the Agent constructor
 *
 * @example
 * // Backward compatible - direct agent (uses streamText by default)
 * const supervisorAgent = new Agent({
 *   name: "Supervisor",
 *   instructions: "...",
 *   llm: myLLM,
 *   subAgents: [myAgent] // <- This still works! Uses streamText by default
 * });
 *
 * @example
 * // New API - mixed usage
 * const supervisorAgent = new Agent({
 *   name: "Supervisor",
 *   instructions: "...",
 *   llm: myLLM,
 *   subAgents: [
 *     myAgent, // <- Direct agent, uses streamText
 *     createSubagent({
 *       agent: myAgent,
 *       method: 'generateObject',
 *       schema: z.object({ result: z.string() }) // <- Schema is required for generateObject
 *     })
 *   ]
 * });
 *
 * @example
 * // Create a subagent that uses generateText with custom options
 * createSubagent({
 *   agent: myAgent,
 *   method: 'generateText',
 *   options: { temperature: 0.7, maxTokens: 1000 }
 *   // schema is optional for generateText
 * })
 *
 * @example
 * // Create a subagent that uses streamObject - schema is required
 * createSubagent({
 *   agent: myAgent,
 *   method: 'streamObject',
 *   schema: z.object({
 *     progress: z.number(),
 *     status: z.string()
 *   }),
 *   options: { temperature: 0.2 }
 * })
 */
export function createSubagent(config: TextSubAgentConfig): TextSubAgentConfig;
export function createSubagent(config: ObjectSubAgentConfig): ObjectSubAgentConfig;
export function createSubagent(config: SubAgentConfigObject): SubAgentConfigObject {
  return config;
}
