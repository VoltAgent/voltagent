import type { AbortError } from "./abort-error";
import type { ClientHTTPError } from "./client-http-errors";

export type { VoltAgentError } from "./voltagent-error";
export type { AbortError } from "./abort-error";
export {
  ToolDeniedError,
  ClientHTTPError,
  isClientHTTPError,
  isToolDeniedError,
} from "./client-http-errors";
export { createAbortError, isAbortError } from "./abort-error";
export { createVoltAgentError, isVoltAgentError } from "./voltagent-error";
export type CancellationError = AbortError | ClientHTTPError;
