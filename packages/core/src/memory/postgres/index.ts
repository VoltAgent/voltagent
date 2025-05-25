import { Pool } from "pg";
import type {
  Conversation,
  CreateConversationInput,
  Memory,
  MemoryMessage,
  MemoryOptions,
  MessageFilterOptions,
} from "../types";

/**
 * Options for configuring the PostgresStorage
 */
export interface PostgresStorageOptions extends MemoryOptions {
  /**
   * PostgreSQL connection configuration
   * Can be either a connection string or individual parameters
   */
  connection:
    | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl?: boolean;
      }
    | string;

  /**
   * Maximum number of connections in the pool
   * @default 10
   */
  maxConnections?: number;

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
   * Storage limit for messages
   * @default 100
   */
  storageLimit?: number;
}

/**
 * A PostgreSQL storage implementation of the Memory interface
 * Uses node-postgres to store and retrieve conversation history
 */
export class PostgresStorage implements Memory {
  private pool: Pool;
  private options: PostgresStorageOptions;
  private initialized: Promise<void>;

  /**
   * Create a new PostgreSQL storage
   * @param options Configuration options
   */
  constructor(options: PostgresStorageOptions) {
    this.options = {
      storageLimit: options.storageLimit || 100,
      tablePrefix: options.tablePrefix || "voltagent_memory",
      debug: options.debug || false,
      maxConnections: options.maxConnections || 10,
      connection: options.connection,
    };

    // Initialize the PostgreSQL connection pool
    this.pool = new Pool({
      ...(typeof this.options.connection === "string"
        ? { connectionString: this.options.connection }
        : this.options.connection),
      max: this.options.maxConnections,
    });

    this.debug("PostgreSQL storage provider initialized with options", this.options);

    // Initialize the database tables
    this.initialized = this.initializeDatabase();
  }

  /**
   * Log a debug message if debug is enabled
   * @param message Message to log
   * @param data Additional data to log
   */
  private debug(message: string, data?: unknown): void {
    if (this.options.debug) {
      console.log(`[PostgresStorage] ${message}`, data || "");
    }
  }

