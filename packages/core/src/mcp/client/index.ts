import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { DEFAULT_REQUEST_TIMEOUT_MSEC } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolResultSchema,
  ElicitRequestSchema,
  ListResourcesResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ListResourcesResult } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@voltagent/internal";
import { z } from "zod";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import { convertJsonSchemaToZod as convertJsonSchemaToZodV3 } from "zod-from-json-schema-v3";
import type { ToolExecuteOptions } from "../../agent/providers/base/types";
import { getGlobalLogger } from "../../logger";
import { type Tool, createTool } from "../../tool";
import { SimpleEventEmitter } from "../../utils/simple-event-emitter";
import { MCPAuthorizationError } from "../authorization";
import type {
  ClientInfo,
  HTTPServerConfig,
  MCPClientCallOptions,
  MCPClientConfig,
  MCPClientEvents,
  MCPServerConfig,
  MCPToolCall,
  MCPToolResult,
  SSEServerConfig,
  StdioServerConfig,
  StreamableHTTPServerConfig,
} from "../types";
import type { UserInputHandler } from "./user-input-bridge";
import { UserInputBridge } from "./user-input-bridge";

/**
 * Client for interacting with Model Context Protocol (MCP) servers.
 * Wraps the official MCP SDK client to provide a higher-level interface.
 * Internal implementation differs from original source.
 */
export class MCPClient extends SimpleEventEmitter {
  /**
   * Underlying MCP client instance from the SDK.
   */
  private client: Client; // Renamed back from sdkClient

  /**
   * Communication channel (transport layer) for MCP interactions.
   */
  private transport: Transport; // Renamed back from communicationChannel

  /**
   * Tracks the connection status to the server.
   */
  private connected = false; // Renamed back from isConnected

  /**
   * Maximum time allowed for requests in milliseconds.
   */
  private readonly timeout: number; // Renamed back from requestTimeoutMs

  /**
   * Logger instance
   */
  private logger: Logger;

  /**
   * Information identifying this client to the server.
   */
  private readonly clientInfo: ClientInfo; // Renamed back from identity

  /**
   * Server configuration for fallback attempts.
   */
  private readonly serverConfig: MCPServerConfig;

  /**
   * Whether to attempt SSE fallback if streamable HTTP fails.
   */
  private shouldAttemptFallback = false;

  /**
   * Client capabilities for re-initialization.
   */
  private readonly capabilities: Record<string, unknown>;

  /**
   * Bridge for handling user input requests from the server.
   * Provides methods to dynamically register and manage input handlers.
   *
   * @example
   * ```typescript
   * mcpClient.elicitation.setHandler(async (request) => {
   *   const confirmed = await askUser(request.message);
   *   return { action: confirmed ? "accept" : "decline" };
   * });
   * ```
   */
  public readonly elicitation: UserInputBridge;

  /**
   * Get server info for logging
   */
  private getServerInfo(server: MCPServerConfig): { type: string; url?: string } {
    if ("type" in server) {
      if (server.type === "http" || server.type === "sse" || server.type === "streamable-http") {
        return { type: server.type, url: (server as any).url };
      }
      return { type: server.type };
    }
    return { type: "unknown" };
  }

