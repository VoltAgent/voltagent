import type { Agent } from "@voltagent/core";
import type {
  A2AServerDeps as BaseA2AServerDeps,
  A2AServerLike as BaseA2AServerLike,
  A2AServerMetadata as BaseA2AServerMetadata,
} from "@voltagent/internal/a2a";

export type A2AJsonRpcId = string | number | null;

export interface JsonRpcError<Data = unknown> {
  code: number;
  message: string;
  data?: Data;
}

export interface JsonRpcResponse<Result = unknown, ErrorData = unknown> {
  jsonrpc: "2.0";
  id: A2AJsonRpcId;
  result?: Result;
  error?: JsonRpcError<ErrorData> | null;
}

export interface JsonRpcStream<Result = unknown, ErrorData = unknown> {
  kind: "stream";
  id: A2AJsonRpcId;
  stream: AsyncGenerator<JsonRpcResponse<Result, ErrorData>>;
}

export type JsonRpcHandlerResult<Result = unknown, ErrorData = unknown> =
  | JsonRpcResponse<Result, ErrorData>
  | JsonRpcStream<Result, ErrorData>;

export interface JsonRpcRequest<Params = unknown> {
  jsonrpc: "2.0";
  id: A2AJsonRpcId;
  method: string;
  params?: Params;
}

export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled";

export interface A2AMessagePartText {
  kind: "text";
  text: string;
}

export type A2AMessagePart = A2AMessagePartText;

export interface A2AMessage {
  kind: "message";
  role: "user" | "agent";
  messageId: string;
  parts: A2AMessagePart[];
  contextId?: string;
  taskId?: string;
  referenceTaskIds?: string[];
  extensions?: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskStatus {
  state: TaskState;
  message?: A2AMessage;
  timestamp: string;
}

export interface TaskArtifactPart {
  kind: "text";
  text: string;
}

export interface TaskArtifact {
  name: string;
  parts: TaskArtifactPart[];
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskRecord {
  id: string;
  contextId: string;
  status: TaskStatus;
  history: A2AMessage[];
  artifacts?: TaskArtifact[];
  metadata?: Record<string, unknown>;
}

export interface TaskStore {
  load(params: { agentId: string; taskId: string }): Promise<TaskRecord | null>;
  save(params: { agentId: string; data: TaskRecord }): Promise<void>;
}

export interface A2ARequestContext {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface A2AFilterParams<T> {
  items: T[];
  context?: A2ARequestContext;
}

export type A2AFilterFunction<T> = (params: A2AFilterParams<T>) => T[];

export interface MessageSendParams {
  id?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  historyLength?: number;
  message: A2AMessage;
}

export interface TaskQueryParams {
  id: string;
  historyLength?: number;
  metadata?: Record<string, unknown>;
}

export interface TaskIdParams {
  id: string;
  metadata?: Record<string, unknown>;
}

export type MessageSendResult = TaskRecord;
export type TaskGetResult = TaskRecord;
export type TaskCancelResult = TaskRecord;

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
}

export interface A2AServerMetadata extends BaseA2AServerMetadata {}

export interface A2AServerDeps extends BaseA2AServerDeps<Agent, TaskStore> {
  taskStore?: TaskStore;
}

export interface A2AServerLike extends BaseA2AServerLike<Agent> {
  getAgentCard?(agentId: string, context?: A2ARequestContext): AgentCard;
  handleRequest?(
    agentId: string,
    request: JsonRpcRequest,
    context?: A2ARequestContext,
  ): Promise<JsonRpcHandlerResult>;
}

export type A2AServerFactory<T extends A2AServerLike = A2AServerLike> = () => T;

export interface AgentCardSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

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

export class VoltA2AError extends Error {
  constructor(
    public code: A2AErrorCode,
    message: string,
    public data?: unknown,
    public taskId?: string,
  ) {
    super(message);
    this.name = "VoltA2AError";
  }

  toJsonRpcError(): JsonRpcError {
    return {
      code: this.code,
      message: this.message,
      data: {
        taskId: this.taskId,
        ...(this.data ? { details: this.data } : {}),
      },
    };
  }

  static parseError(details?: unknown) {
    return new VoltA2AError(A2AErrorCode.PARSE_ERROR, "Invalid JSON payload", details);
  }

  static invalidRequest(message = "Invalid request", details?: unknown) {
    return new VoltA2AError(A2AErrorCode.INVALID_REQUEST, message, details);
  }

  static methodNotFound(method: string) {
    return new VoltA2AError(A2AErrorCode.METHOD_NOT_FOUND, `Unknown method '${method}'`);
  }

  static invalidParams(message = "Invalid parameters", details?: unknown) {
    return new VoltA2AError(A2AErrorCode.INVALID_PARAMS, message, details);
  }

  static taskNotFound(taskId: string) {
    return new VoltA2AError(
      A2AErrorCode.TASK_NOT_FOUND,
      `Task '${taskId}' not found`,
      undefined,
      taskId,
    );
  }

  static taskNotCancelable(taskId: string) {
    return new VoltA2AError(
      A2AErrorCode.TASK_NOT_CANCELABLE,
      `Task '${taskId}' can no longer be canceled`,
      undefined,
      taskId,
    );
  }

  static unsupportedOperation(message = "Unsupported operation") {
    return new VoltA2AError(A2AErrorCode.UNSUPPORTED_OPERATION, message);
  }

  static internal(message = "Internal error", details?: unknown) {
    return new VoltA2AError(A2AErrorCode.INTERNAL_ERROR, message, details);
  }
}
