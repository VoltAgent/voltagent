// --- NEW TIMELINE EVENT DEFINITIONS ---

/**
 * Defines the main category of a TimelineEvent.
 */
export type TimelineEventCoreType =
  | "agent"
  | "tool"
  | "memory"
  | "retriever"
  | "workflow"
  | "workflow-step";

/**
 * Defines the operational status of a TimelineEvent.
 * 'idle' is added for consistency with frontend initial states.
 * 'suspended' is added for workflow suspension state.
 */
export type TimelineEventCoreStatus = "idle" | "running" | "completed" | "error" | "suspended";

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
  context?: Record<string, unknown>;
}

// --- Discriminated Union for TimelineEvent ---
// This will be a union of more specific event types.

// Workflow event types removed - now handled by OpenTelemetry
