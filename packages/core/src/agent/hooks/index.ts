import type { AgentTool } from "../../tool";
import type { Agent } from "../agent";
import type { BaseMessage } from "../providers";
import type { AgentOperationOutput, OperationContext, VoltAgentError } from "../types";

// Argument Object Interfaces
export interface OnStartHookArgs {
  agent: Agent<any>;
  context: OperationContext;
}

export interface OnEndHookArgs {
  /**
   * The conversation ID.
   */
  conversationId: string;
  /**
   * The agent that generated the output.
   */
  agent: Agent<any>;
  /** The standardized successful output object. Undefined on error. */
  output: AgentOperationOutput | undefined;
  /** The VoltAgentError object if the operation failed. Undefined on success. */
  error: VoltAgentError | undefined;
  /** The complete conversation messages including user input and assistant responses (Vercel AI SDK compatible) */
  context: OperationContext;
}

export interface OnHandoffHookArgs {
  agent: Agent<any>;
  source: Agent<any>;
}

export interface OnToolStartHookArgs {
  agent: Agent<any>;
  tool: AgentTool;
  context: OperationContext;
}

export interface OnToolEndHookArgs {
  agent: Agent<any>;
  tool: AgentTool;
  /** The successful output from the tool. Undefined on error. */
  output: unknown | undefined;
  /** The VoltAgentError if the tool execution failed. Undefined on success. */
  error: VoltAgentError | undefined;
  context: OperationContext;
}

export interface OnPrepareMessagesHookArgs {
  /**
   * The messages that will be sent to the LLM.
   * Modify and return this array to transform the messages.
   */
  messages: BaseMessage[];
  /**
   * The agent instance making the LLM call.
   */
  agent: Agent<any>;
  /**
   * The operation context containing metadata about the current operation.
   */
  context: OperationContext;
}

export interface OnPrepareMessagesHookResult {
  /**
   * The transformed messages to send to the LLM.
   * If not provided, the original messages will be used.
   */
  messages?: BaseMessage[];
}

// Hook Type Aliases (using single argument object)
export type AgentHookOnStart = (args: OnStartHookArgs) => Promise<void> | void;
export type AgentHookOnEnd = (args: OnEndHookArgs) => Promise<void> | void;
export type AgentHookOnHandoff = (args: OnHandoffHookArgs) => Promise<void> | void;
export type AgentHookOnToolStart = (args: OnToolStartHookArgs) => Promise<void> | void;
export type AgentHookOnToolEnd = (args: OnToolEndHookArgs) => Promise<void> | void;
export type AgentHookOnPrepareMessages = (
  args: OnPrepareMessagesHookArgs,
) => Promise<OnPrepareMessagesHookResult> | OnPrepareMessagesHookResult;

/**
 * Type definition for agent hooks using single argument objects.
 */
export type AgentHooks = {
  onStart?: AgentHookOnStart;
  onEnd?: AgentHookOnEnd;
  onHandoff?: AgentHookOnHandoff;
  onToolStart?: AgentHookOnToolStart;
  onToolEnd?: AgentHookOnToolEnd;
  onPrepareMessages?: AgentHookOnPrepareMessages;
};

/**
 * Default empty implementation of hook methods.
 */
const defaultHooks: Required<AgentHooks> = {
  // Mark as Required for internal consistency
  onStart: async (_args: OnStartHookArgs) => {},
  onEnd: async (_args: OnEndHookArgs) => {},
  onHandoff: async (_args: OnHandoffHookArgs) => {},
  onToolStart: async (_args: OnToolStartHookArgs) => {},
  onToolEnd: async (_args: OnToolEndHookArgs) => {},
  onPrepareMessages: async (_args: OnPrepareMessagesHookArgs) => ({}),
};

/**
 * Create hooks from an object literal.
 */
export function createHooks(hooks: Partial<AgentHooks> = {}): AgentHooks {
  return {
    onStart: hooks.onStart || defaultHooks.onStart,
    onEnd: hooks.onEnd || defaultHooks.onEnd,
    onHandoff: hooks.onHandoff || defaultHooks.onHandoff,
    onToolStart: hooks.onToolStart || defaultHooks.onToolStart,
    onToolEnd: hooks.onToolEnd || defaultHooks.onToolEnd,
    onPrepareMessages: hooks.onPrepareMessages || defaultHooks.onPrepareMessages,
  };
}
