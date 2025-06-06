import type { Tool } from "../../tool";
import { MCPClient } from "../client/index";
import type { AnyToolConfig, MCPServerConfig, ToolsetWithTools } from "../types";

// Removed global configurationRegistry Map

// Helper Type Guard function
function isToolStructure(
  obj: unknown,
): obj is { name: string; description: string; inputSchema: unknown } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    typeof obj.name === "string" &&
    "description" in obj &&
    typeof obj.description === "string" &&
    "inputSchema" in obj
  );
}

/**
 * Configuration manager for Model Context Protocol (MCP).
 * Handles multiple MCP server connections and tool management.
 * NOTE: This version does NOT manage singleton instances automatically.
 */
export class MCPConfiguration<TServerKeys extends string = string> {
  /**
   * Map of server configurations keyed by server names.
   */
  private readonly serverConfigs: Record<TServerKeys, MCPServerConfig>;

  /**
   * Map of connected MCP clients keyed by server names (local cache).
   */
  private readonly mcpClientsById = new Map<TServerKeys, MCPClient>();

  /**
   * Creates a new, independent MCP configuration instance.
   * @param options Configuration options including server definitions.
   */
  constructor(options: {
    servers: Record<TServerKeys, MCPServerConfig>;
  }) {
    this.serverConfigs = options.servers;
  }

  /**
   * Type guard to check if an object conforms to the basic structure of AnyToolConfig.
   */
  private isAnyToolConfigStructure(config: unknown): config is AnyToolConfig {
    return isToolStructure(config);
  }

  /**
   * Disconnects all associated MCP clients for THIS instance.
   */
  public async disconnect(): Promise<void> {
    const disconnectionTasks = [...this.mcpClientsById.values()].map((client) =>
      client.disconnect().catch((error) => {
        let serverName = "unknown";
        for (const [key, value] of this.mcpClientsById.entries()) {
          if (value === client) {
            serverName = key as string;
            break;
          }
        }
        console.error(`Error disconnecting client ${serverName}:`, error);
      }),
    );

    await Promise.all(disconnectionTasks);
    this.mcpClientsById.clear(); // Clear local client cache for this instance
  }

  /**
   * Retrieves agent-ready tools from all configured MCP servers for this instance.
   * @returns A flat array of all agent-ready tools.
   */
  public async getTools(): Promise<Tool<any>[]> {
    const serverEntries = Object.entries(this.serverConfigs) as [TServerKeys, MCPServerConfig][];

    const toolFetchingTasks = serverEntries.map(async ([serverName, serverConfig]) => {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        const agentTools = await client.getAgentTools();
        return Object.values(agentTools);
      } catch (error) {
        console.error(`Error fetching agent tools from server ${serverName}:`, error);
        return []; // Return empty array for this server on error
      }
    });

