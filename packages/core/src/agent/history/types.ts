import type { AgentStatus } from "../types";
import type { UsageInfo } from "../providers/base/types";

// History status values used in actual history operations
export type HistoryStatus = "working" | "completed" | "error";

export interface TimelineEvent {
  id: string;
  timestamp: Date | string;
  name: string;
  type: "memory" | "tool" | "agent" | "retriever";
  data: Record<string, any>;
  updatedAt?: Date | string;
  agentState?: Record<string, any>;
}

export interface AgentHistoryEntry {
  id: string;
  timestamp: Date | string;
  status: AgentStatus;
  input: any;
  output?: any;
  events?: TimelineEvent[];
  steps?: any[]; // Could be more specific in the future
  usage?: UsageInfo;
  _sequenceNumber?: number; // Added for event ordering
}
