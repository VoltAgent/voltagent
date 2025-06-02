// Type definitions for SDK
// Re-exporting types from Core
import type {
  NewTimelineEvent,
  BaseEventMetadata,
  AgentStartEventMetadata,
  TimelineEventCoreStatus,
  TimelineEventCoreLevel,
  HistoryStatus,
  UsageInfo,
} from "@voltagent/core";

// SDK Options
export interface VoltAgentClientOptions {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  headers?: Record<string, string>;
  timeout?: number;
}

// History related types
export interface CreateHistoryRequest {
  id?: string;
  agent_id: string;
  userId?: string;
  conversationId?: string;
  startTime?: string;
  endTime?: string;
  status?: HistoryStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  usage?: UsageInfo;
  metadata?: Record<string, unknown>;
  completionStartTime?: string;
  level?: string;
  statusMessage?: string;
  version?: string;
  tags?: string[];
}

export interface UpdateHistoryRequest {
  id: string;
  agent_id?: string;
  userId?: string;
  conversationId?: string;
  startTime?: string;
  endTime?: string;
  status?: HistoryStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  usage?: UsageInfo;
  metadata?: Record<string, unknown>;
  completionStartTime?: string;
  model?: string;
  modelParameters?: Record<string, unknown>;
  level?: string;
  statusMessage?: string;
  version?: string;
}

export interface History {
  id: string;
  name: string;
  projectId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  input?: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

// Use strict event types from Core
export type TimelineEventCore = NewTimelineEvent;

// --- TYPE-SAFE EVENT INPUT DEFINITIONS ---

// Base input interface for creating events (without required fields that will be auto-generated)
interface BaseEventInput<M = BaseEventMetadata | null> {
  startTime?: string; // Optional - will be auto-generated if not provided
  endTime?: string | null;
  status?: TimelineEventCoreStatus;
  level?: TimelineEventCoreLevel;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  metadata: M; // Required and strongly typed
  statusMessage?: {
    message: string;
    stack?: string;
    code?: string | number;
    [key: string]: unknown;
  } | null;
  version?: string | null;
  parentEventId?: string | null;
  tags?: string[] | null;
}

// Tool Event Inputs
export type ToolStartEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "tool:start";
  type: "tool";
};

export type ToolSuccessEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "tool:success";
  type: "tool";
  status?: "completed";
};

export type ToolErrorEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "tool:error";
  type: "tool";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// Agent Event Inputs
export type AgentStartEventInput = BaseEventInput<AgentStartEventMetadata> & {
  name: "agent:start";
  type: "agent";
  input: { input: string | any[] }; // Required for agent start
};

export type AgentSuccessEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "agent:success";
  type: "agent";
  status?: "completed";
};

export type AgentErrorEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "agent:error";
  type: "agent";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// Memory Event Inputs
export type MemoryReadStartEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "memory:read_start";
  type: "memory";
};

export type MemoryReadSuccessEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "memory:read_success";
  type: "memory";
  status?: "completed";
};

export type MemoryReadErrorEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "memory:read_error";
  type: "memory";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

export type MemoryWriteStartEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "memory:write_start";
  type: "memory";
};

export type MemoryWriteSuccessEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "memory:write_success";
  type: "memory";
  status?: "completed";
};

export type MemoryWriteErrorEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "memory:write_error";
  type: "memory";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// Retriever Event Inputs
export type RetrieverStartEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "retriever:start";
  type: "retriever";
};

export type RetrieverSuccessEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "retriever:success";
  type: "retriever";
  status?: "completed";
};

