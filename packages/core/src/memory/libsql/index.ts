import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Client, Row } from "@libsql/client";
import { createClient } from "@libsql/client";
import type { BaseMessage } from "../../agent/providers/base/types";
import type {
  Conversation,
  CreateConversationInput,
  Memory,
  MemoryMessage,
  MemoryOptions,
  MessageFilterOptions,
} from "../types";

/**
 * Function to add a delay between 0-0 seconds for debugging
 */
async function debugDelay(): Promise<void> {
  const min = 0; // 0 seconds
  const max = 0; // 0 seconds
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Options for configuring the LibSQLStorage
 */
export interface LibSQLStorageOptions extends MemoryOptions {
  /**
   * LibSQL connection URL
   * Can be either a remote Turso URL or a local file path
   * @example "libsql://your-database.turso.io" for remote Turso
   * @example "file:memory.db" for local SQLite in current directory
   * @example "file:.voltagent/memory.db" for local SQLite in .voltagent folder
   */
  url: string;

  /**
   * Auth token for LibSQL/Turso
   * Not needed for local SQLite
   */
  authToken?: string;

  /**
   * Prefix for table names
   * @default "voltagent_memory"
   */
  tablePrefix?: string;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Storage limit for the LibSQLStorage
   * @default 100
   */
  storageLimit?: number;
}

/**
 * A LibSQL storage implementation of the Memory interface
 * Uses libsql/Turso to store and retrieve conversation history
 *
 * This implementation automatically handles both:
 * - Remote Turso databases (with libsql:// URLs)
 * - Local SQLite databases (with file: URLs)
 */
export class LibSQLStorage implements Memory {
  private client: Client;
  private options: LibSQLStorageOptions;
  private initialized: Promise<void>;

  /**
   * Create a new LibSQL storage
   * @param options Configuration options
   */
  constructor(options: LibSQLStorageOptions) {
    this.options = {
      storageLimit: options.storageLimit || 100,
      tablePrefix: options.tablePrefix || "voltagent_memory",
      debug: options.debug || false,
      url: this.normalizeUrl(options.url),
      authToken: options.authToken,
    };

    // Initialize the LibSQL client
    this.client = createClient({
      url: this.options.url,
      authToken: this.options.authToken,
    });

    this.debug("LibSQL storage provider initialized with options", this.options);

    // Initialize the database tables
    this.initialized = this.initializeDatabase();
  }

  /**
   * Normalize the URL for SQLite database
   * - Ensures local files exist in the correct directory
   * - Creates the .voltagent directory if needed for default storage
   */
  private normalizeUrl(url: string): string {
    // If it's a remote URL, return as is
    if (url.startsWith("libsql://")) {
      return url;
    }

    // Handle file URLs
    if (url.startsWith("file:")) {
      const filePath = url.substring(5); // Remove 'file:' prefix

      // If it's a relative path without directory separators, use the default .voltagent directory
      if (!filePath.includes("/") && !filePath.includes("\\")) {
        try {
          // Create .voltagent directory if it doesn't exist
          const dirPath = join(process.cwd(), ".voltagent");
          const fs = require("node:fs");
          if (!existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          return `file:${join(dirPath, filePath)}`;
        } catch (error) {
          // If we can't create the directory, fall back to current directory
          this.debug("Failed to create .voltagent directory, using current directory", error);
          return url;
        }
      }
    }

    return url;
  }

  /**
   * Log a debug message if debug is enabled
   * @param message Message to log
   * @param data Additional data to log
   */
  private debug(message: string, data?: unknown): void {
    if (this.options?.debug) {
      console.log(`[LibSQLStorage] ${message}`, data || "");
    }
  }

  /**
   * Initialize the database tables
   * @returns Promise that resolves when initialization is complete
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Create conversations table if it doesn't exist
      const conversationsTableName = `${this.options.tablePrefix}_conversations`;

      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${conversationsTableName} (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          title TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create messages table if it doesn't exist
      const messagesTableName = `${this.options.tablePrefix}_messages`;

      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${messagesTableName} (
          user_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (user_id, conversation_id, message_id)
        )
      `);

      // Create agent_history table
      const historyTableName = `${this.options.tablePrefix}_agent_history`;
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${historyTableName} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          agent_id TEXT
        )
      `);

      // Create agent_history_events table
      const historyEventsTableName = `${this.options.tablePrefix}_agent_history_events`;
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${historyEventsTableName} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          history_id TEXT NOT NULL,
          agent_id TEXT
        )
      `);

      // Create agent_history_steps table
      const historyStepsTableName = `${this.options.tablePrefix}_agent_history_steps`;
      await this.client.execute(`
        CREATE TABLE IF NOT EXISTS ${historyStepsTableName} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          history_id TEXT NOT NULL,
          agent_id TEXT
        )
      `);

      // Create index for faster queries
      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${messagesTableName}_lookup
        ON ${messagesTableName}(user_id, conversation_id, created_at)
      `);

      // Create index for conversations
      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${conversationsTableName}_resource
        ON ${conversationsTableName}(resource_id)
      `);

      // Create indexes for history tables
      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${historyEventsTableName}_history_id 
        ON ${historyEventsTableName}(history_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${historyStepsTableName}_history_id 
        ON ${historyStepsTableName}(history_id)
      `);

      // Create indexes for agent_id for more efficient querying
      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${historyTableName}_agent_id 
        ON ${historyTableName}(agent_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${historyEventsTableName}_agent_id 
        ON ${historyEventsTableName}(agent_id)
      `);

      await this.client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${historyStepsTableName}_agent_id 
        ON ${historyStepsTableName}(agent_id)
      `);

      this.debug("Database initialized successfully");
    } catch (error) {
      this.debug("Error initializing database:", error);
      throw new Error("Failed to initialize LibSQL database");
    }
  }

  /**
   * Generate a unique ID for a message
   * @returns Unique ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Get messages with filtering options
   * @param options Filtering options
   * @returns Filtered messages
   */
  async getMessages(options: MessageFilterOptions = {}): Promise<MemoryMessage[]> {
    // Wait for database initialization
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    const {
      userId = "default",
      conversationId = "default",
      limit = this.options.storageLimit,
      before,
      after,
      role,
    } = options;

    this.debug(
      `Getting messages for user ${userId} and conversation ${conversationId} with options`,
      options,
    );

    const tableName = `${this.options.tablePrefix}_messages`;

    // Build the SQL query with filters
    let sql = `SELECT role, content, type, created_at FROM ${tableName} WHERE user_id = ? AND conversation_id = ?`;
    const params: any[] = [userId, conversationId];

    // Add role filter if specified
    if (role) {
      sql += " AND role = ?";
      params.push(role);
    }

    // Add created_at filters if specified
    if (before) {
      sql += " AND created_at < ?";
      params.push(before);
    }

    if (after) {
      sql += " AND created_at > ?";
      params.push(after);
    }

    // Order by created_at
    sql += " ORDER BY created_at ASC";

    // Add limit if specified
    if (limit && limit > 0) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    try {
      const result = await this.client.execute({
        sql,
        args: params,
      });

      // Convert the database rows to BaseMessage objects
      return result.rows.map((row: Row) => {
        return {
          id: row.message_id as string,
          role: row.role as BaseMessage["role"],
          content: row.content as string,
          type: row.type as "text" | "tool-call" | "tool-result",
          createdAt: row.created_at as string,
        };
      });
    } catch (error) {
      this.debug("Error fetching messages:", error);
      throw new Error("Failed to fetch messages from LibSQL database");
    }
  }

  /**
   * Add a message to the conversation history
   * @param message Message to add
   * @param userId User identifier (optional, defaults to "default")
   * @param conversationId Conversation identifier (optional, defaults to "default")
   */
  async addMessage(
    message: MemoryMessage,
    userId = "default",
    conversationId = "default",
  ): Promise<void> {
    // Wait for database initialization
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    this.debug(`Adding message for user ${userId} and conversation ${conversationId}`, message);

    const tableName = `${this.options.tablePrefix}_messages`;
    const messageId = this.generateId();

    // Convert the message content to a JSON string
    const contentString = JSON.stringify(message.content);

    try {
      // Insert the message into the database
      await this.client.execute({
        sql: `INSERT INTO ${tableName} (user_id, conversation_id, message_id, role, content, type, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          conversationId,
          messageId,
          message.role,
          contentString,
          message.type,
          message.createdAt,
        ],
      });

      // If we have a storage limit, clean up old messages
      if (this.options.storageLimit && this.options.storageLimit > 0) {
        // Get the count of messages for this user/conversation
        const countResult = await this.client.execute({
          sql: `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = ? AND conversation_id = ?`,
          args: [userId, conversationId],
        });

        const count = countResult.rows[0].count as number;

        // If we have more messages than the limit, delete the oldest ones
        if (count > this.options.storageLimit) {
          await this.client.execute({
            sql: `DELETE FROM ${tableName} 
                  WHERE user_id = ? AND conversation_id = ? 
                  AND message_id IN (
                    SELECT message_id FROM ${tableName} 
                    WHERE user_id = ? AND conversation_id = ?
                    ORDER BY created_at ASC
                    LIMIT ?
                  )`,
            args: [
              userId,
              conversationId,
              userId,
              conversationId,
              count - this.options.storageLimit,
            ],
          });
        }
      }
    } catch (error) {
      this.debug("Error adding message:", error);
      throw new Error("Failed to add message to LibSQL database");
    }
  }

  /**
   * Clear messages from memory
   */
  async clearMessages(options: { userId: string; conversationId?: string }): Promise<void> {
    // Wait for database initialization
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    const { userId, conversationId = "default" } = options;
    const tableName = `${this.options.tablePrefix}_messages`;

    try {
      await this.client.execute({
        sql: `DELETE FROM ${tableName} WHERE user_id = ? AND conversation_id = ?`,
        args: [userId, conversationId],
      });

      this.debug(`Cleared messages for user ${userId} and conversation ${conversationId}`);
    } catch (error) {
      this.debug("Error clearing messages:", error);
      throw new Error("Failed to clear messages from LibSQL database");
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.client.close();
  }

  /**
   * Add or update a history entry
   * @param key Entry ID
   * @param value Entry data
   * @param agentId Agent ID for filtering
   */
  async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    await this.initialized;

    try {
      const tableName = `${this.options.tablePrefix}_agent_history`;

      // Serialize value to JSON
      const serializedValue = JSON.stringify(value);

      // Insert or replace the value with agent_id
      await this.client.execute({
        sql: `INSERT OR REPLACE INTO ${tableName} (key, value, agent_id) VALUES (?, ?, ?)`,
        args: [key, serializedValue, agentId],
      });

      this.debug(`Set agent_history:${key} for agent ${agentId}`);
    } catch (error) {
      this.debug(`Error setting agent_history:${key}`, error);
      throw new Error(`Failed to set value in agent_history`);
    }
  }

  /**
   * Update an existing history entry
   * @param key Entry ID
   * @param value Updated entry data
   * @param agentId Agent ID for filtering
   */
  async updateHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    // Same implementation as addHistoryEntry since it uses INSERT OR REPLACE
    return this.addHistoryEntry(key, value, agentId);
  }

  /**
   * Add a history event
   * @param key Event ID
   * @param value Event data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  async addHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    await this.initialized;

    try {
      const tableName = `${this.options.tablePrefix}_agent_history_events`;

      // Serialize value to JSON
      const serializedValue = JSON.stringify(value);

      // Insert or replace with history_id and agent_id columns
      await this.client.execute({
        sql: `INSERT OR REPLACE INTO ${tableName} (key, value, history_id, agent_id) VALUES (?, ?, ?, ?)`,
        args: [key, serializedValue, historyId, agentId],
      });

      this.debug(`Set agent_history_events:${key} for history ${historyId} and agent ${agentId}`);
    } catch (error) {
      this.debug(`Error setting agent_history_events:${key}`, error);
      throw new Error(`Failed to set value in agent_history_events`);
    }
  }

  /**
   * Update a history event
   * @param key Event ID
   * @param value Updated event data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  async updateHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    // Just call addHistoryEvent as the behavior is the same
    return this.addHistoryEvent(key, value, historyId, agentId);
  }

  /**
   * Add a history step
   * @param key Step ID
   * @param value Step data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  async addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void> {
    await this.initialized;

    try {
      const tableName = `${this.options.tablePrefix}_agent_history_steps`;

      // Serialize value to JSON
      const serializedValue = JSON.stringify(value);

      // Insert or replace with history_id and agent_id columns
      await this.client.execute({
        sql: `INSERT OR REPLACE INTO ${tableName} (key, value, history_id, agent_id) VALUES (?, ?, ?, ?)`,
        args: [key, serializedValue, historyId, agentId],
      });

      this.debug(`Set agent_history_steps:${key} for history ${historyId} and agent ${agentId}`);
    } catch (error) {
      this.debug(`Error setting agent_history_steps:${key}`, error);
      throw new Error(`Failed to set value in agent_history_steps`);
    }
  }

  /**
   * Update a history step
   * @param key Step ID
   * @param value Updated step data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  async updateHistoryStep(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    // Just call addHistoryStep as the behavior is the same
    return this.addHistoryStep(key, value, historyId, agentId);
  }

  /**
   * Get a history entry by ID
   * @param key Entry ID
   * @returns The history entry or undefined if not found
   */
  async getHistoryEntry(key: string): Promise<any | undefined> {
    await this.initialized;

    try {
      const tableName = `${this.options.tablePrefix}_agent_history`;

      // Get the value
      const result = await this.client.execute({
        sql: `SELECT value FROM ${tableName} WHERE key = ?`,
        args: [key],
      });

      if (result.rows.length === 0) {
        this.debug(`History entry with ID ${key} not found`);
        return undefined;
      }

      // Parse the JSON value
      const value = JSON.parse(result.rows[0].value as string);
      this.debug(`Got history entry with ID ${key}`);

      // Now also get related events
      const eventsTableName = `${this.options.tablePrefix}_agent_history_events`;
      const eventsResult = await this.client.execute({
        sql: `SELECT value FROM ${eventsTableName} WHERE history_id = ? AND agent_id = ?`,
        args: [key, value._agentId],
      });

      // Parse and transform events
      const events = eventsResult.rows
        .map((row) => {
          const event = JSON.parse(row.value as string);
          return {
            id: event.id,
            timestamp: event.timestamp,
            name: event.name,
            type: event.type,
            affectedNodeId: event.affectedNodeId,
            data: {
              ...event.metadata,
              _trackedEventId: event._trackedEventId,
              affectedNodeId: event.affectedNodeId,
            },
            updatedAt: event.updated_at,
          };
        })
        .sort((a, b) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

      // Now also get related steps
      const stepsTableName = `${this.options.tablePrefix}_agent_history_steps`;
      const stepsResult = await this.client.execute({
        sql: `SELECT value FROM ${stepsTableName} WHERE history_id = ? AND agent_id = ?`,
        args: [key, value._agentId],
      });

      // Parse and transform steps
      const steps = stepsResult.rows.map((row) => {
        const step = JSON.parse(row.value as string);
        return {
          type: step.type,
          name: step.name,
          content: step.content,
          arguments: step.arguments,
        };
      });

      // Add events and steps to the entry
      value.events = events;
      value.steps = steps;

      return value;
    } catch (error) {
      this.debug(`Error getting history entry with ID ${key}`, error);
      return undefined;
    }
  }

  /**
   * Get a history event by ID
   * @param key Event ID
   * @returns The history event or undefined if not found
   */
  async getHistoryEvent(key: string): Promise<any | undefined> {
    await this.initialized;

    try {
      const tableName = `${this.options.tablePrefix}_agent_history_events`;

      // Get the value
      const result = await this.client.execute({
        sql: `SELECT value FROM ${tableName} WHERE key = ?`,
        args: [key],
      });

      if (result.rows.length === 0) {
        this.debug(`History event with ID ${key} not found`);
        return undefined;
      }

      // Parse the JSON value
      const value = JSON.parse(result.rows[0].value as string);
      this.debug(`Got history event with ID ${key}`);
      return value;
    } catch (error) {
      this.debug(`Error getting history event with ID ${key}`, error);
      return undefined;
    }
  }

  /**
   * Get a history step by ID
   * @param key Step ID
   * @returns The history step or undefined if not found
   */
  async getHistoryStep(key: string): Promise<any | undefined> {
    await this.initialized;

    try {
      const tableName = `${this.options.tablePrefix}_agent_history_steps`;

      // Get the value
      const result = await this.client.execute({
        sql: `SELECT value FROM ${tableName} WHERE key = ?`,
        args: [key],
      });

      if (result.rows.length === 0) {
        this.debug(`History step with ID ${key} not found`);
        return undefined;
      }

      // Parse the JSON value
      const value = JSON.parse(result.rows[0].value as string);
      this.debug(`Got history step with ID ${key}`);
      return value;
    } catch (error) {
      this.debug(`Error getting history step with ID ${key}`, error);
      return undefined;
    }
  }

  async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    const now = new Date().toISOString();
    const metadataString = JSON.stringify(conversation.metadata);

    const tableName = `${this.options.tablePrefix}_conversations`;

    try {
      await this.client.execute({
        sql: `INSERT INTO ${tableName} (id, resource_id, title, metadata, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          conversation.id,
          conversation.resourceId,
          conversation.title,
          metadataString,
          now,
          now,
        ],
      });

      return {
        id: conversation.id,
        resourceId: conversation.resourceId,
        title: conversation.title,
        metadata: conversation.metadata,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.debug("Error creating conversation:", error);
      throw new Error("Failed to create conversation in LibSQL database");
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    const tableName = `${this.options.tablePrefix}_conversations`;

    try {
      const result = await this.client.execute({
        sql: `SELECT * FROM ${tableName} WHERE id = ?`,
        args: [id],
      });

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id as string,
        resourceId: row.resource_id as string,
        title: row.title as string,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };
    } catch (error) {
      this.debug("Error getting conversation:", error);
      throw new Error("Failed to get conversation from LibSQL database");
    }
  }

  async getConversations(resourceId: string): Promise<Conversation[]> {
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    const tableName = `${this.options.tablePrefix}_conversations`;

    try {
      const result = await this.client.execute({
        sql: `SELECT * FROM ${tableName} WHERE resource_id = ? ORDER BY updated_at DESC`,
        args: [resourceId],
      });

      return result.rows.map((row) => ({
        id: row.id as string,
        resourceId: row.resource_id as string,
        title: row.title as string,
        metadata: JSON.parse(row.metadata as string),
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }));
    } catch (error) {
      this.debug("Error getting conversations:", error);
      throw new Error("Failed to get conversations from LibSQL database");
    }
  }

  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    const tableName = `${this.options.tablePrefix}_conversations`;
    const now = new Date().toISOString();

    try {
      const updatesList: string[] = [];
      const args: any[] = [];

      if (updates.resourceId !== undefined) {
        updatesList.push("resource_id = ?");
        args.push(updates.resourceId);
      }

      if (updates.title !== undefined) {
        updatesList.push("title = ?");
        args.push(updates.title);
      }

      if (updates.metadata !== undefined) {
        updatesList.push("metadata = ?");
        args.push(JSON.stringify(updates.metadata));
      }

      updatesList.push("updated_at = ?");
      args.push(now);
      args.push(id);

      await this.client.execute({
        sql: `UPDATE ${tableName} SET ${updatesList.join(", ")} WHERE id = ?`,
        args,
      });

      const updated = await this.getConversation(id);
      if (!updated) {
        throw new Error("Conversation not found after update");
      }

      return updated;
    } catch (error) {
      this.debug("Error updating conversation:", error);
      throw new Error("Failed to update conversation in LibSQL database");
    }
  }

  async deleteConversation(id: string): Promise<void> {
    await this.initialized;

    // Add delay for debugging
    await debugDelay();

    const conversationsTableName = `${this.options.tablePrefix}_conversations`;
    const messagesTableName = `${this.options.tablePrefix}_messages`;

    try {
      // Delete all messages in the conversation
      await this.client.execute({
        sql: `DELETE FROM ${messagesTableName} WHERE conversation_id = ?`,
        args: [id],
      });

      // Delete the conversation
      await this.client.execute({
        sql: `DELETE FROM ${conversationsTableName} WHERE id = ?`,
        args: [id],
      });
    } catch (error) {
      this.debug("Error deleting conversation:", error);
      throw new Error("Failed to delete conversation from LibSQL database");
    }
  }

  /**
   * Get all history entries for an agent
   * @param agentId Agent ID
   * @returns Array of all history entries for the agent
   */
  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    await this.initialized;

    try {
      const tableName = `${this.options.tablePrefix}_agent_history`;

      // Get all entries for the specified agent ID
      const result = await this.client.execute({
        sql: `SELECT value FROM ${tableName} WHERE agent_id = ?`,
        args: [agentId],
      });

      // Parse all JSON values
      const entries = result.rows.map((row) => JSON.parse(row.value as string));
      this.debug(`Got all history entries for agent ${agentId} (${entries.length} items)`);

      // Now fetch events and steps for each entry
      const completeEntries = await Promise.all(
        entries.map(async (entry) => {
          // Get events for this entry
          const eventsTableName = `${this.options.tablePrefix}_agent_history_events`;
          const eventsResult = await this.client.execute({
            sql: `SELECT value FROM ${eventsTableName} WHERE history_id = ? AND agent_id = ?`,
            args: [entry.id, agentId],
          });

          // Parse and transform events
          const events = eventsResult.rows
            .map((row) => {
              const event = JSON.parse(row.value as string);
              return {
                id: event.id,
                timestamp: event.timestamp,
                name: event.name,
                type: event.type,
                affectedNodeId: event.affectedNodeId,
                data: {
                  ...event.metadata,
                  _trackedEventId: event._trackedEventId,
                  affectedNodeId: event.affectedNodeId,
                },
                updatedAt: event.updated_at,
              };
            })
            .sort((a, b) => {
              return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });

          // Get steps for this entry
          const stepsTableName = `${this.options.tablePrefix}_agent_history_steps`;
          const stepsResult = await this.client.execute({
            sql: `SELECT value FROM ${stepsTableName} WHERE history_id = ? AND agent_id = ?`,
            args: [entry.id, agentId],
          });

          // Parse and transform steps
          const steps = stepsResult.rows.map((row) => {
            const step = JSON.parse(row.value as string);
            return {
              type: step.type,
              name: step.name,
              content: step.content,
              arguments: step.arguments,
            };
          });

          // Add events and steps to the entry
          entry.events = events;
          entry.steps = steps;

          return entry;
        }),
      );

      // Sort by timestamp (newest first)
      return completeEntries;
    } catch (error) {
      this.debug(`Error getting history entries for agent ${agentId}`, error);
      return [];
    }
  }
}
