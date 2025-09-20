import type { A2AServerLike } from "@voltagent/internal/a2a";

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

export interface A2ARequestContext {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentCardSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

export interface AgentCardProviderInfo {
  organization?: string;
  url?: string;
}

export interface AgentCardCapabilities {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory: boolean;
}

export interface AgentCard {
  name: string;
  description?: string;
  url: string;
  provider?: AgentCardProviderInfo;
  version: string;
  capabilities: AgentCardCapabilities;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentCardSkill[];
}

export interface A2AServerLikeWithHandlers extends A2AServerLike {
  getAgentCard?(agentId: string, context?: A2ARequestContext): AgentCard;
  handleRequest?(
    agentId: string,
    request: JsonRpcRequest,
    context?: A2ARequestContext,
  ): Promise<JsonRpcHandlerResult>;
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

export function normalizeError(id: A2AJsonRpcId, cause: unknown): JsonRpcResponse<never> {
  if (cause instanceof VoltA2AError) {
    return {
      jsonrpc: "2.0",
      id,
      error: cause.toJsonRpcError(),
    };
  }
  if (cause instanceof SyntaxError) {
    return {
      jsonrpc: "2.0",
      id,
      error: VoltA2AError.parseError(cause.message).toJsonRpcError(),
    };
  }
  if (cause instanceof Error) {
    return {
      jsonrpc: "2.0",
      id,
      error: VoltA2AError.internal(cause.message).toJsonRpcError(),
    };
  }
  return {
    jsonrpc: "2.0",
    id,
    error: VoltA2AError.internal("Unknown error", cause).toJsonRpcError(),
  };
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<JsonRpcRequest>;
  return candidate.jsonrpc === "2.0" && typeof candidate.method === "string";
}
