import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { UIMessage } from "ai";
import type { AgentTool } from "../../tool";
import type { Agent } from "../agent";
import type { AbortError, CancellationError, VoltAgentError } from "../errors";
import type { ToolExecuteOptions } from "../providers/base/types";
import type { AgentOperationOutput, OperationContext } from "../types";

// Argument Object Interfaces (old API restored, adapted for AI SDK types)
export interface OnStartHookArgs {
  agent: Agent;
  context: OperationContext;
}

export interface OnEndHookArgs {
  /** The conversation ID. */
  conversationId: string;
  /** The agent that generated the output. */
  agent: Agent;
  /** The standardized successful output object. Undefined on error. */
  output: AgentOperationOutput | undefined;
  /** The error object if the operation failed. */
  error: VoltAgentError | CancellationError | undefined;
  /** The operation context. */
  context: OperationContext;
}

export interface OnHandoffHookArgs {
  agent: Agent;
  sourceAgent: Agent;
}

export interface OnToolStartHookArgs {
  agent: Agent;
  tool: AgentTool;
  context: OperationContext;
  args: any;
  options?: ToolExecuteOptions;
}

export interface OnToolEndHookArgs {
  agent: Agent;
  tool: AgentTool;
  /** The successful output from the tool. Undefined on error. */
  output: unknown | undefined;
  /** The error if the tool execution failed. */
  error: VoltAgentError | AbortError | undefined;
  context: OperationContext;
  options?: ToolExecuteOptions;
}

export interface OnPrepareMessagesHookArgs {
  /** The messages that will be sent to the LLM (AI SDK UIMessage). */
  messages: UIMessage[];
  /** The raw messages before sanitization (for advanced transformations). */
  rawMessages?: UIMessage[];
  /** The agent instance making the LLM call. */
  agent: Agent;
  /** The operation context containing metadata about the current operation. */
  context: OperationContext;
}

export interface OnPrepareMessagesHookResult {
  /** The transformed messages to send to the LLM. */
  messages?: UIMessage[];
}

export interface OnPrepareModelMessagesHookArgs {
  /** The finalized model messages that will be sent to the provider. */
  modelMessages: ModelMessage[];
  /** The sanitized UI messages that produced the model messages. */
  uiMessages: UIMessage[];
  /** The agent instance making the LLM call. */
  agent: Agent;
  /** The operation context containing metadata about the current operation. */
  context: OperationContext;
}

export interface OnPrepareModelMessagesHookResult {
  /** The transformed model messages to send to the provider. */
  modelMessages?: ModelMessage[];
}

export interface OnErrorHookArgs {
  agent: Agent;
  error: VoltAgentError | AbortError | Error;
  context: OperationContext;
}

export interface OnStepFinishHookArgs {
  agent: Agent;
  step: any;
  context: OperationContext;
}

// Hook Type Aliases (object-arg style)
export type AgentHookOnStart = (args: OnStartHookArgs) => Promise<void> | void;
export type AgentHookOnEnd = (args: OnEndHookArgs) => Promise<void> | void;
export type AgentHookOnHandoff = (args: OnHandoffHookArgs) => Promise<void> | void;
export type AgentHookOnToolStart = (args: OnToolStartHookArgs) => Promise<void> | void;
export type AgentHookOnToolEnd = (args: OnToolEndHookArgs) => Promise<void> | void;
export type AgentHookOnPrepareMessages = (
  args: OnPrepareMessagesHookArgs,
) => Promise<OnPrepareMessagesHookResult> | OnPrepareMessagesHookResult;
export type AgentHookOnPrepareModelMessages = (
  args: OnPrepareModelMessagesHookArgs,
) => Promise<OnPrepareModelMessagesHookResult> | OnPrepareModelMessagesHookResult;
export type AgentHookOnError = (args: OnErrorHookArgs) => Promise<void> | void;
export type AgentHookOnStepFinish = (args: OnStepFinishHookArgs) => Promise<void> | void;

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
  onPrepareModelMessages?: AgentHookOnPrepareModelMessages;
  // Additional (kept for convenience)
  onError?: AgentHookOnError;
  onStepFinish?: AgentHookOnStepFinish;
};

/**
 * Default empty implementation of hook methods.
 */
const defaultHooks: Required<AgentHooks> = {
  onStart: async (_args: OnStartHookArgs) => {},
  onEnd: async (_args: OnEndHookArgs) => {},
  onHandoff: async (_args: OnHandoffHookArgs) => {},
  onToolStart: async (_args: OnToolStartHookArgs) => {},
  onToolEnd: async (_args: OnToolEndHookArgs) => {},
  onPrepareMessages: async (_args: OnPrepareMessagesHookArgs) => ({}),
  onPrepareModelMessages: async (_args: OnPrepareModelMessagesHookArgs) => ({}),
  onError: async (_args: OnErrorHookArgs) => {},
  onStepFinish: async (_args: OnStepFinishHookArgs) => {},
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
    onPrepareModelMessages: hooks.onPrepareModelMessages || defaultHooks.onPrepareModelMessages,
    onError: hooks.onError || defaultHooks.onError,
    onStepFinish: hooks.onStepFinish || defaultHooks.onStepFinish,
  };
}
