import type { Output, StreamTextResult, TextStreamPart } from "ai";
import type { z } from "zod";
import type { Agent } from "../agent";
import type {
  GenerateObjectOptions,
  GenerateTextOptions,
  StreamObjectOptions,
  StreamTextOptions,
} from "../agent";

/**
 * Available methods for subagent execution
 */
export type SubAgentMethod = "streamText" | "generateText" | "streamObject" | "generateObject";

/**
 * Base configuration for a subagent with specific method and options
 */
interface BaseSubAgentConfig<TAgent extends Agent = Agent> {
  /** The Agent instance to be used as a subagent */
  agent: TAgent;
}

/**
 * Configuration for streamText method
 */
export interface StreamTextSubAgentConfig<TAgent extends Agent = Agent>
  extends BaseSubAgentConfig<TAgent> {
  /** The method to use when calling the subagent */
  method: "streamText";
  /** Options for streamText method */
  options?: StreamTextOptions;
}

/**
 * Configuration for generateText method
 */
export interface GenerateTextSubAgentConfig<TAgent extends Agent = Agent>
  extends BaseSubAgentConfig<TAgent> {
  /** The method to use when calling the subagent */
  method: "generateText";
  /** Options for generateText method */
  options?: GenerateTextOptions;
}

/**
 * Configuration for streamObject method
 */
export interface StreamObjectSubAgentConfig<
  TAgent extends Agent = Agent,
  TSchema extends z.ZodType = z.ZodType,
> extends BaseSubAgentConfig<TAgent> {
  /** The method to use when calling the subagent */
  method: "streamObject";
  /** Schema for object generation (required) */
  schema: TSchema;
  /** Options for streamObject method */
  options?: StreamObjectOptions;
}

/**
 * Configuration for generateObject method
 */
export interface GenerateObjectSubAgentConfig<
  TAgent extends Agent = Agent,
  TSchema extends z.ZodType = z.ZodType,
> extends BaseSubAgentConfig<TAgent> {
  /** The method to use when calling the subagent */
  method: "generateObject";
  /** Schema for object generation (required) */
  schema: TSchema;
  /** Options for generateObject method */
  options?: GenerateObjectOptions;
}

/**
 * Union type for all subagent configurations
 * Each configuration is type-safe with its specific options and requirements
 */
export type SubAgentConfig<TAgent extends Agent = Agent> =
  | StreamTextSubAgentConfig<TAgent>
  | GenerateTextSubAgentConfig<TAgent>
  | StreamObjectSubAgentConfig<TAgent>
  | GenerateObjectSubAgentConfig<TAgent>
  | TAgent; // Direct Agent instance (defaults to streamText)

/**
 * Helper function to create a type-safe subagent configuration
 *
 * @example
 * // Direct Agent instance (uses streamText by default)
 * const supervisorAgent = new Agent({
 *   name: "Supervisor",
 *   instructions: "...",
 *   model: myModel,
 *   subAgents: [myAgent]
 * });
 *
 * @example
 * // Using streamText with options
 * const subagent = createSubagent({
 *   agent: myAgent,
 *   method: 'streamText',
 *   options: { temperature: 0.7, maxTokens: 1000 }
 * });
 *
 * @example
 * // Using generateObject with schema
 * const subagent = createSubagent({
 *   agent: myAgent,
 *   method: 'generateObject',
 *   schema: z.object({ result: z.string() }),
 *   options: { temperature: 0.2 }
 * });
 */
export function createSubagent<TAgent extends Agent>(
  config: StreamTextSubAgentConfig<TAgent>,
): StreamTextSubAgentConfig<TAgent>;
export function createSubagent<TAgent extends Agent>(
  config: GenerateTextSubAgentConfig<TAgent>,
): GenerateTextSubAgentConfig<TAgent>;
export function createSubagent<TAgent extends Agent, TSchema extends z.ZodType>(
  config: StreamObjectSubAgentConfig<TAgent, TSchema>,
): StreamObjectSubAgentConfig<TAgent, TSchema>;
export function createSubagent<TAgent extends Agent, TSchema extends z.ZodType>(
  config: GenerateObjectSubAgentConfig<TAgent, TSchema>,
): GenerateObjectSubAgentConfig<TAgent, TSchema>;
export function createSubagent<TAgent extends Agent>(
  config: SubAgentConfig<TAgent>,
): SubAgentConfig<TAgent> {
  return config;
}

export interface InputGuardrailBlockedEventData {
  code: "GUARDRAIL_INPUT_BLOCKED";
  reason: "input_guardrail_blocked";
  message: string;
  guardrailId?: string;
  guardrailName?: string;
  severity?: "info" | "warning" | "critical";
}

export interface InputGuardrailBlockedStreamPart {
  type: "input-guardrail-blocked";
  data: InputGuardrailBlockedEventData;
  messageId?: string;
}

type VoltAgentStreamMetadata = {
  /**
   * Optional response message identifier (carried on start/step chunks).
   */
  messageId?: string;

  /**
   * Optional identifier for the subagent that generated this event
   */
  subAgentId?: string;

  /**
   * Optional identifier for the agent that actually executed the step
   * (same as subAgentId for first-level handoffs)
   */
  executingAgentId?: string;

  /**
   * Optional name of the subagent that generated this event
   */
  subAgentName?: string;

  /**
   * Optional name of the agent that actually executed the step
   * (same as subAgentName for first-level handoffs)
   */
  executingAgentName?: string;

  /**
   * Parent agent reference when forwarded through supervisors
   */
  parentAgentId?: string;
  parentAgentName?: string;

  /**
   * Ordered list of agent names from supervisor -> executing agent
   */
  agentPath?: string[];
};

/**
 * Extended TextStreamPart type that includes optional VoltAgent metadata and
 * custom VoltAgent stream events.
 *
 * @template TOOLS - The tool set type parameter from ai-sdk
 */
export type VoltAgentTextStreamPart<TOOLS extends Record<string, any> = Record<string, any>> = (
  | TextStreamPart<TOOLS>
  | InputGuardrailBlockedStreamPart
) &
  VoltAgentStreamMetadata;

/**
 * Extended StreamTextResult that uses VoltAgentTextStreamPart for fullStream.
 * This maintains compatibility with ai-sdk while adding subagent metadata support.
 *
 * @template TOOLS - The tool set type parameter
 */
export type VoltAgentStreamTextResult<
  TOOLS extends Record<string, any> = Record<string, any>,
  OUTPUT extends Output.Output<any, any, any> = Output.Output<any, any, any>,
> = Omit<StreamTextResult<TOOLS, any, OUTPUT>, "stream"> & {
  /**
   * Stream with subagent metadata support.
   */
  readonly stream: AsyncIterable<VoltAgentTextStreamPart<TOOLS>>;
  /** @deprecated Use `stream` instead. */
  readonly fullStream: AsyncIterable<VoltAgentTextStreamPart<TOOLS>>;
} & Record<never, OUTPUT>;
