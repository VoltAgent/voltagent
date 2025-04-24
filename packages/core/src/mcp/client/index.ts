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
import { jsonSchemaToZod } from "@n8n/json-schema-to-zod";
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

/**
 * Client for interacting with Model Context Protocol (MCP) servers
 * Implements MCP specification using the official SDK
 */
export class MCPClient extends EventEmitter {
  /**
   * Underlying MCP client instance from SDK
   */
  private client: Client;

  /**
   * Transport layer for MCP communication
   */
  private transport: Transport;

  /**
   * Whether the client is connected to the server
   */
  private connected = false;

  /**
   * Request timeout in milliseconds
   */
  private readonly timeout: number;

  /**
   * Client information used for identification
   */
  private readonly clientInfo: ClientInfo;

  /**
   * Creates a new MCP client
   */
  constructor(config: MCPClientConfig) {
    super();

    // Store client info
    this.clientInfo = config.clientInfo;

    // Initialize client with info and capabilities
    this.client = new Client(config.clientInfo, {
      capabilities: config.capabilities || {},
    });

    // Set up transport based on server config
    if (this.isHTTPServer(config.server)) {
      this.transport = new SSEClientTransport(new URL(config.server.url), {
        requestInit: config.server.requestInit,
        eventSourceInit: config.server.eventSourceInit,
      });
    } else if (this.isStdioServer(config.server)) {
      this.transport = new StdioClientTransport({
        command: config.server.command,
        args: config.server.args || [],
        cwd: config.server.cwd,
        env: { ...getDefaultEnvironment(), ...(config.server.env || {}) },
      });
    } else {
      throw new Error("Unsupported MCP server configuration type");
    }

    // Set timeout
    this.timeout = config.timeout || DEFAULT_REQUEST_TIMEOUT_MSEC;

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up MCP client event handlers
   */
  private setupEventHandlers(): void {
    // Handle client close event
    this.client.onclose = () => {
      this.connected = false;
      this.emit("disconnect");
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.client.connect(this.transport);
      this.connected = true;
      this.emit("connect");
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
      this.connected = false;
      this.emit("disconnect");
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<Record<string, unknown>> {
    await this.ensureConnected();

    try {
      const { tools } = await this.client.listTools();

      // Convert tools to a more convenient format
      const toolsRecord: Record<string, unknown> = {};

      for (const tool of tools) {
        toolsRecord[tool.name] = {
          name: tool.name,
          description: tool.description || "",
          inputSchema: tool.inputSchema,
        };
      }

      return toolsRecord;
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Get tools converted to AgentTools with execute functions
   * This method transforms MCP tool definitions into AgentTools that can be used directly by an Agent
   */
  async getAgentTools(): Promise<Record<string, unknown>> {
    await this.ensureConnected();

    try {
      const { tools } = await this.client.listTools();

      // Convert tools to AgentTools with execute functions
      const agentToolsRecord: Record<string, unknown> = {};

      for (const tool of tools) {
        try {
          // Convert JSON Schema to Zod schema using @dmitryrechkin/json-schema-to-zod
          const zodSchema = jsonSchemaToZod(tool.inputSchema as Record<string, unknown>);

          // Create namespaced tool name using underscore instead of period
          const namespacedToolName = `${this.clientInfo.name}_${tool.name}`;

          // Create AgentTool with both parameters and inputSchema
          // parameters is used by Vercel AI, inputSchema is used internally
          const agentTool = {
            name: namespacedToolName,
            description: tool.description || "",
            parameters: zodSchema,
            execute: async (args: Record<string, unknown>): Promise<unknown> => {
              try {
                const result = await this.callTool({
                  name: tool.name, // Use original name for actual MCP protocol call
                  arguments: args,
                });
                return result.content;
              } catch (e) {
                console.log("Error calling tool", tool.name);
                console.error(e);
                throw e;
              }
            },
          };

          // Store the tool using the namespaced name as key
          agentToolsRecord[namespacedToolName] = agentTool;
        } catch (error) {
          console.error(`Error creating agent tool for ${tool.name}:`, error);
          // Continue with next tool instead of failing completely
        }
      }

      return agentToolsRecord;
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    await this.ensureConnected();

    try {
      const result = await this.client.callTool(
        {
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        CallToolResultSchema,
        { timeout: this.timeout },
      );

      // Emit tool call event
      this.emit("toolCall", toolCall.name, toolCall.arguments, result);

      return { content: result };
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Get the list of available resources from the MCP server
   */
  async listResources(): Promise<string[]> {
    await this.ensureConnected();

    try {
      const result = await this.client.request(
        { method: "resources/list" },
        ListResourcesResultSchema,
      );

      // Map resources to their IDs
      return result.resources.map((resource: Record<string, unknown>) =>
        typeof resource.id === "string" ? resource.id : String(resource.id),
      );
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  /**
   * Ensure the client is connected before making requests
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * Convert and emit error events in a type-safe way
   */
  private emitError(error: unknown): void {
    if (error instanceof Error) {
      this.emit("error", error);
    } else {
      this.emit("error", new Error(String(error)));
    }
  }

  /**
   * Check if the server config is HTTP-based
   */
  private isHTTPServer(server: MCPServerConfig): server is HTTPServerConfig {
    return server.type === "http";
  }

  /**
   * Type guard to check if the server config is stdio-based
   */
  private isStdioServer(server: MCPServerConfig): server is StdioServerConfig {
    return server.type === "stdio";
  }

  /**
   * Override EventEmitter's on method to provide type safety
   */
  on<E extends keyof MCPClientEvents>(event: E, listener: MCPClientEvents[E]): this {
    return super.on(event, listener as (...args: any[]) => void);
  }

  /**
   * Override EventEmitter's emit method to provide type safety
   */
  emit<E extends keyof MCPClientEvents>(
    event: E,
    ...args: Parameters<MCPClientEvents[E]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
