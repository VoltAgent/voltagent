import type { LogEntry, LogFilter } from "@voltagent/internal";
import type { LogHandlerResponse } from "../handlers/log.handlers";
import type { ApiResponse, ErrorResponse } from "../types";

interface LogResponseData {
  success: true;
  data: LogEntry[];
  total: number;
  query: LogFilter;
}

/**
 * Maps a log handler response to match OpenAPI schema expectations
 * Extracts nested data properties to root level
 */
export function mapLogResponse(
  response: ApiResponse<LogHandlerResponse>,
): LogResponseData | ErrorResponse {
  if (!response.success) {
    return response;
  }

  return {
    success: true,
    data: response.data.logs,
    total: response.data.total,
    query: response.data.query,
  };
}

/**
 * Maps a generic handler response to framework-specific format
 * Can be extended for other response types as needed
 */
export function mapHandlerResponse(response: ApiResponse, type?: string) {
  switch (type) {
    case "logs":
      return mapLogResponse(response);
    default:
      return response;
  }
}

/**
 * Extracts HTTP status code from response
 */
export function getResponseStatus(response: ApiResponse): number {
  return response.success ? 200 : 500;
}
