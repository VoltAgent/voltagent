import {
  type Conversation,
  type ConversationQueryOptions,
  type CreateConversationInput,
  type Memory,
  type MemoryMessage,
  type MemoryOptions,
  type MessageFilterOptions,
  type NewTimelineEvent,
  safeJsonParse,
} from "@voltagent/core";
import { Pool } from "pg";

/**
 * Enhanced PostgreSQL Storage for VoltAgent with User-Centric Conversation Management
 *
 * This implementation provides:
 * - User-specific conversation management
 * - Automatic migration from old schema to new schema
 * - Query builder pattern for flexible data retrieval
 * - Pagination support
 * - PostgreSQL-optimized queries with proper indexing
 *
 * ## Schema Changes
 *
 * ### Conversations Table:
 * - Added `user_id` column (REQUIRED)
 * - Updated indexes for user-based queries
 *
 * ### Messages Table:
 * - Removed `user_id` column (now derived through conversation relationship)
 * - Updated foreign key constraints
 *
 * ## Usage Examples
 *
 * ```typescript
 * const storage = new PostgresStorage({
 *   connection: {
 *     host: "localhost",
 *     port: 5432,
 *     database: "voltagent",
 *     user: "postgres",
 *     password: "password",
 *   },
 * });
 *
 * // Get user conversations (ChatGPT-style)
 * const conversations = await storage.getConversationsByUserId("user123", {
 *   limit: 50,
 *   orderBy: "updated_at",
 *   orderDirection: "DESC",
 * });
 *
 * // Get conversation messages
 * const messages = await storage.getConversationMessages("conversation-id");
 * ```
 */

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
   * Add a timeline event
   * @param key Event ID (UUID)
   * @param value Timeline event data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  async addTimelineEvent(
    key: string,
    value: NewTimelineEvent,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      // Serialize JSON fields
      const inputJSON = value.input ? JSON.stringify(value.input) : null;
      const outputJSON = value.output ? JSON.stringify(value.output) : null;
      const statusMessageJSON = value.statusMessage ? JSON.stringify(value.statusMessage) : null;
      const metadataJSON = value.metadata ? JSON.stringify(value.metadata) : null;
      const tagsJSON = value.tags ? JSON.stringify(value.tags) : null;

      // Insert with all the indexed fields
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_agent_history_timeline_events 
        (id, history_id, agent_id, event_type, event_name, 
         start_time, end_time, status, status_message, level, 
         version, parent_event_id, tags,
         input, output, error, metadata) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          history_id = $2,
          agent_id = $3,
          event_type = $4,
          event_name = $5,
          start_time = $6,
          end_time = $7,
          status = $8,
          status_message = $9,
          level = $10,
          version = $11,
          parent_event_id = $12,
          tags = $13,
          input = $14,
          output = $15,
          error = $16,
          metadata = $17
        `,
        [
          key,
          historyId,
          agentId,
          value.type,
          value.name,
          value.startTime,
          value.endTime || null,
          value.status || null,
          statusMessageJSON || null,
          value.level || "INFO",
          value.version || null,
          value.parentEventId || null,
          tagsJSON,
          inputJSON,
          outputJSON,
          statusMessageJSON,
          metadataJSON,
        ],
      );

      this.debug(`Added timeline event ${key} for history ${historyId}`);
    } catch (error) {
      this.debug("Error adding timeline event:", error);
      throw new Error("Failed to add timeline event to PostgreSQL database");
    } finally {
      client.release();
    }
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

      // Create conversations table with user_id
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_conversations (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create messages table without user_id
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_messages (
          conversation_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_conversations(id) ON DELETE CASCADE,
          message_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          PRIMARY KEY (conversation_id, message_id)
        )
      `);

      // Create agent history table with new structure
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_agent_history (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          status TEXT,
          input JSONB,
          output JSONB,
          usage JSONB,
          metadata JSONB
        )
      `);

      // Create agent history steps table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_agent_history_steps (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          history_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_agent_history(id) ON DELETE CASCADE,
          agent_id TEXT NOT NULL
        )
      `);

      // Create timeline events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_agent_history_timeline_events (
          id TEXT PRIMARY KEY,
          history_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_agent_history(id) ON DELETE CASCADE,
          agent_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_name TEXT NOT NULL,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          status TEXT,
          status_message TEXT,
          level TEXT DEFAULT "INFO",
          version TEXT,
          parent_event_id TEXT,
          tags JSONB,
          input JSONB,
          output JSONB,
          error JSONB,
          metadata JSONB
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_conversations_resource
        ON ${this.options.tablePrefix}_conversations(resource_id)
      `);

      // Create index for conversations by user_id
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_conversations_user
        ON ${this.options.tablePrefix}_conversations(user_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_messages_lookup
        ON ${this.options.tablePrefix}_messages(conversation_id, created_at)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_agent_id
        ON ${this.options.tablePrefix}_agent_history(agent_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_steps_history_id
        ON ${this.options.tablePrefix}_agent_history_steps(history_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_steps_agent_id
        ON ${this.options.tablePrefix}_agent_history_steps(agent_id)
      `);

      // Create indexes for timeline events table
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_timeline_events_history_id
        ON ${this.options.tablePrefix}_agent_history_timeline_events(history_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_timeline_events_agent_id
        ON ${this.options.tablePrefix}_agent_history_timeline_events(agent_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_timeline_events_event_type
        ON ${this.options.tablePrefix}_agent_history_timeline_events(event_type)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_timeline_events_event_name
        ON ${this.options.tablePrefix}_agent_history_timeline_events(event_name)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_timeline_events_parent_event_id
        ON ${this.options.tablePrefix}_agent_history_timeline_events(parent_event_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_timeline_events_status
        ON ${this.options.tablePrefix}_agent_history_timeline_events(status)
      `);

      await client.query("COMMIT");
      this.debug("Database initialized successfully");

      // Run conversation schema migration
      try {
        const migrationResult = await this.migrateConversationSchema({
          createBackup: true,
        });

        if (migrationResult.success) {
          if ((migrationResult.migratedCount || 0) > 0) {
            console.log(
              `${migrationResult.migratedCount} conversation records successfully migrated`,
            );
          }
        } else {
          console.error("Conversation migration error:", migrationResult.error);
        }
      } catch (error) {
        this.debug("Error migrating conversation schema:", error);
      }
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
   * Migrate conversation schema to add user_id and update messages table
   * @param options Migration options
   * @returns Migration result
   */
  async migrateConversationSchema(
    options: {
      createBackup?: boolean;
      restoreFromBackup?: boolean;
      deleteBackupAfterSuccess?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    migratedCount?: number;
    error?: Error;
    backupCreated?: boolean;
  }> {
    const {
      createBackup = true,
      restoreFromBackup = false,
      deleteBackupAfterSuccess = false,
    } = options;

    const conversationsTableName = `${this.options.tablePrefix}_conversations`;
    const messagesTableName = `${this.options.tablePrefix}_messages`;
    const conversationsBackupName = `${conversationsTableName}_backup`;
    const messagesBackupName = `${messagesTableName}_backup`;

    const client = await this.pool.connect();
    try {
      this.debug("Starting conversation schema migration...");

      // If restoreFromBackup option is active, restore from backup
      if (restoreFromBackup) {
        this.debug("Starting restoration from backup...");

        await client.query("BEGIN");

        // Check if backup tables exist
        const convBackupCheck = await client.query(
          "SELECT tablename FROM pg_tables WHERE tablename = $1",
          [conversationsBackupName],
        );

        const msgBackupCheck = await client.query(
          "SELECT tablename FROM pg_tables WHERE tablename = $1",
          [messagesBackupName],
        );

        if (convBackupCheck.rows.length === 0 || msgBackupCheck.rows.length === 0) {
          throw new Error("No backup found to restore");
        }

        // Restore tables from backup
        await client.query(`DROP TABLE IF EXISTS ${conversationsTableName} CASCADE`);
        await client.query(`DROP TABLE IF EXISTS ${messagesTableName} CASCADE`);
        await client.query(
          `ALTER TABLE ${conversationsBackupName} RENAME TO ${conversationsTableName}`,
        );
        await client.query(`ALTER TABLE ${messagesBackupName} RENAME TO ${messagesTableName}`);

        await client.query("COMMIT");

        this.debug("Restoration from backup completed successfully");
        return { success: true, backupCreated: false };
      }

      // Check current table structures
      const convColumnCheck = await client.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = "user_id"
      `,
        [conversationsTableName],
      );

      const msgColumnCheck = await client.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = "user_id"
      `,
        [messagesTableName],
      );

      const hasUserIdInConversations = convColumnCheck.rows.length > 0;
      const hasUserIdInMessages = msgColumnCheck.rows.length > 0;

      // If conversations already has user_id and messages doesn't have user_id, migration not needed
      if (hasUserIdInConversations && !hasUserIdInMessages) {
        this.debug("Tables are already in new format, migration not needed");
        return { success: true, migratedCount: 0 };
      }

      // Check if tables exist at all
      const convTableCheck = await client.query(
        "SELECT tablename FROM pg_tables WHERE tablename = $1",
        [conversationsTableName],
      );

      const msgTableCheck = await client.query(
        "SELECT tablename FROM pg_tables WHERE tablename = $1",
        [messagesTableName],
      );

      // If neither table exists, no migration needed
      if (convTableCheck.rows.length === 0 && msgTableCheck.rows.length === 0) {
        this.debug("Tables don't exist, migration not needed");
        return { success: true, migratedCount: 0 };
      }

      // Create backups if requested
      if (createBackup) {
        this.debug("Creating backups...");

        // Remove existing backups
        await client.query(`DROP TABLE IF EXISTS ${conversationsBackupName} CASCADE`);
        await client.query(`DROP TABLE IF EXISTS ${messagesBackupName} CASCADE`);

        // Create backups
        if (convTableCheck.rows.length > 0) {
          await client.query(
            `CREATE TABLE ${conversationsBackupName} AS SELECT * FROM ${conversationsTableName}`,
          );
        }

        if (msgTableCheck.rows.length > 0) {
          await client.query(
            `CREATE TABLE ${messagesBackupName} AS SELECT * FROM ${messagesTableName}`,
          );
        }

        this.debug("Backups created successfully");
      }

      // Get existing data
      let conversationData: any[] = [];
      let messageData: any[] = [];

      if (convTableCheck.rows.length > 0) {
        const convResult = await client.query(`SELECT * FROM ${conversationsTableName}`);
        conversationData = convResult.rows;
      }

      if (msgTableCheck.rows.length > 0) {
        const msgResult = await client.query(`SELECT * FROM ${messagesTableName}`);
        messageData = msgResult.rows;
      }

      // Start transaction for migration
      await client.query("BEGIN");

      // Create temporary tables with new schemas
      const tempConversationsTable = `${conversationsTableName}_temp`;
      const tempMessagesTable = `${messagesTableName}_temp`;

      await client.query(`
        CREATE TABLE ${tempConversationsTable} (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      await client.query(`
        CREATE TABLE ${tempMessagesTable} (
          conversation_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          PRIMARY KEY (conversation_id, message_id)
        )
      `);

      let migratedCount = 0;

      // Migrate conversations data
      for (const row of conversationData) {
        let userId = "default"; // Default user_id for existing conversations

        // If the table already has user_id, use it
        if (hasUserIdInConversations && row.user_id) {
          userId = row.user_id;
        }

        await client.query(
          `INSERT INTO ${tempConversationsTable} 
           (id, resource_id, user_id, title, metadata, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            row.id,
            row.resource_id,
            userId,
            row.title,
            row.metadata,
            row.created_at,
            row.updated_at,
          ],
        );
        migratedCount++;
      }

      // Migrate messages data
      for (const row of messageData) {
        await client.query(
          `INSERT INTO ${tempMessagesTable} 
           (conversation_id, message_id, role, content, type, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.conversation_id, row.message_id, row.role, row.content, row.type, row.created_at],
        );
      }

      // Replace old tables with new ones
      await client.query(`DROP TABLE IF EXISTS ${conversationsTableName} CASCADE`);
      await client.query(`DROP TABLE IF EXISTS ${messagesTableName} CASCADE`);
      await client.query(
        `ALTER TABLE ${tempConversationsTable} RENAME TO ${conversationsTableName}`,
      );
      await client.query(`ALTER TABLE ${tempMessagesTable} RENAME TO ${messagesTableName}`);

      // Recreate foreign key constraint
      await client.query(`
        ALTER TABLE ${messagesTableName} 
        ADD CONSTRAINT ${messagesTableName}_conversation_id_fkey 
        FOREIGN KEY (conversation_id) 
        REFERENCES ${conversationsTableName}(id) 
        ON DELETE CASCADE
      `);

      // Commit transaction
      await client.query("COMMIT");

      // Delete backups if requested
      if (deleteBackupAfterSuccess) {
        await client.query(`DROP TABLE IF EXISTS ${conversationsBackupName} CASCADE`);
        await client.query(`DROP TABLE IF EXISTS ${messagesBackupName} CASCADE`);
      }

      this.debug(
        `Conversation schema migration completed successfully. Migrated ${migratedCount} conversations.`,
      );

      return {
        success: true,
        migratedCount,
        backupCreated: createBackup,
      };
    } catch (error) {
      this.debug("Error during conversation schema migration:", error);

      // Rollback transaction if still active
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        this.debug("Error rolling back transaction:", rollbackError);
      }

      return {
        success: false,
        error: error as Error,
        backupCreated: createBackup,
      };
    } finally {
      client.release();
    }
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

      // Insert the message without user_id (userId parameter is kept for compatibility but not used)
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_messages 
        (conversation_id, message_id, role, content, type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          conversationId,
          message.id || this.generateId(),
          message.role,
          message.content,
          message.type,
          message.createdAt,
        ],
      );

      // Apply storage limit if specified
      if (this.options.storageLimit && this.options.storageLimit > 0) {
        // Get the count of messages for this conversation
        const countResult = await client.query(
          `
          SELECT COUNT(*) as count 
          FROM ${this.options.tablePrefix}_messages 
          WHERE conversation_id = $1
          `,
          [conversationId],
        );

        const count = Number.parseInt(countResult.rows[0].count);

        // If we have more messages than the limit, delete the oldest ones
        if (count > this.options.storageLimit) {
          await client.query(
            `
            DELETE FROM ${this.options.tablePrefix}_messages 
            WHERE conversation_id = $1 
            AND message_id IN (
              SELECT message_id 
              FROM ${this.options.tablePrefix}_messages 
              WHERE conversation_id = $1 
              ORDER BY created_at ASC 
              LIMIT $2
            )
            `,
            [conversationId, count - this.options.storageLimit],
          );
        }
      }

      await client.query("COMMIT");
      this.debug(
        `Added message for conversation ${conversationId}. UserId parameter: ${userId} (compatibility only)`,
      );
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
      let sql = `
        SELECT m.message_id, m.role, m.content, m.type, m.created_at
        FROM ${this.options.tablePrefix}_messages m
      `;
      const params: any[] = [];
      const conditions: string[] = [];
      let paramCount = 1;

      // If userId is specified, we need to join with conversations table
      if (userId !== "default") {
        sql += ` INNER JOIN ${this.options.tablePrefix}_conversations c ON m.conversation_id = c.id`;
        conditions.push(`c.user_id = $${paramCount}`);
        params.push(userId);
        paramCount++;
      }

      // Add conversation_id filter
      if (conversationId !== "default") {
        conditions.push(`m.conversation_id = $${paramCount}`);
        params.push(conversationId);
        paramCount++;
      }

      // Add time-based filters
      if (before) {
        conditions.push(`m.created_at < $${paramCount}`);
        params.push(new Date(before).toISOString());
        paramCount++;
      }

      if (after) {
        conditions.push(`m.created_at > $${paramCount}`);
        params.push(new Date(after).toISOString());
        paramCount++;
      }

      // Add role filter
      if (role) {
        conditions.push(`m.role = $${paramCount}`);
        params.push(role);
        paramCount++;
      }

      // Add WHERE clause if we have conditions
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      // Add ordering and limit
      sql += " ORDER BY m.created_at ASC";
      if (limit && limit > 0) {
        sql += ` LIMIT $${paramCount}`;
        params.push(limit);
      }

      const result = await client.query(sql, params);

      return result.rows.map((row: any) => ({
        id: row.message_id,
        role: row.role,
        content: row.content,
        type: row.type,
        createdAt: row.created_at,
      }));
    } catch (error) {
      this.debug("Error getting messages:", error);
      throw new Error("Failed to get messages from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Clear messages from memory
   */
  async clearMessages(options: { userId: string; conversationId?: string }): Promise<void> {
    await this.initialized;

    const { userId, conversationId } = options;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (conversationId) {
        // Clear messages for a specific conversation (with user validation)
        await client.query(
          `
          DELETE FROM ${this.options.tablePrefix}_messages 
          WHERE conversation_id = $1 
          AND conversation_id IN (
            SELECT id FROM ${this.options.tablePrefix}_conversations WHERE user_id = $2
          )
          `,
          [conversationId, userId],
        );
        this.debug(`Cleared messages for conversation ${conversationId} for user ${userId}`);
      } else {
        // Clear all messages for the user across all their conversations
        await client.query(
          `
          DELETE FROM ${this.options.tablePrefix}_messages 
          WHERE conversation_id IN (
            SELECT id FROM ${this.options.tablePrefix}_conversations WHERE user_id = $1
          )
          `,
          [userId],
        );
        this.debug(`Cleared all messages for user ${userId}`);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
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
        (id, resource_id, user_id, title, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, resource_id, user_id, title, metadata, created_at, updated_at
        `,
        [
          conversation.id || this.generateId(),
          conversation.resourceId,
          conversation.userId,
          conversation.title,
          JSON.stringify(conversation.metadata || {}),
        ],
      );

      const row = result.rows[0];
      return {
        id: row.id,
        resourceId: row.resource_id,
        userId: row.user_id,
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
        SELECT id, resource_id, user_id, title, metadata, created_at, updated_at
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
        userId: row.user_id,
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
        SELECT id, resource_id, user_id, title, metadata, created_at, updated_at
        FROM ${this.options.tablePrefix}_conversations
        WHERE resource_id = $1
        ORDER BY created_at DESC
        `,
        [resourceId],
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        resourceId: row.resource_id,
        userId: row.user_id,
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
   * Get conversations by user ID with query options
   */
  async getConversationsByUserId(
    userId: string,
    options: Omit<ConversationQueryOptions, "userId"> = {},
  ): Promise<Conversation[]> {
    await this.initialized;

    const {
      resourceId,
      limit = 50,
      offset = 0,
      orderBy = "updated_at",
      orderDirection = "DESC",
    } = options;

    const client = await this.pool.connect();
    try {
      let sql = `
        SELECT id, resource_id, user_id, title, metadata, created_at, updated_at
        FROM ${this.options.tablePrefix}_conversations
        WHERE user_id = $1
      `;
      const params: any[] = [userId];
      let paramCount = 2;

      if (resourceId) {
        sql += ` AND resource_id = $${paramCount}`;
        params.push(resourceId);
        paramCount++;
      }

      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

      if (limit > 0) {
        sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
      }

      const result = await client.query(sql, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        resourceId: row.resource_id,
        userId: row.user_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      this.debug("Error getting conversations by user ID:", error);
      throw new Error("Failed to get conversations by user ID from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Query conversations with advanced options
   */
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    await this.initialized;

    const {
      userId,
      resourceId,
      limit = 50,
      offset = 0,
      orderBy = "updated_at",
      orderDirection = "DESC",
    } = options;

    const client = await this.pool.connect();
    try {
      let sql = `
        SELECT id, resource_id, user_id, title, metadata, created_at, updated_at
        FROM ${this.options.tablePrefix}_conversations
      `;
      const params: any[] = [];
      const conditions: string[] = [];
      let paramCount = 1;

      if (userId) {
        conditions.push(`user_id = $${paramCount}`);
        params.push(userId);
        paramCount++;
      }

      if (resourceId) {
        conditions.push(`resource_id = $${paramCount}`);
        params.push(resourceId);
        paramCount++;
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

      if (limit > 0) {
        sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
      }

      const result = await client.query(sql, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        resourceId: row.resource_id,
        userId: row.user_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      this.debug("Error querying conversations:", error);
      throw new Error("Failed to query conversations from PostgreSQL database");
    } finally {
      client.release();
    }
  }

  /**
   * Get all messages for a specific conversation
   */
  async getConversationMessages(
    conversationId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<MemoryMessage[]> {
    await this.initialized;

    const { limit = 100, offset = 0 } = options;
    const client = await this.pool.connect();

    try {
      let sql = `
        SELECT message_id, role, content, type, created_at
        FROM ${this.options.tablePrefix}_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `;
      const params: any[] = [conversationId];

      if (limit > 0) {
        sql += " LIMIT $2 OFFSET $3";
        params.push(limit, offset);
      }

      const result = await client.query(sql, params);

      return result.rows.map((row: any) => ({
        id: row.message_id,
        role: row.role,
        content: row.content,
        type: row.type,
        createdAt: row.created_at,
      }));
    } catch (error) {
      this.debug("Error getting conversation messages:", error);
      throw new Error("Failed to get conversation messages from PostgreSQL database");
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

      if (updates.userId !== undefined) {
        setClauses.push(`user_id = $${paramCount}`);
        values.push(updates.userId);
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

      setClauses.push(`updated_at = timezone("utc"::text, now())`);

      values.push(id);

      const result = await client.query(
        `
        UPDATE ${this.options.tablePrefix}_conversations
        SET ${setClauses.join(", ")}
        WHERE id = $${paramCount}
        RETURNING id, resource_id, user_id, title, metadata, created_at, updated_at
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
        userId: row.user_id,
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
      // Normalize the data for storage
      const inputJSON = value.input ? JSON.stringify(value.input) : null;
      const outputJSON = value.output ? JSON.stringify(value.output) : null;
      const usageJSON = value.usage ? JSON.stringify(value.usage) : null;
      const metadataJSON = value.metadata ? JSON.stringify(value.metadata) : null;

      // Insert or replace with the structured format
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_agent_history 
        (id, agent_id, timestamp, status, input, output, usage, metadata) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          agent_id = $2,
          timestamp = $3,
          status = $4,
          input = $5,
          output = $6,
          usage = $7,
          metadata = $8
        `,
        [
          key, // id
          agentId, // agent_id
          value.timestamp ? value.timestamp.toISOString() : new Date().toISOString(), // timestamp
          value.status || null, // status
          inputJSON, // input
          outputJSON, // output
          usageJSON, // usage
          metadataJSON, // metadata
        ],
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
        SELECT id, agent_id, timestamp, status, input, output, usage, metadata 
        FROM ${this.options.tablePrefix}_agent_history
        WHERE id = $1
        `,
        [key],
      );

      this.debug("History entry query result:", result.rows);

      if (result.rows.length === 0) {
        this.debug("No history entry found for key:", key);
        return undefined;
      }

      const row = result.rows[0];
      this.debug("Found history entry:", row);

      // Construct the entry object
      const entry = {
        id: row.id as string,
        _agentId: row.agent_id as string, // Keep _agentId for compatibility
        timestamp: new Date(row.timestamp as string),
        status: row.status as string,
        input: row.input ? row.input : null,
        output: row.output ? row.output : null,
        usage: row.usage ? row.usage : null,
        metadata: row.metadata ? row.metadata : null,
      };

      this.debug(`Got history entry with ID ${key}`);

      // Now also get related steps
      const stepsResult = await client.query(
        `
        SELECT value 
        FROM ${this.options.tablePrefix}_agent_history_steps 
        WHERE history_id = $1 AND agent_id = $2
        ORDER BY (value->>"timestamp")::timestamp ASC
        `,
        [key, entry._agentId],
      );

      // Parse and transform steps
      const steps = stepsResult.rows.map((row) => {
        const step = row.value;
        return {
          type: step.type,
          name: step.name,
          content: step.content,
          arguments: step.arguments,
        };
      });

      // Get timeline events
      const timelineEventsResult = await client.query(
        `
        SELECT id, event_type, event_name, start_time, end_time, 
        status, status_message, level, version, 
        parent_event_id, tags, input, output, error, metadata 
        FROM ${this.options.tablePrefix}_agent_history_timeline_events 
        WHERE history_id = $1 AND agent_id = $2
        ORDER BY start_time ASC
        `,
        [key, entry._agentId],
      );

      // Parse timeline events and construct NewTimelineEvent objects
      const events = timelineEventsResult.rows.map((row) => {
        const statusMessage = row.status_message
          ? safeJsonParse(row.status_message as string)
          : undefined;

        const error = row.error ? safeJsonParse(row.error as string) : undefined;

        // Construct NewTimelineEvent object
        return {
          id: row.id as string,
          type: row.event_type as string,
          name: row.event_name as string,
          startTime: row.start_time as string,
          endTime: row.end_time as string,
          status: row.status as string,
          statusMessage: statusMessage,
          level: row.level as string,
          version: row.version as string,
          parentEventId: row.parent_event_id as string,
          tags: row.tags,
          input: row.input,
          output: row.output,
          error: statusMessage ? statusMessage : error,
          metadata: row.metadata,
        };
      });

      // @ts-ignore
      entry.steps = steps;
      // @ts-ignore
      entry.events = events;

      return entry;
    } catch (error) {
      this.debug("Error getting history entry:", error);
      throw new Error("Failed to get history entry from PostgreSQL database");
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
        SELECT id, agent_id, timestamp, status, input, output, usage, metadata 
        FROM ${this.options.tablePrefix}_agent_history
        WHERE agent_id = $1
        ORDER BY timestamp DESC
        `,
        [agentId],
      );

      // Construct entry objects from rows
      const entries = result.rows.map((row) => ({
        id: row.id as string,
        _agentId: row.agent_id as string, // Keep _agentId for compatibility
        timestamp: new Date(row.timestamp as string),
        status: row.status as string,
        input: row.input ? row.input : null,
        output: row.output ? row.output : null,
        usage: row.usage ? row.usage : null,
        metadata: row.metadata ? row.metadata : null,
      }));

      this.debug(`Got all history entries for agent ${agentId} (${entries.length} items)`);

      // Now fetch events and steps for each entry
      const completeEntries = await Promise.all(
        entries.map(async (entry) => {
          // Get steps for this entry
          const stepsResult = await client.query(
            `
            SELECT value 
            FROM ${this.options.tablePrefix}_agent_history_steps 
            WHERE history_id = $1 AND agent_id = $2
            ORDER BY (value->>"timestamp")::timestamp ASC
            `,
            [entry.id, agentId],
          );

          // Parse and transform steps
          const steps = stepsResult.rows.map((row) => {
            const step = row.value;
            return {
              type: step.type,
              name: step.name,
              content: step.content,
              arguments: step.arguments,
            };
          });

          // Get timeline events for this entry
          const timelineEventsResult = await client.query(
            `
            SELECT id, event_type, event_name, start_time, end_time, 
            status, status_message, level, version, 
            parent_event_id, tags, input, output, error, metadata 
            FROM ${this.options.tablePrefix}_agent_history_timeline_events 
            WHERE history_id = $1 AND agent_id = $2
            ORDER BY start_time ASC
            `,
            [entry.id, agentId],
          );

          // Parse timeline events and construct NewTimelineEvent objects
          const events = timelineEventsResult.rows.map((row) => {
            const statusMessage = row.status_message
              ? safeJsonParse(row.status_message as string)
              : undefined;
            const error = row.error ? safeJsonParse(row.error as string) : undefined;

            // Construct NewTimelineEvent object
            return {
              id: row.id as string,
              type: row.event_type as string,
              name: row.event_name as string,
              startTime: row.start_time as string,
              endTime: row.end_time as string,
              status: row.status as string,
              statusMessage: statusMessage,
              level: row.level as string,
              version: row.version as string,
              parentEventId: row.parent_event_id as string,
              tags: row.tags,
              input: row.input,
              output: row.output,
              error: statusMessage ? statusMessage : error,
              metadata: row.metadata,
            };
          });

          // @ts-ignore
          entry.steps = steps;
          // @ts-ignore
          entry.events = events;

          return entry;
        }),
      );

      // Return completed entries
      return completeEntries;
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
    this.debug("PostgreSQL connection pool closed");
  }
}

/**
 * Extended PostgreSQL storage implementation with additional convenience methods
 * This serves as an example of how users can extend the base storage
 */
export class ExtendedPostgresStorage extends PostgresStorage {
  /**
   * Get conversations for a user with a fluent query builder interface
   * @param userId User ID to filter by
   * @returns Query builder object
   */
  getUserConversations(userId: string) {
    return {
      /**
       * Limit the number of results
       * @param count Number of conversations to return
       * @returns Query builder
       */
      limit: (count: number) => ({
        /**
         * Order results by a specific field
         * @param field Field to order by
         * @param direction Sort direction
         * @returns Query builder
         */
        orderBy: (
          field: "created_at" | "updated_at" | "title" = "updated_at",
          direction: "ASC" | "DESC" = "DESC",
        ) => ({
          /**
           * Execute the query and return results
           * @returns Promise of conversations
           */
          execute: () =>
            this.getConversationsByUserId(userId, {
              limit: count,
              orderBy: field,
              orderDirection: direction,
            }),
        }),
        /**
         * Execute the query with default ordering
         * @returns Promise of conversations
         */
        execute: () => this.getConversationsByUserId(userId, { limit: count }),
      }),

      /**
       * Order results by a specific field
       * @param field Field to order by
       * @param direction Sort direction
       * @returns Query builder
       */
      orderBy: (
        field: "created_at" | "updated_at" | "title" = "updated_at",
        direction: "ASC" | "DESC" = "DESC",
      ) => ({
        /**
         * Limit the number of results
         * @param count Number of conversations to return
         * @returns Query builder
         */
        limit: (count: number) => ({
          /**
           * Execute the query and return results
           * @returns Promise of conversations
           */
          execute: () =>
            this.getConversationsByUserId(userId, {
              limit: count,
              orderBy: field,
              orderDirection: direction,
            }),
        }),
        /**
         * Execute the query without limit
         * @returns Promise of conversations
         */
        execute: () =>
          this.getConversationsByUserId(userId, {
            orderBy: field,
            orderDirection: direction,
          }),
      }),

      /**
       * Execute the query with default options
       * @returns Promise of conversations
       */
      execute: () => this.getConversationsByUserId(userId),
    };
  }

  /**
   * Get conversation by ID and ensure it belongs to the specified user
   * @param conversationId Conversation ID
   * @param userId User ID to validate ownership
   * @returns Conversation or null
   */
  async getUserConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }
    return conversation;
  }

  /**
   * Get paginated conversations for a user
   * @param userId User ID
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @returns Object with conversations and pagination info
   */
  async getPaginatedUserConversations(
    userId: string,
    page = 1,
    pageSize = 10,
  ): Promise<{
    conversations: Conversation[];
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * pageSize;

    // Get one extra to check if there are more pages
    const conversations = await this.getConversationsByUserId(userId, {
      limit: pageSize + 1,
      offset,
      orderBy: "updated_at",
      orderDirection: "DESC",
    });

    const hasMore = conversations.length > pageSize;
    const results = hasMore ? conversations.slice(0, pageSize) : conversations;

    return {
      conversations: results,
      page,
      pageSize,
      hasMore,
    };
  }
}
