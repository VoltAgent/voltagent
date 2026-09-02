import type { Agent } from "@voltagent/core";
import type {
  A2AServerDeps as BaseA2AServerDeps,
  A2AServerLike as BaseA2AServerLike,
  A2AServerMetadata as BaseA2AServerMetadata,
} from "@voltagent/internal/a2a";
import type { z } from "zod";
import type {
  A2AMessagePartSchema,
  A2AMessagePartTextSchema,
  A2AMessageSchema,
  TaskArtifactPartSchema,
  TaskArtifactSchema,
  TaskRecordSchema,
  TaskStateSchema,
  TaskStatusSchema,
} from "./schemas";

/** Identifier for a JSON-RPC request — a string, number, or `null` for notifications. */
export type A2AJsonRpcId = string | number | null;

/** Standard JSON-RPC 2.0 error object returned inside a {@link JsonRpcResponse}. */
export interface JsonRpcError<Data = unknown> {
  code: number;
  message: string;
  data?: Data;
}

/** Standard JSON-RPC 2.0 response envelope. */
export interface JsonRpcResponse<Result = unknown, ErrorData = unknown> {
  jsonrpc: "2.0";
  id: A2AJsonRpcId;
  result?: Result;
  error?: JsonRpcError<ErrorData> | null;
}

/** Wrapper around an async generator that yields {@link JsonRpcResponse} objects for streaming calls. */
export interface JsonRpcStream<Result = unknown, ErrorData = unknown> {
  kind: "stream";
  id: A2AJsonRpcId;
  stream: AsyncGenerator<JsonRpcResponse<Result, ErrorData>>;
}

/** Discriminated union of a single {@link JsonRpcResponse} or a {@link JsonRpcStream}. */
export type JsonRpcHandlerResult<Result = unknown, ErrorData = unknown> =
  | JsonRpcResponse<Result, ErrorData>
  | JsonRpcStream<Result, ErrorData>;

/** Incoming JSON-RPC 2.0 request envelope. */
export interface JsonRpcRequest<Params = unknown> {
  jsonrpc: "2.0";
  id: A2AJsonRpcId;
  method: string;
  params?: Params;
}

/** The set of valid task lifecycle states. Derived from {@link TaskStateSchema}. */
export type TaskState = z.infer<typeof TaskStateSchema>;

/** A text-only message part. Derived from {@link A2AMessagePartTextSchema}. */
export type A2AMessagePartText = z.infer<typeof A2AMessagePartTextSchema>;

/** Union of all message part kinds. Derived from {@link A2AMessagePartSchema}. */
export type A2AMessagePart = z.infer<typeof A2AMessagePartSchema>;

/** A single message exchanged between user and agent. Derived from {@link A2AMessageSchema}. */
export type A2AMessage = z.infer<typeof A2AMessageSchema>;

/** Current status of a task including lifecycle state and timestamp. Derived from {@link TaskStatusSchema}. */
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/** A text-only artifact part. Derived from {@link TaskArtifactPartSchema}. */
export type TaskArtifactPart = z.infer<typeof TaskArtifactPartSchema>;

/** An artifact produced by an agent during task execution. Derived from {@link TaskArtifactSchema}. */
export type TaskArtifact = z.infer<typeof TaskArtifactSchema>;

/** A complete task record including status, history, and optional artifacts. Derived from {@link TaskRecordSchema}. */
export type TaskRecord = z.infer<typeof TaskRecordSchema>;

/** Persistence layer for loading and saving {@link TaskRecord} instances keyed by agent and task ID. */
export interface TaskStore {
  load(params: { agentId: string; taskId: string }): Promise<TaskRecord | null>;
  save(params: { agentId: string; data: TaskRecord }): Promise<void>;
}

/** Per-request context forwarded to agent invocations and filter functions. */
export interface A2ARequestContext {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  requestUrl?: string;
}

/** Parameters passed to an {@link A2AFilterFunction} for filtering a list of items. */
export interface A2AFilterParams<T> {
  items: T[];
  context?: A2ARequestContext;
}

/** Callback that filters a list of items (e.g. agents) based on the current request context. */
export type A2AFilterFunction<T> = (params: A2AFilterParams<T>) => T[];

/** Parameters for the `message/send` and `message/stream` JSON-RPC methods. */
export interface MessageSendParams {
  id?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  historyLength?: number;
  message: A2AMessage;
}

/** Parameters for the `tasks/get` JSON-RPC method. */
export interface TaskQueryParams {
  id: string;
  historyLength?: number;
  metadata?: Record<string, unknown>;
}

/** Parameters for the `tasks/cancel` JSON-RPC method. */
export interface TaskIdParams {
  id: string;
  metadata?: Record<string, unknown>;
}

/** Result of a `message/send` or `message/stream` call — the updated {@link TaskRecord}. */
export type MessageSendResult = TaskRecord;
/** Result of a `tasks/get` call — the requested {@link TaskRecord}. */
export type TaskGetResult = TaskRecord;
/** Result of a `tasks/cancel` call — the canceled {@link TaskRecord}. */
export type TaskCancelResult = TaskRecord;