  /**
   * Initialize the database tables
   * @returns Promise that resolves when initialization is complete
   */
  private async initializeDatabase(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Create conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_conversations (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          title TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_messages (
          user_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_conversations(id) ON DELETE CASCADE,
          message_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          PRIMARY KEY (user_id, conversation_id, message_id)
        )
      `);

      // Create agent history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_agent_history (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          agent_id TEXT NOT NULL
        )
      `);

      // Create agent history events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_agent_history_events (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          history_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_agent_history(key) ON DELETE CASCADE,
          agent_id TEXT NOT NULL
        )
      `);

      // Create agent history steps table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_agent_history_steps (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          history_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_agent_history(key) ON DELETE CASCADE,
          agent_id TEXT NOT NULL
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_conversations_resource
        ON ${this.options.tablePrefix}_conversations(resource_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_messages_lookup
        ON ${this.options.tablePrefix}_messages(user_id, conversation_id, created_at)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_agent_id
        ON ${this.options.tablePrefix}_agent_history(agent_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_events_history_id
        ON ${this.options.tablePrefix}_agent_history_events(history_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_events_agent_id
        ON ${this.options.tablePrefix}_agent_history_events(agent_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_steps_history_id
        ON ${this.options.tablePrefix}_agent_history_steps(history_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_steps_agent_id
        ON ${this.options.tablePrefix}_agent_history_steps(agent_id)
      `);

      await client.query("COMMIT");
      this.debug("Database initialized successfully");
    } catch (error) {
      await client.query("ROLLBACK");
      this.debug("Error initializing database:", error);
      throw new Error("Failed to initialize PostgreSQL database");
    } finally {
      client.release();
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
   * Add a message to the conversation history
   */
  async addMessage(
    message: MemoryMessage,
    userId = "default",
    conversationId = "default",
  ): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Insert the message
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_messages 
        (user_id, conversation_id, message_id, role, content, type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          userId,
          conversationId,
          message.id || this.generateId(),
          message.role,
          typeof message.content === "string" ? message.content : JSON.stringify(message.content),
          message.type,
          message.createdAt || new Date().toISOString(),
        ],
      );

      // If we have a storage limit, clean up old messages
      if (this.options.storageLimit && this.options.storageLimit > 0) {
        await client.query(
          `
          DELETE FROM ${this.options.tablePrefix}_messages
          WHERE user_id = $1 AND conversation_id = $2
          AND message_id IN (
            SELECT message_id
            FROM ${this.options.tablePrefix}_messages
            WHERE user_id = $1 AND conversation_id = $2
            ORDER BY created_at ASC
            LIMIT (
              SELECT GREATEST(0, COUNT(*) - $3)
              FROM ${this.options.tablePrefix}_messages
              WHERE user_id = $1 AND conversation_id = $2
            )
          )
          `,
          [userId, conversationId, this.options.storageLimit],
        );
      }

      await client.query("COMMIT");
      this.debug(`Added message for user ${userId} and conversation ${conversationId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      this.debug("Error adding message:", error);
      throw new Error("Failed to add message to PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Get messages with filtering options
   */
  async getMessages(options: MessageFilterOptions = {}): Promise<MemoryMessage[]> {
    await this.initialized;

    const {
      userId = "default",
      conversationId = "default",
      limit = this.options.storageLimit,
      before,
      after,
      role,
    } = options;

    const client = await this.pool.connect();
    try {
      const queryParams: any[] = [userId, conversationId];
      let query = `
        SELECT message_id, role, content, type, created_at
        FROM ${this.options.tablePrefix}_messages
        WHERE user_id = $1 AND conversation_id = $2
      `;

      if (role) {
        queryParams.push(role);
        query += ` AND role = $${queryParams.length}`;
      }

      if (before) {
        queryParams.push(before);
        query += ` AND created_at < $${queryParams.length}`;
      }

      if (after) {
        queryParams.push(after);
        query += ` AND created_at > $${queryParams.length}`;
      }

      query += ` ORDER BY created_at ASC`;

      if (limit && limit > 0) {
        queryParams.push(limit);
        query += ` LIMIT $${queryParams.length}`;
      }

      const result = await client.query(query, queryParams);

      return result.rows.map((row) => ({
        id: row.message_id,
        role: row.role,
        content: row.content,
        type: row.type,
        createdAt: row.created_at,
      }));
    } catch (error) {
      this.debug("Error fetching messages:", error);
      throw new Error("Failed to fetch messages from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Clear messages from memory
   */
  async clearMessages(options: { userId: string; conversationId?: string }): Promise<void> {
    await this.initialized;

    const { userId, conversationId = "default" } = options;
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        DELETE FROM ${this.options.tablePrefix}_messages
        WHERE user_id = $1 AND conversation_id = $2
        `,
        [userId, conversationId],
      );
      this.debug(`Cleared messages for user ${userId} and conversation ${conversationId}`);
    } catch (error) {
      this.debug("Error clearing messages:", error);
      throw new Error("Failed to clear messages from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_conversations
        (id, resource_id, title, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING id, resource_id, title, metadata, created_at, updated_at
        `,
        [
          conversation.id || this.generateId(),
          conversation.resourceId,
          conversation.title,
          JSON.stringify(conversation.metadata || {}),
        ],
      );

      const row = result.rows[0];
      return {
        id: row.id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      this.debug("Error creating conversation:", error);
      throw new Error("Failed to create conversation in PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT id, resource_id, title, metadata, created_at, updated_at
        FROM ${this.options.tablePrefix}_conversations
        WHERE id = $1
        `,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      this.debug("Error getting conversation:", error);
      throw new Error("Failed to get conversation from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Get conversations for a resource
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT id, resource_id, title, metadata, created_at, updated_at
        FROM ${this.options.tablePrefix}_conversations
        WHERE resource_id = $1
        ORDER BY created_at DESC
        `,
        [resourceId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      this.debug("Error getting conversations:", error);
      throw new Error("Failed to get conversations from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.resourceId !== undefined) {
        setClauses.push(`resource_id = $${paramCount}`);
        values.push(updates.resourceId);
        paramCount++;
      }

      if (updates.title !== undefined) {
        setClauses.push(`title = $${paramCount}`);
        values.push(updates.title);
        paramCount++;
      }

      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramCount}`);
        values.push(JSON.stringify(updates.metadata));
        paramCount++;
      }

      setClauses.push(`updated_at = timezone('utc'::text, now())`);

      values.push(id);

      const result = await client.query(
        `
        UPDATE ${this.options.tablePrefix}_conversations
        SET ${setClauses.join(", ")}
        WHERE id = $${paramCount}
        RETURNING id, resource_id, title, metadata, created_at, updated_at
        `,
        values,
      );

      if (result.rows.length === 0) {
        throw new Error(`Conversation with id ${id} not found`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      this.debug("Error updating conversation:", error);
      throw new Error("Failed to update conversation in PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Delete all messages in the conversation (cascade will handle this)
      await client.query(
        `
        DELETE FROM ${this.options.tablePrefix}_conversations
        WHERE id = $1
        `,
        [id],
      );

      await client.query("COMMIT");
      this.debug(`Deleted conversation ${id}`);
    } catch (error) {
      await client.query("ROLLBACK");
      this.debug("Error deleting conversation:", error);
      throw new Error("Failed to delete conversation from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Add or update a history entry
   */
  async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_agent_history (key, value, agent_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE
        SET value = $2, agent_id = $3
        `,
        [key, JSON.stringify(value), agentId],
      );
      this.debug(`Added/updated history entry ${key} for agent ${agentId}`);
    } catch (error) {
      this.debug("Error adding history entry:", error);
      throw new Error("Failed to add history entry to PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing history entry
   */
  async updateHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    return this.addHistoryEntry(key, value, agentId);
  }

  /**
   * Add a history event
   */
  async addHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_agent_history_events
        (key, value, history_id, agent_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE
        SET value = $2, history_id = $3, agent_id = $4
        `,
        [key, JSON.stringify(value), historyId, agentId],
      );
      this.debug(`Added/updated history event ${key} for history ${historyId}`);
    } catch (error) {
      this.debug("Error adding history event:", error);
      throw new Error("Failed to add history event to PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Update a history event
   */
  async updateHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    return this.addHistoryEvent(key, value, historyId, agentId);
  }

  /**
   * Add a history step
   */
  async addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_agent_history_steps
        (key, value, history_id, agent_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE
        SET value = $2, history_id = $3, agent_id = $4
        `,
        [key, JSON.stringify(value), historyId, agentId],
      );
      this.debug(`Added/updated history step ${key} for history ${historyId}`);
    } catch (error) {
      this.debug("Error adding history step:", error);
      throw new Error("Failed to add history step to PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Update a history step
   */
  async updateHistoryStep(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    return this.addHistoryStep(key, value, historyId, agentId);
  }

  /**
   * Get a history entry by ID
   */
  async getHistoryEntry(key: string): Promise<any | undefined> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      this.debug("Getting history entry for key:", key);
      const result = await client.query(
        `
        SELECT value, agent_id
        FROM ${this.options.tablePrefix}_agent_history
        WHERE key = $1
        `,
        [key],
      );

      this.debug("History entry query result:", result.rows);

      if (result.rows.length === 0) {
        this.debug("No history entry found for key:", key);
        return undefined;
      }

      const entry = result.rows[0];
      this.debug("Found history entry:", entry);
      const value = entry.value;
      this.debug("Entry value:", value);

      // Get related events
      const eventsResult = await client.query(
        `
        SELECT value
        FROM ${this.options.tablePrefix}_agent_history_events
        WHERE history_id = $1 AND agent_id = $2
        ORDER BY (value->>'timestamp')::timestamp ASC
        `,
        [key, entry.agent_id],
      );
      this.debug("Events query result:", eventsResult.rows);

      // Get related steps
      const stepsResult = await client.query(
        `
        SELECT value
        FROM ${this.options.tablePrefix}_agent_history_steps
        WHERE history_id = $1 AND agent_id = $2
        ORDER BY (value->>'timestamp')::timestamp ASC
        `,
        [key, entry.agent_id],
      );
      this.debug("Steps query result:", stepsResult.rows);

      // Add events and steps to the entry
      value.events = eventsResult.rows.map((row) => row.value);
      value.steps = stepsResult.rows.map((row) => row.value);
      this.debug("Final value with events and steps:", value);

      return value;
    } catch (error) {
      this.debug("Error getting history entry:", error);
      throw new Error("Failed to get history entry from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Get a history event by ID
   */
  async getHistoryEvent(key: string): Promise<any | undefined> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT value
        FROM ${this.options.tablePrefix}_agent_history_events
        WHERE key = $1
        `,
        [key],
      );

      return result.rows.length > 0 ? result.rows[0].value : undefined;
    } catch (error) {
      this.debug("Error getting history event:", error);
      throw new Error("Failed to get history event from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Get a history step by ID
   */
  async getHistoryStep(key: string): Promise<any | undefined> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT value
        FROM ${this.options.tablePrefix}_agent_history_steps
        WHERE key = $1
        `,
        [key],
      );

      return result.rows.length > 0 ? result.rows[0].value : undefined;
    } catch (error) {
      this.debug("Error getting history step:", error);
      throw new Error("Failed to get history step from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Get all history entries for an agent
   */
  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT key, value
        FROM ${this.options.tablePrefix}_agent_history
        WHERE agent_id = $1
        ORDER BY (value->>'timestamp')::timestamp DESC
        `,
        [agentId],
      );

      // Get all entries with their events and steps
      const entries = await Promise.all(
        result.rows.map(async (row) => {
          const entry = row.value;
          const key = row.key;

          // Get events for this entry
          const eventsResult = await client.query(
            `
            SELECT value
            FROM ${this.options.tablePrefix}_agent_history_events
            WHERE history_id = $1 AND agent_id = $2
            ORDER BY (value->>'timestamp')::timestamp ASC
            `,
            [key, agentId],
          );

          // Get steps for this entry
          const stepsResult = await client.query(
            `
            SELECT value
            FROM ${this.options.tablePrefix}_agent_history_steps
            WHERE history_id = $1 AND agent_id = $2
            ORDER BY (value->>'timestamp')::timestamp ASC
            `,
            [key, agentId],
          );

          // Add events and steps to the entry
          entry.events = eventsResult.rows.map((row) => row.value);
          entry.steps = stepsResult.rows.map((row) => row.value);

          return entry;
        }),
      );

      return entries;
    } catch (error) {
      this.debug("Error getting history entries:", error);
      throw new Error("Failed to get history entries from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
