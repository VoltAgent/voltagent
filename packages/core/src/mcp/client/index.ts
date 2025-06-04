import { EventEmitter } from "node:events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { DEFAULT_REQUEST_TIMEOUT_MSEC } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolResultSchema,
  ListResourcesResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { convertJsonSchemaToZod } from "zod-from-json-schema";
import type {
  ClientInfo,
  HTTPServerConfig,
  MCPClientConfig,
  MCPClientEvents,
  MCPServerConfig,
  MCPToolCall,
  MCPToolResult,
  StdioServerConfig,
} from "../types";
import { createTool, type Tool } from "../../tool";
import type * as z from "zod";

/**
 * Client for interacting with Model Context Protocol (MCP) servers.
 * Wraps the official MCP SDK client to provide a higher-level interface.
 * Internal implementation differs from original source.
 */
export class MCPClient extends EventEmitter {
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
   * Information identifying this client to the server.
   */
  private readonly clientInfo: ClientInfo; // Renamed back from identity

  /**
   * Creates a new MCP client instance.
   * @param config Configuration for the client, including server details and client identity.
   */
  constructor(config: MCPClientConfig) {
    super();

    this.clientInfo = config.clientInfo;
    this.client = new Client(this.clientInfo, {
      capabilities: config.capabilities || {},
    });

    if (this.isHTTPServer(config.server)) {
      // Use original type guard name
      this.transport = new SSEClientTransport(new URL(config.server.url), {
        requestInit: config.server.requestInit,
        eventSourceInit: config.server.eventSourceInit,
      });
    } else if (this.isStdioServer(config.server)) {
      // Use original type guard name
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
   * Establishes a connection to the configured MCP server.
   * Idempotent: does nothing if already connected.
   */
  async connect(): Promise<void> {
    // Renamed back from establishConnection
    if (this.connected) {
      return;
    }

    try {
      await this.client.connect(this.transport);
      this.connected = true;
      this.emit("connect");
    } catch (error) {
      this.emitError(error); // Use original error handler name
      throw new Error(
        `MCP connection failed: ${error instanceof Error ? error.message : String(error)}`,
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
   * @returns A record mapping namespaced tool names (`clientName_toolName`) to executable Tool objects.
   */
  async getAgentTools(): Promise<Record<string, Tool<any>>> {
    // Renamed back from buildExecutableTools
    await this.ensureConnected(); // Use original connection check name

    try {
      const definitions = await this.listTools(); // Use original method name

      const executableTools: Record<string, Tool<any>> = {};

      for (const toolDef of Object.values(definitions) as {
        name: string;
        description?: string;
        inputSchema: unknown;
      }[]) {
        try {
          const zodSchema = convertJsonSchemaToZod(
            toolDef.inputSchema as Record<string, unknown>,
          ) as unknown as z.ZodType;
          const namespacedToolName = `${this.clientInfo.name}_${toolDef.name}`; // Use original separator

          const agentTool = createTool({
            name: namespacedToolName,
            description: toolDef.description || `Executes the remote tool: ${toolDef.name}`,
            parameters: zodSchema,
            execute: async (args: Record<string, unknown>): Promise<unknown> => {
              try {
                const result = await this.callTool({
                  // Use original method name
                  name: toolDef.name,
                  arguments: args,
                });
                return result.content;
              } catch (execError) {
                console.error(`Error executing remote tool '${toolDef.name}':`, execError);
                throw execError;
              }
            },
          });

          executableTools[namespacedToolName] = agentTool;
        } catch (toolCreationError) {
          console.error(
            `Failed to create executable tool wrapper for '${toolDef.name}':`,
            toolCreationError,
          );
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
   * @returns The result content returned by the tool.
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // Renamed back from executeRemoteTool
    await this.ensureConnected(); // Use original connection check name

    try {
      const result = await this.client.callTool(
        {
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        CallToolResultSchema,
        { timeout: this.timeout }, // Use original variable name
      );

      this.emit("toolCall", toolCall.name, toolCall.arguments, result);
      return { content: result };
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Retrieves a list of resource identifiers available on the server.
   * @returns A promise resolving to an array of resource ID strings.
   */
  async listResources(): Promise<string[]> {
    // Renamed back from fetchAvailableResourceIds
    await this.ensureConnected(); // Use original connection check name

    try {
      const result = await this.client.request(
        { method: "resources/list" },
        ListResourcesResultSchema,
      );

      return result.resources.map((resource: Record<string, unknown>) =>
        typeof resource.id === "string" ? resource.id : String(resource.id),
      );
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
