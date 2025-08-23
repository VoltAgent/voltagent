/**
 * WebSocket types for server implementations
 */

import type { AgentHistoryEntry, WorkflowHistoryEntry } from "@voltagent/core";
import type { LogFilter } from "@voltagent/internal";

/**
 * Generic WebSocket interface that works with any WebSocket implementation
 */
export interface IWebSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  on(event: "message", listener: (data: any) => void): void;
  on(event: "close", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
}

/**
 * WebSocket connection info
 */
export interface WebSocketConnectionInfo {
  agentId?: string;
  workflowId?: string;
  type: "agent" | "workflow" | "logs" | "test";
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: string;
  success: boolean;
  data?: any;
  error?: string;
  sequenceNumber?: number;
  pagination?: any;
}

/**
 * Log stream client interface
 */
export interface LogStreamClient {
  ws: IWebSocket;
  filter?: LogFilter;
}

/**
 * WebSocket event handlers
 */
export interface WebSocketEventHandlers {
  onAgentHistoryUpdate?: (
    agentId: string,
    historyEntry: AgentHistoryEntry & { _sequenceNumber?: number },
  ) => void;
  onAgentHistoryCreated?: (agentId: string, historyEntry: AgentHistoryEntry) => void;
  onWorkflowHistoryCreated?: (historyEntry: WorkflowHistoryEntry) => void;
  onWorkflowHistoryUpdate?: (executionId: string, historyEntry: WorkflowHistoryEntry) => void;
}
