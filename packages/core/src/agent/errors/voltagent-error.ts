import type { ToolErrorInfo } from "../types";

export type VoltAgentErrorOptions = {
  originalError?: unknown;
  code?: string;
  metadata?: Record<string, unknown>;
  stage?: string;
  toolError?: ToolErrorInfo;
};

/**
 * Creates a VoltAgentError.
 * @param message - The error message or error object.
 * @param options - The error options.
 * @returns
 */
export function createVoltAgentError(
  message: string | Error,
  options?: VoltAgentErrorOptions,
): VoltAgentError {
  const msg = message instanceof Error ? message.message : message;
  return new VoltAgentError(msg, {
    ...options,
    originalError: message instanceof Error ? message : options?.originalError,
  });
}

/**
 * Type guard to check if an error is a VoltAgentError
 */
export function isVoltAgentError(error: unknown): error is VoltAgentError {
  return error instanceof VoltAgentError;
}

export class VoltAgentError extends Error {
  name: "VoltAgentError";

  /**
   * The original error object thrown by the provider or underlying system (if available).
   */
  originalError?: unknown;

  /**
   * Optional error code or identifier from the provider.
   */
  code?: string | number;

  /**
   * Additional metadata related to the error (e.g., retry info, request ID).
   */
  metadata?: Record<string, any>;

  /**
   * Information about the step or stage where the error occurred (optional, e.g., 'llm_request', 'tool_execution', 'response_parsing').
   */
  stage?: string;

  /**
   * If the error occurred during tool execution, this field contains the relevant details. Otherwise, it's undefined.
   */
  toolError?: ToolErrorInfo;

  constructor(message: string, options?: VoltAgentErrorOptions) {
    super(message);
    this.name = "VoltAgentError";
    this.originalError = options?.originalError;
    this.code = options?.code;
    this.metadata = options?.metadata;
    this.stage = options?.stage;
    this.toolError = options?.toolError;
  }
}