  /**
   * Creates a new MCP client instance.
   * @param config Configuration for the client, including server details and client identity.
   */
  constructor(config: MCPClientConfig) {
    super();

    this.clientInfo = config.clientInfo;
    this.serverConfig = config.server;

    // Initialize logger first (needed by UserInputBridge)
    const serverInfo = this.getServerInfo(config.server);
    this.logger = getGlobalLogger().child({
      component: "mcp-client",
      serverType: serverInfo.type,
      serverUrl: serverInfo.url,
    });

    // Always enable elicitation capability - handler can be set dynamically
    this.capabilities = {
      ...(config.capabilities || {}),
      elicitation: {},
    };

    this.client = new Client(this.clientInfo, {
      capabilities: this.capabilities,
    });

    // Initialize elicitation bridge with callback for handler changes
    this.elicitation = new UserInputBridge(this.logger, (handler) => {
      this.updateElicitationHandler(handler);
    });

    // Register the elicitation request handler with MCP SDK
    this.registerElicitationHandler();

    // If config has initial handler, set it
    if (config.elicitation?.onRequest) {
      this.elicitation.setHandler(config.elicitation.onRequest);
    }

    if (this.isHTTPServer(config.server)) {
      // HTTP type: Try streamable HTTP first with SSE fallback
      this.transport = new StreamableHTTPClientTransport(new URL(config.server.url), {
        requestInit: config.server.requestInit,
      });
      this.shouldAttemptFallback = true;
    } else if (this.isSSEServer(config.server)) {
      // Explicit SSE transport
      this.transport = new SSEClientTransport(new URL(config.server.url), {
        requestInit: config.server.requestInit,
        eventSourceInit: config.server.eventSourceInit,
      });
    } else if (this.isStreamableHTTPServer(config.server)) {
      // Explicit streamable HTTP transport (no fallback)
      this.transport = new StreamableHTTPClientTransport(new URL(config.server.url), {
        requestInit: config.server.requestInit,
        sessionId: config.server.sessionId,
      });
    } else if (this.isStdioServer(config.server)) {
      // Stdio transport
      this.transport = new StdioClientTransport({
        command: config.server.command,
        args: config.server.args || [],
        cwd: config.server.cwd,
        env: { ...getDefaultEnvironment(), ...(config.server.env || {}) },
      });
    } else {
      throw new Error(
        `Unsupported server configuration type: ${(config.server as any)?.type || "unknown"}`,
      );
    }

    this.timeout = config.timeout || DEFAULT_REQUEST_TIMEOUT_MSEC;
    this.setupEventHandlers(); // Use original method name
  }

  /**
   * Sets up handlers for events from the underlying SDK client.
   */
  private setupEventHandlers(): void {
    // Renamed back from initializeEventHandlers
    this.client.onclose = () => {
      this.connected = false;
      this.emit("disconnect");
    };
  }

  /**
   * Registers the elicitation request handler with the MCP SDK client.
   * Delegates to UserInputBridge for actual handling.
   */
  private registerElicitationHandler(): void {
    this.client.setRequestHandler(ElicitRequestSchema, async (request) => {
      return this.elicitation.processRequest(request.params);
    });
  }

  /**
   * Callback invoked when the elicitation handler changes.
   * Currently a no-op since we always delegate to UserInputBridge.
   * @internal
   */
  private updateElicitationHandler(_handler: UserInputHandler | undefined): void {
    // Handler is managed by UserInputBridge, no additional action needed
    // The MCP SDK handler always delegates to this.elicitation.processRequest()
  }

