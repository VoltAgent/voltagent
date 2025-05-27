// SDK için tip tanımları
// Core'dan gelen tipleri yeniden export ediyoruz
import type {
  NewTimelineEvent,
  BaseEventMetadata,
  AgentStartEventMetadata,
  TimelineEventCoreStatus,
  TimelineEventCoreLevel,
} from "@voltagent/core";

// SDK Options
export interface VoltAgentClientOptions {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  headers?: Record<string, string>;
  timeout?: number;
}

// History ile ilgili tipler
export interface CreateHistoryRequest {
  id?: string;
  agent_id: string;
  userId?: string;
  conversationId?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  completionStartTime?: string;
  model?: string;
  modelParameters?: Record<string, unknown>;
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
  status?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  usage?: Record<string, unknown>;
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

// Core'dan strict event tiplerini kullan
export type TimelineEventCore = NewTimelineEvent;

// --- TYPE-SAFE EVENT INPUT DEFINITIONS ---

// Base input interface for creating events (without required fields that will be auto-generated)
interface BaseEventInput<M = BaseEventMetadata | null> {
  startTime?: string; // Optional - will be auto-generated if not provided
  endTime?: string | null;
  status?: TimelineEventCoreStatus;
  statusMessage?: string | null;
  level?: TimelineEventCoreLevel;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  metadata: M; // Required and strongly typed
  error?: {
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

// Main type-safe event input union - bu artık tek event input tipi
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

export interface Event {
  id: string; // UUID, server tarafından oluşturulmuş olacak
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

// Core'dan spesifik event tiplerini re-export et
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
