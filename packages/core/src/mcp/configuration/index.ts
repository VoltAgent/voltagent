import { v5 as uuidv5 } from "uuid";
import { MCPClient } from "../client/index";
import type { AnyToolConfig, MCPServerConfig, ToolsetWithTools } from "../types";
import type { Tool } from "../../tool";

// Store MCP configuration instances to prevent duplicates
const mcpConfigurationInstances = new Map<string, MCPConfiguration>();

/**
 * Configuration manager for Model Context Protocol (MCP).
 * Handles multiple MCP server connections and tool management.
 * Ensures unique configuration instances based on server settings or provided ID.
 */
export class MCPConfiguration<TServerKeys extends string = string> {
  /**
   * Unique identifier for this configuration, generated based on server configurations.
   */
  private readonly id: string;

  /**
   * Map of server configurations keyed by server names.
   */
  private readonly serverConfigs: Record<TServerKeys, MCPServerConfig>;

  /**
   * Map of connected MCP clients keyed by server names.
   */
  private readonly mcpClientsById = new Map<TServerKeys, MCPClient>();

  /**
   * Creates a new MCP configuration or returns an existing one if configuration matches.
   * @param options Configuration options including server definitions and an optional unique ID.
   * @throws Error if initialized multiple times with the same configuration without a unique ID.
   */
  constructor(options: {
    id?: string;
    servers: Record<TServerKeys, MCPServerConfig>;
  }) {
    this.serverConfigs = options.servers;
    this.id = options.id ?? this.generateId();

    const existingInstance = mcpConfigurationInstances.get(this.id);
    if (existingInstance) {
      if (!options.id) {
        // Throw error if implicitly creating a duplicate configuration
        throw new Error(
          `MCPConfiguration was initialized multiple times with the same configuration options.
This can lead to memory leaks. To fix this:
1. Provide a unique 'id' in the options: new MCPConfiguration({ id: 'my-unique-id', servers: {...} })
2. Call '.disconnect()' on the previous instance before creating a new one.
3. Refactor to use a single instance if possible (e.g., move to a higher scope).`,
        );
      }
      // Workaround for TypeScript constructors not allowing direct return.
      // Copy properties from the existing instance to this new one.
      Object.assign(this, existingInstance);
    } else {
      // New configuration, add to the central cache.
      this.addToInstanceCache();
    }
  }

  /**
   * Generates a unique ID for the configuration based on server settings.
   * Uses UUIDv5 to create a deterministic ID from the JSON representation of servers.
   * @returns A unique string identifier.
   */
  private generateId(): string {
    // Normalize JSON string for consistent hashing
    const configText = JSON.stringify(this.serverConfigs);
    // Use a fixed namespace for MCPConfiguration IDs
    const namespace = uuidv5("MCPConfiguration", uuidv5.DNS);
    return uuidv5(configText, namespace);
  }

  /**
   * Adds the current instance to the global cache if not already present.
   */
  private addToInstanceCache(): void {
    if (!mcpConfigurationInstances.has(this.id)) {
      mcpConfigurationInstances.set(this.id, this);
    }
  }

  /**
   * Disconnects all associated MCP clients and removes this configuration instance from the cache.
   * Ensures cleanup of resources.
   */
  public async disconnect(): Promise<void> {
    mcpConfigurationInstances.delete(this.id);

    // Disconnect all clients concurrently
    const disconnectPromises = Array.from(this.mcpClientsById.entries()).map(
      async ([serverName, client]) => {
        try {
          await client.disconnect();
        } catch (error) {
          // Log errors during disconnect but don't let one failure stop others
          console.error(`Error disconnecting client ${serverName}:`, error);
        }
      },
    );

    await Promise.all(disconnectPromises);
    this.mcpClientsById.clear(); // Clear the map after attempting disconnection
  }

  /**
   * Retrieves agent-ready tools from all configured MCP servers.
   * Tools are namespaced with their server name (e.g., "serverName.toolName").
   * Agent-ready tools include executable functions.
   * @returns A flat array of all agent-ready tools.
   */
  public async getTools(): Promise<Tool<any>[]> {
    this.addToInstanceCache(); // Ensure instance is cached even if only getting tools

    // Create an array to hold all tools
    const allTools: Tool<any>[] = [];

    for (const [serverName, serverConfig] of Object.entries(this.serverConfigs) as [
      TServerKeys,
      MCPServerConfig,
    ][]) {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        const agentTools = await client.getAgentTools();

        // Convert tools to BaseTool and add to array
        // biome-ignore lint/complexity/noForEach: <explanation>
        Object.values(agentTools).forEach((tool) => {
          allTools.push(tool);
        });
      } catch (error) {
        console.error(`Error fetching agent tools from server ${serverName}:`, error);
      }
    }

