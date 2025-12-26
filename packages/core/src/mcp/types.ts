import type {
  ClientCapabilities,
  ElicitRequest,
  ElicitResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { OperationContext } from "../agent/types";
import type { Tool } from "../tool";
import type { MCPAuthorizationConfig, MCPCanFunction } from "./authorization";

/**
 * Handler for elicitation requests from the MCP server.
 * Called when the server needs user input during tool execution.
 *
 * @deprecated Use `UserInputHandler` from `UserInputBridge` instead for dynamic handler registration.
 */
export type MCPElicitationHandler = (request: ElicitRequest["params"]) => Promise<ElicitResult>;

// Re-export UserInputBridge types for convenience
export type { UserInputHandler } from "./client/user-input-bridge";

/**
 * Client information for MCP
 */
export interface ClientInfo {
  /**
   * Client name
   */
  name: string;

  /**
   * Client version
   */
  version: string;

  /**
   * Allow additional properties for SDK compatibility
   */
  [key: string]: unknown;
}

/**
 * Transport error from MCP
 */
export interface TransportError extends Error {
  /**
   * Error code
   */
  code?: string;

  /**
   * Error details
   */
  details?: unknown;
}

/**
 * Model Context Protocol (MCP) configuration options
 */
export type MCPOptions = {
  /**
   * Whether MCP is enabled
   */
  enabled: boolean;

  /**
   * MCP API endpoint
   */
  endpoint?: string;

  /**
   * API key for MCP authentication
   */
  apiKey?: string;

  /**
   * Control parameters for MCP
   */
  controlParams?: Record<string, unknown>;

  /**
   * Whether to fall back to the provider if MCP fails
   */
  fallbackToProvider?: boolean;

  /**
   * Timeout in milliseconds for MCP requests
   * @default 30000
   */
  timeout?: number;
};

/**
 * Configuration for MCP client
 */
export type MCPClientConfig = {
  /**
   * Client information
   */
  clientInfo: ClientInfo;

  /**
   * MCP server configuration
   */
  server: MCPServerConfig;

  /**
   * MCP capabilities
   */
  capabilities?: ClientCapabilities;

  /**
   * Timeout in milliseconds for MCP requests
   * @default 30000
   */
  timeout?: number;

  /**
   * Elicitation handler for receiving user input requests from the MCP server.
   * When the server needs additional information during tool execution,
   * this handler will be called with the request details.
   *
   * @example
   * ```typescript
   * const mcpClient = new MCPClient({
   *   clientInfo: { name: "my-client", version: "1.0.0" },
   *   server: { type: "stdio", command: "my-mcp-server" },
   *   elicitation: {
   *     onRequest: async (request) => {
   *       const confirmed = await askUserForConfirmation(request.message);
   *       return {
   *         action: confirmed ? "accept" : "decline",
   *         content: confirmed ? { confirmed: true } : undefined,
   *       };
   *     },
   *   },
   * });
   * ```
   */
  elicitation?: {
    /**
     * Handler called when the MCP server requests user input.
     * Must return an ElicitResult with action: "accept", "decline", or "cancel".
     */
    onRequest: MCPElicitationHandler;
  };
};

/**
 * MCP server configuration options
 */
export type MCPServerConfig =
  | HTTPServerConfig
  | SSEServerConfig
  | StreamableHTTPServerConfig
  | StdioServerConfig;

/**
 * HTTP-based MCP server configuration with automatic fallback
 * Tries streamable HTTP first, falls back to SSE if not supported
 */
export type HTTPServerConfig = {
  /**
   * Type of server connection
   */
  type: "http";

  /**
   * URL of the MCP server
   */
  url: string;

  /**
   * Request initialization options
   */
  requestInit?: RequestInit;

  /**
   * Event source initialization options (used for SSE fallback)
   */
  eventSourceInit?: EventSourceInit;

  /**
   * Optional maximum request timeout in milliseconds.
   * If provided, passed to MCPClient as the per-request timeout.
   */
  timeout?: number;
};

/**
 * SSE-based MCP server configuration (explicit SSE transport)
 */
export type SSEServerConfig = {
  /**
   * Type of server connection
   */
  type: "sse";

  /**
   * URL of the MCP server
   */
  url: string;

  /**
   * Request initialization options
   */
  requestInit?: RequestInit;

  /**
   * Event source initialization options
   */
  eventSourceInit?: EventSourceInit;

  /**
   * Optional maximum request timeout in milliseconds.
   * If provided, passed to MCPClient as the per-request timeout.
   */
  timeout?: number;
};

/**
 * Streamable HTTP-based MCP server configuration (no fallback)
 */
export type StreamableHTTPServerConfig = {
  /**
   * Type of server connection
   */
  type: "streamable-http";

  /**
   * URL of the MCP server
   */
  url: string;

  /**
   * Request initialization options
   */
  requestInit?: RequestInit;

  /**
   * Session ID for the connection
   */
  sessionId?: string;

  /**
   * Optional maximum request timeout in milliseconds.
   * If provided, passed to MCPClient as the per-request timeout.
   */
  timeout?: number;
};

/**
 * Stdio-based MCP server configuration
 */
export type StdioServerConfig = {
  /**
   * Type of server connection
   */
  type: "stdio";

  /**
   * Command to run the MCP server
   */
  command: string;

  /**
   * Arguments to pass to the command
   */
  args?: string[];

  /**
   * Environment variables for the MCP server process
   */
  env?: Record<string, string>;

  /**
   * Working directory for the MCP server process
   */
  cwd?: string;

  /**
   * Optional maximum request timeout in milliseconds.
   * If provided, passed to MCPClient as the per-request timeout.
   */
  timeout?: number;
};

/**
 * Tool call request
 */
export type MCPToolCall = {
  /**
   * Name of the tool to call
   */
  name: string;

  /**
   * Arguments to pass to the tool
   */
  arguments: Record<string, unknown>;
};

/**
 * Tool call result
 */
export type MCPToolResult = {
  /**
   * Result content from the tool
   */
  content: unknown;
};

/**
 * MCP client events
 */
export interface MCPClientEvents {
  /**
   * Emitted when the client connects to the server
   */
  connect: () => void;

  /**
   * Emitted when the client disconnects from the server
   */
  disconnect: () => void;

  /**
   * Emitted when an error occurs
   */
  error: (error: Error | TransportError) => void;

  /**
   * Emitted when a tool call completes
   */
  toolCall: (name: string, args: Record<string, unknown>, result: unknown) => void;
}

/**
 * Map of toolset names to tools
 */
export type ToolsetMap = Record<string, ToolsetWithTools>;

/**
 * A record of tools along with a helper method to convert them to an array.
 */
export type ToolsetWithTools = Record<string, AnyToolConfig> & {
  /**
   * Converts the toolset to an array of BaseTool objects.
   */
  getTools: () => Tool<any>[];
};

/**
 * Any tool configuration
 */
export type AnyToolConfig = Tool<any>;

/**
 * Options for MCPConfiguration constructor.
 */
export interface MCPConfigurationOptions<TServerKeys extends string = string> {
  /**
   * Map of server configurations keyed by server names.
   */
  servers: Record<TServerKeys, MCPServerConfig>;

  /**
   * Optional authorization configuration for tool access control.
   */
  authorization?: MCPAuthorizationConfig;
}

/**
 * Options for MCPClient.callTool method with authorization support.
 */
export interface MCPClientCallOptions {
  /**
   * Full operation context for authorization (from agent execution).
   */
  operationContext?: OperationContext;

  /**
   * Authorization function.
   */
  canFunction?: MCPCanFunction;

  /**
   * Authorization config settings.
   */
  authorizationConfig?: MCPAuthorizationConfig;

  /**
   * Server name for authorization context.
   */
  serverName?: string;
}
