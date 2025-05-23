// SDK için tip tanımları
// Core'dan gelen tipleri yeniden export ediyoruz
import type { NewTimelineEvent } from "@voltagent/core/src/events/types";

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

// SDK için daha esnek ve intellisense-friendly bir interface
export interface TimelineEventInput {
  name: string; // Event name, e.g., "agent:start", "tool:call_start"
  type: "agent" | "tool" | "memory" | "retriever";
  startTime?: string; // ISO 8601 Date string, opsiyonel - server tarafında set edilebilir
  endTime?: string | null; // ISO 8601 Date string
  status?: "idle" | "running" | "completed" | "error";
  statusMessage?: string | null;
  level?: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"; // Default: 'INFO'
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
    [key: string]: unknown; // For additional error details
  } | null;
  version?: string | null; // Version of this event's schema/structure
  parentEventId?: string | null; // For hierarchical events
  tags?: string[] | null;
}

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
} from "@voltagent/core/src/events/types";
