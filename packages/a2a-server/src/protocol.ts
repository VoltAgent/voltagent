import type { A2AJsonRpcId, JsonRpcRequest, JsonRpcResponse } from "./types";
import { VoltA2AError } from "./types";

export function createSuccessResponse<Result>(
  id: A2AJsonRpcId,
  result: Result,
): JsonRpcResponse<Result> {
  if (id === null || typeof id === "undefined") {
    throw VoltA2AError.invalidRequest(
      "JSON-RPC id must be provided for calls expecting a response",
    );
  }
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

export function createErrorResponse(id: A2AJsonRpcId, error: VoltA2AError): JsonRpcResponse<never> {
  return {
    jsonrpc: "2.0",
    id,
    error: error.toJsonRpcError(),
  };
}

export function normalizeError(id: A2AJsonRpcId, cause: unknown): JsonRpcResponse<never> {
  if (cause instanceof VoltA2AError) {
    return createErrorResponse(id, cause);
  }
  if (cause instanceof SyntaxError) {
    return createErrorResponse(id, VoltA2AError.parseError(cause.message));
  }
  if (cause instanceof Error) {
    return createErrorResponse(id, VoltA2AError.internal(cause.message));
  }
  return createErrorResponse(id, VoltA2AError.internal("Unknown error", cause));
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<JsonRpcRequest>;
  return candidate.jsonrpc === "2.0" && typeof candidate.method === "string";
}