    const toolArrays = await Promise.all(toolFetchingTasks);
    // Flatten the array of arrays into a single array
    return toolArrays.flat();
  }

  /**
   * Retrieves raw tool definitions from all configured MCP servers for this instance.
   * @returns A flat record of all raw tools keyed by their namespaced name.
   */
  public async getRawTools(): Promise<Record<string, AnyToolConfig>> {
    const allRawTools: Record<string, AnyToolConfig> = {};
    const serverEntries = Object.entries(this.serverConfigs) as [TServerKeys, MCPServerConfig][];

    const rawToolFetchingTasks = serverEntries.map(async ([serverName, serverConfig]) => {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        const rawToolsResult: unknown = await client.listTools();
        return { serverName, rawToolsResult };
      } catch (error) {
        console.error(`Error fetching raw tools from server ${serverName}:`, error);
        return null;
      }
    });

    const results = await Promise.all(rawToolFetchingTasks);

    for (const result of results) {
      if (result && typeof result.rawToolsResult === "object" && result.rawToolsResult !== null) {
        // biome-ignore lint/suspicious/noExplicitAny: Trusting type check before using Object.entries on unknown
        for (const [toolName, toolConfig] of Object.entries(result.rawToolsResult)) {
          if (this.isAnyToolConfigStructure(toolConfig)) {
            allRawTools[`${result.serverName}.${toolName}`] = toolConfig;
          } else {
            console.warn(
              `Tool '${toolName}' from server '${result.serverName}' has unexpected structure, skipping.`,
            );
          }
        }
      }
    }

    return allRawTools;
  }

  /**
   * Retrieves agent-ready toolsets grouped by server name for this instance.
   * @returns A record where keys are server names and values are agent-ready toolsets.
   */
  public async getToolsets(): Promise<Record<TServerKeys, ToolsetWithTools>> {
    const agentToolsets = {} as Record<TServerKeys, ToolsetWithTools>;
    const serverEntries = Object.entries(this.serverConfigs) as [TServerKeys, MCPServerConfig][];

    const toolsetFetchingTasks = serverEntries.map(async ([serverName, serverConfig]) => {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        const agentTools = await client.getAgentTools();

        if (Object.keys(agentTools).length > 0) {
          const baseToolset: Record<string, Tool<any>> = { ...agentTools };
          const toolset: ToolsetWithTools = Object.assign(baseToolset, {
            getTools: () => Object.values(agentTools) as Tool<any>[],
          });
          return { serverName, toolset };
        }
      } catch (error) {
        console.error(`Error fetching agent toolset for server ${serverName}:`, error);
      }
      return null; // Indicate failure or no tools for this server
    });

    const results = await Promise.all(toolsetFetchingTasks);

    // Populate the final toolsets object
    for (const result of results) {
      if (result) {
        agentToolsets[result.serverName] = result.toolset;
      }
    }

    return agentToolsets;
  }

  /**
   * Retrieves raw tool definitions grouped by server name for this instance.
   * @returns A record where keys are server names and values are records of raw tools.
   */
  public async getRawToolsets(): Promise<Record<TServerKeys, Record<string, AnyToolConfig>>> {
    const rawToolsets = {} as Record<TServerKeys, Record<string, AnyToolConfig>>;
    const serverEntries = Object.entries(this.serverConfigs) as [TServerKeys, MCPServerConfig][];

    const rawToolFetchingTasks = serverEntries.map(async ([serverName, serverConfig]) => {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        const rawToolsResult: unknown = await client.listTools();

        if (
          rawToolsResult &&
          typeof rawToolsResult === "object" &&
          Object.keys(rawToolsResult).length > 0
        ) {
          // biome-ignore lint/suspicious/noExplicitAny: Trusting type check before using Object.values on unknown
          const allValuesValid = Object.values(rawToolsResult).every((config) =>
            this.isAnyToolConfigStructure(config),
          );

          if (allValuesValid) {
            // biome-ignore lint/suspicious/noExplicitAny: Cast needed after runtime validation of structure
            return {
              serverName,
              rawToolsResult: rawToolsResult as Record<string, AnyToolConfig>,
            };
          } else {
            console.warn(
              `Not all tools from server '${serverName}' have the expected structure, skipping toolset.`,
            );
          }
        }
      } catch (error) {
        console.error(`Error fetching raw toolset for server ${serverName}:`, error);
      }
      return null;
    });

    const results = await Promise.all(rawToolFetchingTasks);

    for (const result of results) {
      if (result) {
        // Type already asserted in the map function
        rawToolsets[result.serverName] = result.rawToolsResult;
      }
    }

    return rawToolsets;
  }

  /**
   * Retrieves a specific connected MCP client by its server name for this instance.
   */
  public async getClient(serverName: TServerKeys): Promise<MCPClient | undefined> {
    const serverConfig = this.serverConfigs[serverName];
    if (!serverConfig) {
      console.warn(`No configuration found for server: ${serverName}`);
      return undefined;
    }
    try {
      return await this.getConnectedClient(serverName, serverConfig);
    } catch (error) {
      // Errors are logged within getConnectedClient, return undefined on failure
      return undefined;
    }
  }

  /**
   * Retrieves all configured MCP clients for this instance, ensuring they are connected.
   */
  public async getClients(): Promise<Record<TServerKeys, MCPClient>> {
    const clients = {} as Record<TServerKeys, MCPClient>;
    const serverEntries = Object.entries(this.serverConfigs) as [TServerKeys, MCPServerConfig][];

    // Concurrently get or connect all clients
    const clientFetchingTasks = serverEntries.map(async ([serverName, serverConfig]) => {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        return { serverName, client };
      } catch (error) {
        // Error already logged by getConnectedClient
        return null; // Indicate failure for this client
      }
    });

    const results = await Promise.all(clientFetchingTasks);

    // Populate the clients object, skipping failed ones
    for (const result of results) {
      if (result) {
        clients[result.serverName] = result.client;
      }
    }

    return clients;
  }

  /**
   * Internal helper to get/create/connect a client for this instance.
   * Manages the local mcpClientsById cache.
   */
  private async getConnectedClient(
    serverName: TServerKeys,
    config: MCPServerConfig,
  ): Promise<MCPClient> {
    const cachedClient = this.mcpClientsById.get(serverName);

    if (cachedClient) {
      try {
        await cachedClient.connect();
        return cachedClient;
      } catch (connectionError) {
        console.warn(
          `Reconnection check failed for client ${serverName}, attempting recreation:`,
          connectionError instanceof Error ? connectionError.message : String(connectionError),
        );
        this.mcpClientsById.delete(serverName);
      }
    }

    console.debug(`Creating new MCP connection for server: ${serverName as string}`);
    const newClient = new MCPClient({
      clientInfo: {
        name: serverName as string,
        version: "1.0.0",
      },
      server: config,
    });

    try {
      await newClient.connect();
      this.mcpClientsById.set(serverName, newClient);
      console.debug(`Successfully connected to MCP server: ${serverName as string}`);
      return newClient;
    } catch (initialConnectionError) {
      this.mcpClientsById.delete(serverName);
      console.error(`Failed to connect to MCP server ${serverName}:`, initialConnectionError);
      throw new Error(
        `Connection failure for server ${serverName}: ${initialConnectionError instanceof Error ? initialConnectionError.message : String(initialConnectionError)}`,
      );
    }
  }
}
