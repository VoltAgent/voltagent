import type { VoltAgentTextStreamPart } from "../../agent/subagent/types";

/**
 * StreamEventType derived from VoltAgent's extended AI SDK stream parts.
 */
export type StreamEventType = VoltAgentTextStreamPart<any>["type"];

/**
 * StreamEvent is an extended version of VoltAgentTextStreamPart that includes subagent metadata
 * for event forwarding in supervisor agents
 */
export type StreamEvent = VoltAgentTextStreamPart<any> & {
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