    return allTools;
  }

  /**
   * Retrieves raw tool definitions (without execute functions) from all configured MCP servers.
   * Tools are namespaced with their server name (e.g., "serverName.toolName").
   * @returns A flat record of all raw tools keyed by their namespaced name.
   */
  public async getRawTools(): Promise<Record<string, AnyToolConfig>> {
    this.addToInstanceCache();
    const allRawTools: Record<string, AnyToolConfig> = {};

    await this.forEachClientRawTools(async ({ serverName, tools }) => {
      // Namespace tools with server name
      for (const [toolName, toolConfig] of Object.entries(tools)) {
        allRawTools[`${serverName}.${toolName}`] = toolConfig;
      }
    });

    return allRawTools;
  }

  /**
   * Retrieves agent-ready toolsets grouped by server name.
   * Each toolset contains tools with executable functions for a specific server.
   * @returns A record where keys are server names and values are records of agent-ready tools for that server.
   */
  public async getToolsets(): Promise<Record<TServerKeys, ToolsetWithTools>> {
    this.addToInstanceCache();
    const agentToolsets = {} as Record<TServerKeys, ToolsetWithTools>;

    for (const [serverName, serverConfig] of Object.entries(this.serverConfigs) as [
      TServerKeys,
      MCPServerConfig,
    ][]) {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        // Get tools from client
        const agentTools = await client.getAgentTools();

        // Add toolset if it contains any tools
        if (Object.keys(agentTools).length > 0) {
          // Create a proper toolset with the toTools method
          const toolsetWithTools = { ...agentTools } as ToolsetWithTools;

          // Add the toTools method
          toolsetWithTools.getTools = () => Object.values(agentTools) as Tool<any>[];

          // Store in toolsets
          agentToolsets[serverName] = toolsetWithTools;
        }
      } catch (error) {
        console.error(`Error fetching agent toolset for server ${serverName}:`, error);
        // Optionally re-throw or handle otherwise
      }
    }

    return agentToolsets;
  }

  /**
   * Retrieves raw tool definitions (without execute functions) grouped by server name.
   * @returns A record where keys are server names and values are records of raw tools for that server.
   */
  public async getRawToolsets(): Promise<Record<TServerKeys, Record<string, AnyToolConfig>>> {
    this.addToInstanceCache();
    const rawToolsets = {} as Record<TServerKeys, Record<string, AnyToolConfig>>;

    await this.forEachClientRawTools(async ({ serverName, tools }) => {
      // Add toolset if it contains any tools
      if (Object.keys(tools).length > 0) {
        rawToolsets[serverName] = tools;
      }
    });

    return rawToolsets;
  }

  /**
   * Retrieves a specific connected MCP client by its server name.
   * Connects the client if it's not already connected.
   * @param serverName The name of the server/client to retrieve.
   * @returns The connected MCPClient instance or undefined if the server name is not configured.
   */
  public async getClient(serverName: TServerKeys): Promise<MCPClient | undefined> {
    const serverConfig = this.serverConfigs[serverName];
    if (!serverConfig) {
      console.warn(`No configuration found for server: ${serverName}`);
      return undefined;
    }
    // Ensure instance is cached when accessing clients
    this.addToInstanceCache();
    return this.getConnectedClient(serverName, serverConfig);
  }

  /**
   * Retrieves all configured MCP clients, ensuring they are connected.
   * @returns A record of connected MCPClient instances keyed by server name.
   */
  public async getClients(): Promise<Record<TServerKeys, MCPClient>> {
    this.addToInstanceCache(); // Ensure instance is cached
    const clients = {} as Record<TServerKeys, MCPClient>;

    for (const [serverName, serverConfig] of Object.entries(this.serverConfigs) as [
      TServerKeys,
      MCPServerConfig,
    ][]) {
      try {
        clients[serverName] = await this.getConnectedClient(serverName, serverConfig);
      } catch (error) {
        console.error(`Failed to connect client for server ${serverName}:`, error);
        // Decide if failure to connect one client should prevent returning others
        // Currently, it logs the error and continues.
      }
    }
    return clients;
  }

  /**
   * Gets or creates an MCP client connection for a given server configuration.
   * Ensures the client is connected before returning. Handles connection errors.
   * @param name The server name (key).
   * @param config The server configuration.
   * @returns A promise resolving to the connected MCPClient.
   * @throws Error if connection fails.
   */
  private async getConnectedClient(name: TServerKeys, config: MCPServerConfig): Promise<MCPClient> {
    // Return existing client if already connected and connection is healthy (implicitly checked by connect)
    if (this.mcpClientsById.has(name)) {
      const client = this.mcpClientsById.get(name);
      if (client) {
        try {
          await client.connect(); // Re-ensure connection is active
          return client;
        } catch (connectionError) {
          console.error(
            `Reconnection failed for client ${name}, attempting to recreate:`,
            connectionError,
          );
          this.mcpClientsById.delete(name); // Remove potentially stale client
        }
      }
    }

    // Create, connect, and store a new client
    console.debug(`Connecting to MCP server: ${name as string}`);
    const client = new MCPClient({
      clientInfo: {
        name: name as string, // Assuming name is suitable client info name
        version: "1.0.0", // Consider making version configurable or dynamic
      },
      server: config,
    });

    try {
      await client.connect();
      this.mcpClientsById.set(name, client); // Store only after successful connection
      console.debug(`Successfully connected to MCP server: ${name as string}`);
      return client;
    } catch (error) {
      // Ensure client is not stored in map if connection fails
      this.mcpClientsById.delete(name);
      console.error(`Failed to connect to MCP server ${name}:`, error);
      // Re-throw the error to propagate it to the caller
      throw error;
    }
  }

  /**
   * Executes a callback for each configured server, providing the raw tools listed by the client.
   * Handles connection and tool listing errors internally.
   * @param callback Async function to execute for each server's raw tools.
   */
  private async forEachClientRawTools(
    callback: (params: {
      serverName: TServerKeys;
      tools: Record<string, AnyToolConfig>; // Using AnyToolConfig
      client: MCPClient;
    }) => Promise<void>,
  ): Promise<void> {
    for (const [serverName, serverConfig] of Object.entries(this.serverConfigs) as [
      TServerKeys,
      MCPServerConfig,
    ][]) {
      try {
        const client = await this.getConnectedClient(serverName, serverConfig);
        // Assert the type returned by listTools
        const rawTools = (await client.listTools()) as Record<string, AnyToolConfig>;
        // Pass the correctly typed rawTools to the callback
        await callback({ serverName, tools: rawTools, client });
      } catch (error) {
        // Log error and continue with the next server
        console.error(`Error processing raw tools for server ${serverName}:`, error);
      }
    }
  }
}
