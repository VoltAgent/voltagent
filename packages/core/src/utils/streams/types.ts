import type { TextStreamPart } from "ai";

/**
 * StreamEventType derived from AI SDK's TextStreamPart
 * This gives us all event types from AI SDK
 */
export type StreamEventType = TextStreamPart<any>["type"];

/**
 * StreamEvent is an extended version of TextStreamPart that includes subagent metadata
 * for event forwarding in supervisor agents
 */
export type StreamEvent = TextStreamPart<any> & {
  // Additional metadata for subagent event forwarding
  subAgentId?: string;
  subAgentName?: string;
  executingAgentId?: string;
  executingAgentName?: string;
  parentAgentId?: string;
  parentAgentName?: string;
  agentPath?: string[];
  timestamp?: string;
};
