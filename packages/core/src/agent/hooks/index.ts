import type { UIMessage } from "ai";
import type { Tool } from "../../tool";
import type { AgentContext } from "../agent";

/**
 * Type definition for agent hooks matching agent.ts implementation.
 * These hooks use positional arguments instead of single argument objects.
 */
export type AgentHooks = {
  onStart?: (context: AgentContext) => Promise<void> | void;
  onEnd?: (context: AgentContext, result: any, error?: Error) => Promise<void> | void;
  onError?: (context: AgentContext, error: Error) => Promise<void> | void;
  onStepFinish?: (step: any) => Promise<void> | void;
  onPrepareMessages?: (
    messages: UIMessage[],
    context: AgentContext,
  ) => Promise<{ messages: UIMessage[] }> | { messages: UIMessage[] };
  onHandoff?: (context: AgentContext) => Promise<void> | void;
  onToolStart?: (context: AgentContext, tool: Tool) => Promise<void> | void;
  onToolEnd?: (context: AgentContext, tool: Tool, output: any, error?: any) => Promise<void> | void;
};

/**
 * Default empty implementation of hook methods.
 */
const defaultHooks: Required<AgentHooks> = {
  // Mark as Required for internal consistency
  onStart: async () => {},
  onEnd: async () => {},
  onError: async () => {},
  onStepFinish: async () => {},
  onHandoff: async () => {},
  onToolStart: async () => {},
  onToolEnd: async () => {},
  onPrepareMessages: async (_messages, _context) => ({ messages: _messages }),
};

/**
 * Create hooks from an object literal.
 */
export function createHooks(hooks: Partial<AgentHooks> = {}): AgentHooks {
  return {
    onStart: hooks.onStart || defaultHooks.onStart,
    onEnd: hooks.onEnd || defaultHooks.onEnd,
    onError: hooks.onError || defaultHooks.onError,
    onStepFinish: hooks.onStepFinish || defaultHooks.onStepFinish,
    onHandoff: hooks.onHandoff || defaultHooks.onHandoff,
    onToolStart: hooks.onToolStart || defaultHooks.onToolStart,
    onToolEnd: hooks.onToolEnd || defaultHooks.onToolEnd,
    onPrepareMessages: hooks.onPrepareMessages || defaultHooks.onPrepareMessages,
  };
}
