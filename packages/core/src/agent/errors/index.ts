import type { AbortError } from "./abort-error";
import type { ClientHTTPError } from "./client-http-errors";

export type { VoltAgentError } from "./voltagent-error";
export type { AbortError } from "./abort-error";
export type { BailError } from "./bail-error";
export type { MiddlewareAbortError, MiddlewareAbortOptions } from "./middleware-abort-error";
export {
  ToolDeniedError,
  ClientHTTPError,
  isClientHTTPError,
  isToolDeniedError,
} from "./client-http-errors";
export { createAbortError, isAbortError } from "./abort-error";
export { createBailError, isBailError } from "./bail-error";
export { createMiddlewareAbortError, isMiddlewareAbortError } from "./middleware-abort-error";
export { createVoltAgentError, isVoltAgentError } from "./voltagent-error";
export type CancellationError = AbortError | ClientHTTPError;
