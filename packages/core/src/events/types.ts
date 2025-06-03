import type { BaseMessage } from "../agent/providers";

/**
 * Event statuses
 */
export type EventStatus = "idle" | "working" | "completed" | "error";

/**
 * Standard event data interface
 */
export interface StandardEventData {
  // Event status
  status: EventStatus;

  // Timestamp
  timestamp: string;

  // Input data - to be used consistently for all event types
  input?: unknown;

  // Output data - to be used consistently for all event types
  output?: unknown;

  // In case of error
  error?: unknown;

  // Error message (user-friendly message)
  errorMessage?: string;

  // For tool-specific additional information and other custom information
  metadata?: Record<string, unknown>;

  // ID of the agent that originated the event (especially for sub-agent events)
  sourceAgentId?: string;

  // Optional serialized user context at the time of the event
  userContext?: Record<string, unknown>;
}

/**
 * Standard timeline event
 */
export interface StandardTimelineEvent {
  id: string;
  timestamp: Date;
  name: string;
  data: StandardEventData;
  agentId: string;
  historyId: string;
}

// --- NEW TIMELINE EVENT DEFINITIONS ---

/**
 * Defines the main category of a TimelineEvent.
 */
export type TimelineEventCoreType = "agent" | "tool" | "memory" | "retriever";

/**
 * Defines the operational status of a TimelineEvent.
 * 'idle' is added for consistency with frontend initial states.
 */
export type TimelineEventCoreStatus = "idle" | "running" | "completed" | "error";

/**
 * Defines the severity level of a TimelineEvent.
 */
export type TimelineEventCoreLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

/**
 * Usage information for tracking resource consumption
 */
export interface Usage {
  // OpenAI compatible fields
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;

  // Generic measurement fields
  input?: number;
  output?: number;
  total?: number;
  unit?: "TOKENS" | "CHARACTERS" | "MILLISECONDS" | "SECONDS" | "IMAGES";

  // Cost tracking
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;

  // Allow for additional custom fields
  [key: string]: unknown;
}

// --- Metadata Interface ---

/**
 * Base metadata interface with common fields for all timeline events
 */
export interface BaseEventMetadata {
  displayName?: string;
  id: string;
  agentId?: string;
  userContext?: Record<string, unknown>;
}

export type AgentStartEventMetadata = {
  instructions?: string;
  modelParameters?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    system?: string;
    toolChoice?: string;
  };
} & Record<string, unknown>;

export interface AgentSuccessEventMetadata extends BaseEventMetadata {
  usage?: Usage;
}

export interface MemoryEventMetadata extends BaseEventMetadata {
  type?: string;
}

/**
 * Base interface for all Timeline Events.
 * The `metadata` field will be typed more specifically using a discriminated union based on `type` and `name`.
 */
export interface BaseTimelineEvent<M = BaseEventMetadata | null> {
  id: string; // UUID, zorunlu
  name: string; // Event name, e.g., "agent:definition_loaded", "tool:call_start"
  type: TimelineEventCoreType;
  startTime: string; // ISO 8601 Date string
  endTime?: string | null; // ISO 8601 Date string
  status?: TimelineEventCoreStatus;
  statusMessage?: {
    message: string;
    stack?: string;
    code?: string | number;
    [key: string]: unknown; // For additional error details
  };
  level?: TimelineEventCoreLevel; // Default: 'INFO'
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  metadata: M; // Strongly-typed based on 'type' and 'name'
  version?: string | null; // Version of this event's schema/structure
  parentEventId?: string | null; // For hiyerarşik eventler
  traceId: string; // Corresponds to AgentHistoryEntry.id
  tags?: string[] | null;
}

// --- Discriminated Union for TimelineEvent ---
// This will be a union of more specific event types.

// Example specific event types:
export type ToolStartEvent = BaseTimelineEvent<BaseEventMetadata> & {
  name: "tool:start";
  type: "tool";
};

export type ToolSuccessEvent = BaseTimelineEvent<BaseEventMetadata> & {
  name: "tool:success";
  type: "tool";
};

export type ToolErrorEvent = BaseTimelineEvent<BaseEventMetadata> & {
  name: "tool:error";
  type: "tool";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// --- Agent Event Types ---
export type AgentStartEvent = BaseTimelineEvent<AgentStartEventMetadata & BaseEventMetadata> & {
  name: "agent:start";
  type: "agent";
  input: { input: string | BaseMessage[] };
};

export type AgentSuccessEvent = BaseTimelineEvent<AgentSuccessEventMetadata> & {
  name: "agent:success";
  type: "agent";
  status: "completed";
};

export type AgentErrorEvent = BaseTimelineEvent<BaseEventMetadata> & {
  name: "agent:error";
  type: "agent";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// --- Memory Event Types ---
export type MemoryReadStartEvent = BaseTimelineEvent<MemoryEventMetadata> & {
  name: "memory:read_start";
  type: "memory";
};

export type MemoryReadSuccessEvent = BaseTimelineEvent<MemoryEventMetadata> & {
  name: "memory:read_success";
  type: "memory";
  status: "completed";
};

export type MemoryReadErrorEvent = BaseTimelineEvent<MemoryEventMetadata> & {
  name: "memory:read_error";
  type: "memory";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

export type MemoryWriteStartEvent = BaseTimelineEvent<MemoryEventMetadata> & {
  name: "memory:write_start";
  type: "memory";
};

export type MemoryWriteSuccessEvent = BaseTimelineEvent<MemoryEventMetadata> & {
  name: "memory:write_success";
  type: "memory";
  status: "completed";
};

export type MemoryWriteErrorEvent = BaseTimelineEvent<MemoryEventMetadata> & {
  name: "memory:write_error";
  type: "memory";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// --- Retriever Event Types ---
export type RetrieverStartEvent = BaseTimelineEvent<BaseEventMetadata> & {
  name: "retriever:start";
  type: "retriever";
};

export type RetrieverSuccessEvent = BaseTimelineEvent<BaseEventMetadata> & {
  name: "retriever:success";
  type: "retriever";
  status: "completed";
};

export type RetrieverErrorEvent = BaseTimelineEvent<BaseEventMetadata> & {
  name: "retriever:error";
  type: "retriever";
  status: "error";
  level: "ERROR" | "CRITICAL";
};

// The main TimelineEvent type
export type NewTimelineEvent =
  | ToolStartEvent
  | ToolSuccessEvent
  | ToolErrorEvent
  | AgentStartEvent
  | AgentSuccessEvent
  | AgentErrorEvent
  | MemoryReadStartEvent
  | MemoryReadSuccessEvent
  | MemoryReadErrorEvent
  | MemoryWriteStartEvent
  | MemoryWriteSuccessEvent
  | MemoryWriteErrorEvent
  | RetrieverStartEvent
  | RetrieverSuccessEvent
  | RetrieverErrorEvent;
// ... other specific event types will be added here (if any more emerge)