/** Configuration supplied to the {@link A2AServer} constructor. */
export interface A2AServerConfig {
  id?: string;
  name: string;
  version: string;
  description?: string;
  provider?: {
    organization?: string;
    url?: string;
  };
  agents?: Record<string, Agent>;
  filterAgents?: A2AFilterFunction<Agent>;
  /**
   * Optional task store. When provided, takes precedence over `deps.taskStore` passed to
   * `A2AServer.initialize()`. Falls back to an in-memory store if neither is set.
   */
  taskStore?: TaskStore;
}

/** Metadata describing an {@link A2AServer} instance (name, version, etc.). */
export interface A2AServerMetadata extends BaseA2AServerMetadata {}

/** Runtime dependencies injected into {@link A2AServer} via `initialize()`. */
export interface A2AServerDeps extends BaseA2AServerDeps<Agent, TaskStore> {
  taskStore?: TaskStore;
}

/** Minimal public surface of an A2A server, used by server-provider adapters. */
export interface A2AServerLike extends BaseA2AServerLike<Agent> {
  getAgentCard?(agentId: string, context?: A2ARequestContext): AgentCard;
  handleRequest?(
    agentId: string,
    request: JsonRpcRequest,
    context?: A2ARequestContext,
  ): Promise<JsonRpcHandlerResult>;
}

/** Factory function that creates a new {@link A2AServerLike} instance on demand. */
export type A2AServerFactory<T extends A2AServerLike = A2AServerLike> = () => T;

/** A single skill advertised by an agent in its {@link AgentCard}. */
export interface AgentCardSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

/** Public metadata card describing an agent's capabilities, skills, and endpoint URL. */
export interface AgentCard {
  name: string;
  description?: string;
  url: string;
  provider?: {
    organization?: string;
    url?: string;
  };
  version: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentCardSkill[];
}

/** Standard A2A JSON-RPC error codes, extending the base JSON-RPC 2.0 error range with task-specific codes. */
export const A2AErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TASK_NOT_FOUND: -32001,
  TASK_NOT_CANCELABLE: -32002,
  PUSH_NOTIFICATION_UNSUPPORTED: -32003,
  UNSUPPORTED_OPERATION: -32004,
} as const;

export type A2AErrorCode = (typeof A2AErrorCode)[keyof typeof A2AErrorCode];

/**
 * Typed error class for A2A JSON-RPC failures.
 *
 * Provides static factory methods for every standard error code so callers
 * never need to remember numeric codes.
 */
export class VoltA2AError extends Error {
  /** Creates a new {@link VoltA2AError} with the given code, message, and optional details. */
  constructor(
    public code: A2AErrorCode,
    message: string,
    public data?: unknown,
    public taskId?: string,
  ) {
    super(message);
    this.name = "VoltA2AError";
  }

  /** Converts this error into a plain {@link JsonRpcError} object suitable for serialisation. */
  toJsonRpcError(): JsonRpcError {
    return {
      code: this.code,
      message: this.message,
      data: {
        taskId: this.taskId,
        ...(this.data !== undefined ? { details: this.data } : {}),
      },
    };
  }

  /** Creates a parse-error (-32700) for malformed JSON payloads. */
  static parseError(details?: unknown) {
    return new VoltA2AError(A2AErrorCode.PARSE_ERROR, "Invalid JSON payload", details);
  }

  /** Creates an invalid-request (-32600) error. */
  static invalidRequest(message = "Invalid request", details?: unknown) {
    return new VoltA2AError(A2AErrorCode.INVALID_REQUEST, message, details);
  }

  /** Creates a method-not-found (-32601) error for an unknown JSON-RPC method. */
  static methodNotFound(method: string) {
    return new VoltA2AError(A2AErrorCode.METHOD_NOT_FOUND, `Unknown method '${method}'`);
  }

  /** Creates an invalid-params (-32602) error. */
  static invalidParams(message = "Invalid parameters", details?: unknown) {
    return new VoltA2AError(A2AErrorCode.INVALID_PARAMS, message, details);
  }

  /** Creates a task-not-found (-32001) error for the given task ID. */
  static taskNotFound(taskId: string) {
    return new VoltA2AError(
      A2AErrorCode.TASK_NOT_FOUND,
      `Task '${taskId}' not found`,
      undefined,
      taskId,
    );
  }

  /** Creates a task-not-cancelable (-32002) error for a task that can no longer be canceled. */
  static taskNotCancelable(taskId: string) {
    return new VoltA2AError(
      A2AErrorCode.TASK_NOT_CANCELABLE,
      `Task '${taskId}' can no longer be canceled`,
      undefined,
      taskId,
    );
  }

  /** Creates an unsupported-operation (-32004) error. */
  static unsupportedOperation(message = "Unsupported operation") {
    return new VoltA2AError(A2AErrorCode.UNSUPPORTED_OPERATION, message);
  }

  /** Creates an internal-error (-32603) error. */
  static internal(message = "Internal error", details?: unknown) {
    return new VoltA2AError(A2AErrorCode.INTERNAL_ERROR, message, details);
  }
}
