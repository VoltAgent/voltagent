export { MCPServerRegistry, type RegisterOptions } from "./registry";
export { MCPConfiguration } from "./registry/index";

// Client exports
export { MCPClient } from "./client";
export { UserInputBridge } from "./client/user-input-bridge";

// Authorization exports
export {
  MCPAuthorizationError,
  type MCPAuthorizationAction,
  type MCPAuthorizationConfig,
  type MCPAuthorizationContext,
  type MCPCanFunction,
  type MCPCanParams,
  type MCPCanResult,
} from "./authorization";

// Types exports
export type {
  MCPClientCallOptions,
  MCPClientConfig,
  MCPConfigurationOptions,
  MCPElicitationHandler,
  UserInputHandler,
} from "./types";