export type RetrieverErrorEventInput = BaseEventInput<BaseEventMetadata> & {
  name: "retriever:error";
  type: "retriever";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// Main type-safe event input union - this is now the single event input type
export type TimelineEventInput =
  | ToolStartEventInput
  | ToolSuccessEventInput
  | ToolErrorEventInput
  | AgentStartEventInput
  | AgentSuccessEventInput
  | AgentErrorEventInput
  | MemoryReadStartEventInput
  | MemoryReadSuccessEventInput
  | MemoryReadErrorEventInput
  | MemoryWriteStartEventInput
  | MemoryWriteSuccessEventInput
  | MemoryWriteErrorEventInput
  | RetrieverStartEventInput
  | RetrieverSuccessEventInput
  | RetrieverErrorEventInput;

export interface AddEventRequest {
  historyId: string;
  event: TimelineEventCore;
}

export interface UpdateEventRequest {
  id: string;
  agent_id?: string;
  start_time?: string;
  end_time?: string;
  status?: TimelineEventCoreStatus;
  status_message?: string;
  level?: TimelineEventCoreLevel;
  version?: string;
  parent_event_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface Event {
  id: string; // UUID, will be generated server-side
  historyId: string;
  name: string;
  type: "agent" | "tool" | "memory" | "retriever";
  startTime: string;
  endTime?: string | null;
  status?: "idle" | "running" | "completed" | "error";
  statusMessage?: string | null;
  level?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
    [key: string]: unknown;
  } | null;
  version?: string | null;
  parentEventId?: string | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// API Responses
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface AgentSuccessOptions {
  output?: any;
  metadata?: Record<string, unknown>;
  usage?: UsageInfo;
}

export interface AgentErrorOptions {
  statusMessage?: Error | any;
  metadata?: Record<string, unknown>;
}

export interface ToolSuccessOptions {
  output?: any;
  metadata?: Record<string, unknown>;
}

export interface ToolErrorOptions {
  statusMessage?: Error | any;
  metadata?: Record<string, unknown>;
}

export interface MemorySuccessOptions {
  output?: any;
  metadata?: Record<string, unknown>;
}

export interface MemoryErrorOptions {
  statusMessage?: Error | any;
  metadata?: Record<string, unknown>;
}

export interface RetrieverSuccessOptions {
  output?: any;
  metadata?: Record<string, unknown>;
}

export interface RetrieverErrorOptions {
  statusMessage?: Error | any;
  metadata?: Record<string, unknown>;
}

// Re-export specific event types from Core
export type {
  ToolStartEvent,
  ToolSuccessEvent,
  ToolErrorEvent,
  AgentStartEvent,
  AgentSuccessEvent,
  AgentErrorEvent,
  MemoryReadStartEvent,
  MemoryReadSuccessEvent,
  MemoryReadErrorEvent,
  MemoryWriteStartEvent,
  MemoryWriteSuccessEvent,
  MemoryWriteErrorEvent,
  RetrieverStartEvent,
  RetrieverSuccessEvent,
  RetrieverErrorEvent,
} from "@voltagent/core";

// === NEW TRACE-BASED SDK TYPES ===

export interface TraceOptions {
  id?: string;
  agentId: string;
  input?: any;
  userId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  completionStartTime?: string;
  startTime?: string;
  version?: string;
  level?: string;
}

export interface TraceEndOptions {
  output?: any;
  status?: HistoryStatus;
  metadata?: Record<string, unknown>;
  usage?: UsageInfo;
}

export interface AgentOptions {
  name: string;
  input?: any;
  instructions?: string;
  metadata?: Omit<AgentStartEventMetadata, "id" | "agentId" | "displayName" | "instructions">;
}

export interface ToolOptions {
  name: string;
  input?: any;
  metadata?: Record<string, unknown>;
}

export interface MemoryOptions {
  name: string;
  input?: any;
  metadata?: Record<string, unknown>;
}

export interface RetrieverOptions {
  name: string;
  input?: any;
  metadata?: Record<string, unknown>;
}

// Context interfaces
export interface TraceContext {
  readonly id: string;
  readonly agentId: string;
  update(data: Partial<UpdateHistoryRequest>): Promise<TraceContext>;
  end(options?: TraceEndOptions): Promise<void>;
  addAgent(options: AgentOptions): Promise<AgentContext>;
  addEvent(event: TimelineEventInput): Promise<EventContext>;
}

export interface AgentContext {
  readonly id: string;
  readonly traceId: string;
  readonly parentId?: string;
  addAgent(options: AgentOptions): Promise<AgentContext>;
  addTool(options: ToolOptions): Promise<ToolContext>;
  addMemory(options: MemoryOptions): Promise<MemoryContext>;
  addRetriever(options: RetrieverOptions): Promise<RetrieverContext>;
  update(data: Omit<UpdateEventRequest, "id">): Promise<void>;
  success(options?: AgentSuccessOptions): Promise<void>;
  error(options: { statusMessage: Error | any } & AgentErrorOptions): Promise<void>;
}

export interface ToolContext {
  readonly id: string;
  readonly parentId: string;
  readonly traceId: string;
  update(data: Omit<UpdateEventRequest, "id">): Promise<void>;
  success(options?: ToolSuccessOptions): Promise<void>;
  error(options: { statusMessage: Error | any } & ToolErrorOptions): Promise<void>;
}

export interface MemoryContext {
  readonly id: string;
  readonly parentId: string;
  readonly traceId: string;
  update(data: Omit<UpdateEventRequest, "id">): Promise<void>;
  success(options?: MemorySuccessOptions): Promise<void>;
  error(options: { statusMessage: Error | any } & MemoryErrorOptions): Promise<void>;
}

export interface RetrieverContext {
  readonly id: string;
  readonly parentId: string;
  readonly traceId: string;
  update(data: Omit<UpdateEventRequest, "id">): Promise<void>;
  success(options?: RetrieverSuccessOptions): Promise<void>;
  error(options: { statusMessage: Error | any } & RetrieverErrorOptions): Promise<void>;
}

export interface EventContext {
  readonly id: string;
  readonly parentId?: string;
  readonly traceId: string;
  update(data: Omit<UpdateEventRequest, "id">): Promise<void>;
  success(
    options?:
      | AgentSuccessOptions
      | ToolSuccessOptions
      | MemorySuccessOptions
      | RetrieverSuccessOptions,
  ): Promise<void>;
  error(
    options: { statusMessage: Error | any } & (
      | AgentErrorOptions
      | ToolErrorOptions
      | MemoryErrorOptions
      | RetrieverErrorOptions
    ),
  ): Promise<void>;
}
