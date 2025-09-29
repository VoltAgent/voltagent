/**
 * Framework-agnostic response types for server handlers
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  httpStatus?: number;
  code?: string;
  name?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Stream handlers can return either a Response (AI SDK) or ReadableStream or ErrorResponse
export type StreamResponse = Response | ReadableStream | ErrorResponse;

// Type guard to check if response is an error
export function isErrorResponse(response: any): response is ErrorResponse {
  return (
    response && typeof response === "object" && "success" in response && response.success === false
  );
}

// Type guard to check if response is a success response
export function isSuccessResponse<T>(response: any): response is SuccessResponse<T> {
  return (
    response && typeof response === "object" && "success" in response && response.success === true
  );
}