  /**
   * Establishes a connection to the configured MCP server.
   * Idempotent: does nothing if already connected.
   */
  async connect(): Promise<void> {
    // Renamed back from establishConnection
    if (this.connected) {
      return;
    }

    // Create MCP-specific logger
    const serverInfo = this.getServerInfo(this.serverConfig);
    const mcpLogger = this.logger.child({
      component: `MCP:${serverInfo.type}-server`,
      serverName: `${serverInfo.type}-server`,
      transport: serverInfo.type,
      method: "connect",
    });

    try {
      await this.client.connect(this.transport);
      this.connected = true;

      // Log successful connection
      mcpLogger.info(`MCP server connected: ${serverInfo.type}-server`, {
        event: "mcp_connect",
        serverName: `${serverInfo.type}-server`,
        serverType: serverInfo.type,
        serverUrl: serverInfo.url,
      });

      this.emit("connect");
    } catch (error) {
      // Log connection error
      mcpLogger.error(
        `MCP connection error: ${serverInfo.type}-server - ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          event: "mcp_error",
          serverName: `${serverInfo.type}-server`,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        },
      );

      // If this is an HTTP config with fallback enabled, try SSE
      if (this.shouldAttemptFallback && this.isHTTPServer(this.serverConfig)) {
        await this.attemptSSEFallback(error);
        return;
      }

      this.emitError(error); // Use original error handler name
      throw new Error(
        `MCP connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Attempts to connect using SSE transport as a fallback.
   * @param originalError The error from the initial connection attempt.
   */
  private async attemptSSEFallback(originalError: unknown): Promise<void> {
    this.logger.debug("Streamable HTTP connection failed, attempting SSE fallback");

    // Create new SSE transport
    if (!this.isHTTPServer(this.serverConfig)) {
      throw new Error("Invalid server config for SSE fallback");
    }

    this.transport = new SSEClientTransport(new URL(this.serverConfig.url), {
      requestInit: this.serverConfig.requestInit,
      eventSourceInit: this.serverConfig.eventSourceInit,
    });

    // Create new client instance for the new transport
    this.client = new Client(this.clientInfo, {
      capabilities: this.capabilities,
    });

    // Disable further fallback attempts
    this.shouldAttemptFallback = false;

    // Re-setup event handlers and elicitation handler for new client
    this.setupEventHandlers();
    this.registerElicitationHandler();

    try {
      await this.client.connect(this.transport);
      this.connected = true;
      this.emit("connect");
    } catch (fallbackError) {
      this.emitError(fallbackError);
      throw new Error(
        `MCP connection failed with both transports: ${originalError instanceof Error ? originalError.message : String(originalError)}, SSE: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );
    }
  }

  /**
   * Closes the connection to the MCP server.
   * Idempotent: does nothing if not connected.
   */
  async disconnect(): Promise<void> {
    // Renamed back from closeConnection
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
    } catch (error) {
      this.emitError(error); // Use original error handler name
      throw new Error(
        `MCP disconnection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Fetches the definitions of available tools from the server.
   * @returns A record mapping tool names to their definitions (schema, description).
   */
  async listTools(): Promise<Record<string, unknown>> {
    // Renamed back from fetchAvailableToolDefinitions
    await this.ensureConnected(); // Use original connection check name

    try {
      const { tools } = await this.client.listTools();

      const toolDefinitions: Record<string, unknown> = {};
      for (const tool of tools) {
        toolDefinitions[tool.name] = {
          name: tool.name,
          description: tool.description || "",
          inputSchema: tool.inputSchema,
        };
      }
      return toolDefinitions;
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Builds executable Tool objects from the server's tool definitions.
   * These tools include an `execute` method for calling the remote tool.
   * @param options - Optional call options including authorization context.
   * @returns A record mapping namespaced tool names (`clientName_toolName`) to executable Tool objects.
   */
  async getAgentTools(options?: MCPClientCallOptions): Promise<Record<string, Tool<any>>> {
    await this.ensureConnected();

    try {
      const definitions = await this.listTools();

      const executableTools: Record<string, Tool<any>> = {};

      for (const toolDef of Object.values(definitions) as {
        name: string;
        description?: string;
        inputSchema: unknown;
      }[]) {
        try {
          const zodSchema = ("toJSONSchema" in z
            ? convertJsonSchemaToZod
            : convertJsonSchemaToZodV3)(
            toolDef.inputSchema as Record<string, unknown>,
          ) as unknown as z.ZodType;
          const namespacedToolName = `${this.clientInfo.name}_${toolDef.name}`;

          // Capture options for use in execute closure
          const capturedOptions = options;

          // Capture elicitation bridge for use in execute closure
          const elicitationBridge = this.elicitation;
          const toolLogger = this.logger;

          const agentTool = createTool({
            name: namespacedToolName,
            description: toolDef.description || `Executes the remote tool: ${toolDef.name}`,
            parameters: zodSchema,
            execute: async (
              args: Record<string, unknown>,
              execOptions?: ToolExecuteOptions,
            ): Promise<unknown> => {
              // If elicitation handler is provided in options, set it temporarily
              const elicitationHandler = execOptions?.elicitation as UserInputHandler | undefined;
              const hadPreviousHandler = elicitationBridge.hasHandler;
              let previousHandler: UserInputHandler | undefined;

              if (elicitationHandler) {
                // Save previous handler if exists
                if (hadPreviousHandler) {
                  previousHandler = elicitationBridge.getHandler();
                }
                // Set the new handler from options
                elicitationBridge.setHandler(elicitationHandler);
              }

              try {
                const result = await this.callTool(
                  {
                    name: toolDef.name,
                    arguments: args,
                  },
                  capturedOptions,
                );
                return result.content;
              } catch (execError) {
                toolLogger.error(`Error executing remote tool '${toolDef.name}':`, {
                  error: execError,
                });
                throw execError;
              } finally {
                // Restore previous handler state
                if (elicitationHandler) {
                  if (previousHandler) {
                    elicitationBridge.setHandler(previousHandler);
                  } else if (!hadPreviousHandler) {
                    elicitationBridge.removeHandler();
                  }
                }
              }
            },
          });

          executableTools[namespacedToolName] = agentTool;
        } catch (toolCreationError) {
          this.logger.error(`Failed to create executable tool wrapper for '${toolDef.name}':`, {
            error: toolCreationError,
          });
        }
      }

      return executableTools;
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Executes a specified tool on the remote MCP server.
   * @param toolCall Details of the tool to call, including name and arguments.
   * @param options Optional call options including authorization context.
   * @returns The result content returned by the tool.
   */
  async callTool(toolCall: MCPToolCall, options?: MCPClientCallOptions): Promise<MCPToolResult> {
    await this.ensureConnected();

    // Check authorization if configured
    if (options?.authorizationConfig?.checkOnExecution) {
      const serverName = options.serverName ?? this.clientInfo.name;

      // Use `can` function if provided (takes precedence)
      if (options.canFunction) {
        const result = await options.canFunction({
          toolName: toolCall.name,
          serverName,
          action: "execution",
          arguments: toolCall.arguments,
          userId: options.operationContext?.userId,
          context: options.operationContext?.context,
        });

        const allowed = typeof result === "boolean" ? result : result.allowed;
        const reason = typeof result === "boolean" ? undefined : result.reason;

        if (!allowed) {
          throw new MCPAuthorizationError(toolCall.name, serverName, reason);
        }
      }
    }

    try {
      const result = await this.client.callTool(
        {
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        CallToolResultSchema,
        { timeout: this.timeout },
      );

      this.emit("toolCall", toolCall.name, toolCall.arguments, result);
      return { content: result };
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Retrieves a list of resources available on the server.
   * @returns A promise resolving to the MCP resources list response.
   */
  async listResources(): Promise<ListResourcesResult> {
    // Renamed back from fetchAvailableResourceIds
    await this.ensureConnected(); // Use original connection check name

    try {
      return await this.client.request({ method: "resources/list" }, ListResourcesResultSchema, {
        timeout: this.timeout,
      });
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Ensures the client is connected before proceeding with an operation.
   * Attempts to connect if not currently connected.
   * @throws Error if connection attempt fails.
   */
  private async ensureConnected(): Promise<void> {
    // Renamed back from verifyConnection
    if (!this.connected) {
      await this.connect(); // Use original method name
    }
  }

  /**
   * Emits an 'error' event, ensuring the payload is always an Error object.
   * @param error The error encountered, can be of any type.
   */
  private emitError(error: unknown): void {
    // Renamed back from dispatchError
    if (error instanceof Error) {
      this.emit("error", error);
    } else {
      this.emit("error", new Error(String(error ?? "Unknown error")));
    }
  }

  /**
   * Type guard to check if a server configuration is for an HTTP server.
   * @param server The server configuration object.
   * @returns True if the configuration type is 'http', false otherwise.
   */
  private isHTTPServer(server: MCPServerConfig): server is HTTPServerConfig {
    // Renamed back from isHttpConfig
    return server.type === "http";
  }

  /**
   * Type guard to check if a server configuration is for an SSE server.
   * @param server The server configuration object.
   * @returns True if the configuration type is 'sse', false otherwise.
   */
  private isSSEServer(server: MCPServerConfig): server is SSEServerConfig {
    return server.type === "sse";
  }

  /**
   * Type guard to check if a server configuration is for a Streamable HTTP server.
   * @param server The server configuration object.
   * @returns True if the configuration type is 'streamable-http', false otherwise.
   */
  private isStreamableHTTPServer(server: MCPServerConfig): server is StreamableHTTPServerConfig {
    return server.type === "streamable-http";
  }

  /**
   * Type guard to check if a server configuration is for a Stdio server.
   * @param server The server configuration object.
   * @returns True if the configuration type is 'stdio', false otherwise.
   */
  private isStdioServer(server: MCPServerConfig): server is StdioServerConfig {
    // Renamed back from isStdioConfig
    return server.type === "stdio";
  }

  /**
   * Overrides EventEmitter's 'on' method for type-safe event listening.
   * Uses the original `MCPClientEvents` for event types.
   */
  on<E extends keyof MCPClientEvents>(event: E, listener: MCPClientEvents[E]): this {
    // Use original type
    return super.on(event, listener as (...args: any[]) => void);
  }

  /**
   * Overrides EventEmitter's 'emit' method for type-safe event emission.
   * Uses the original `MCPClientEvents` for event types.
   */
  emit<E extends keyof MCPClientEvents>(
    // Use original type
    event: E,
    ...args: Parameters<MCPClientEvents[E]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
