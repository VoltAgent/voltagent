export type ClientHttpErrorCode =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451;

export abstract class ClientHTTPError extends Error {
  constructor(
    public name: string,
    public httpStatus: ClientHttpErrorCode,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type ToolDeniedErrorCode =
  | "TOOL_ERROR"
  | "TOOL_FORBIDDEN"
  | "TOOL_PLAN_REQUIRED"
  | "TOOL_QUOTA_EXCEEDED";

export type ExecutionValidationErrorCode =
  | "EXECUTION_VALIDATION_FAILED"
  | "TOOL_VALIDATION_FAILED"
  | "WORKFLOW_VALIDATION_FAILED"
  | string;

/**
 * Error thrown when a tool execution is denied by a controller or policy layer
 */
export class ToolDeniedError extends ClientHTTPError {
  constructor({
    toolName,
    message,
    code,
    httpStatus,
  }: {
    toolName: string;
    message: string;
    code: ToolDeniedErrorCode | string;
    httpStatus: ClientHttpErrorCode;
  }) {
    super(toolName, httpStatus, code, message);
  }
}

export function isClientHTTPError(error: unknown): error is ClientHTTPError {
  return error instanceof ClientHTTPError;
}

export function isToolDeniedError(error: unknown): error is ToolDeniedError {
  return error instanceof ToolDeniedError;
}

/**
 * Error thrown when an execution validator denies a tool or workflow execution.
 */
export class ExecutionValidationError extends ClientHTTPError {
  readonly metadata?: Record<string, unknown>;

  constructor({
    targetName = "ExecutionValidationError",
    message,
    code = "EXECUTION_VALIDATION_FAILED",
    httpStatus = 403,
    metadata,
  }: {
    targetName?: string;
    message: string;
    code?: ExecutionValidationErrorCode;
    httpStatus?: ClientHttpErrorCode;
    metadata?: Record<string, unknown>;
  }) {
    super(targetName, httpStatus, code, message);
    this.metadata = metadata;
  }
}

export function isExecutionValidationError(error: unknown): error is ExecutionValidationError {
  return error instanceof ExecutionValidationError;
}
