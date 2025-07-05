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
 * PostgreSQL Storage for VoltAgent
 *
 * This implementation provides:
 * - Conversation management with user support
 * - Automatic migration from old schema to new schema
 * - Query builder pattern for flexible data retrieval
 * - Pagination support
 * - PostgreSQL-optimized queries with proper indexing
 *
 * @see {@link https://voltagent.ai/docs/agents/memory/postgres | PostgreSQL Storage Documentation}
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
  public async addTimelineEvent(
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
          metadata JSONB,
          userid TEXT,
          conversationid TEXT
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
          level TEXT DEFAULT 'INFO',
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

      // Create index for conversations by user_id (only if user_id column exists)
      try {
        const columnCheck = await client.query(
          `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'user_id'
          `,
          [`${this.options.tablePrefix}_conversations`],
        );

        const hasUserIdColumn = columnCheck.rows.length > 0;

        if (hasUserIdColumn) {
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_conversations_user
            ON ${this.options.tablePrefix}_conversations(user_id)
          `);
        }
      } catch (error) {
        this.debug("Error creating user_id index, will be created after migration:", error);
      }

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

      // Create indexes for userid and conversationid (only if columns exist)
      try {
        const columnCheck = await client.query(
          `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name IN ('userid', 'conversationid')
          `,
          [`${this.options.tablePrefix}_agent_history`],
        );

        const hasUserIdColumn = columnCheck.rows.some((row) => row.column_name === "userid");
        const hasConversationIdColumn = columnCheck.rows.some(
          (row) => row.column_name === "conversationid",
        );

        if (hasUserIdColumn) {
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_userid
            ON ${this.options.tablePrefix}_agent_history(userid)
          `);
          this.debug("Created index for userid column");
        }

        if (hasConversationIdColumn) {
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_conversationid
            ON ${this.options.tablePrefix}_agent_history(conversationid)
          `);
          this.debug("Created index for conversationid column");
        }
      } catch (indexError) {
        this.debug("Error creating indexes for userid/conversationid columns:", indexError);
        // Continue without failing - indexes are not critical for basic functionality
      }

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

      // Run agent history schema migration
      try {
        const migrationResult = await this.migrateAgentHistorySchema();

        if (!migrationResult.success) {
          console.error("Agent history schema migration error:", migrationResult.error);
        }
      } catch (error) {
        this.debug("Error migrating agent history schema:", error);
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
   *
   * ⚠️  **CRITICAL WARNING: DESTRUCTIVE OPERATION** ⚠️
   *
   * This method performs a DESTRUCTIVE schema migration that:
   * - DROPS and recreates existing tables
   * - Creates temporary tables during migration
   * - Modifies the primary key structure of the messages table
   * - Can cause DATA LOSS if interrupted or if errors occur
   *
   * **IMPORTANT SAFETY REQUIREMENTS:**
   * - 🛑 STOP all application instances before running this migration
   * - 🛑 Ensure NO concurrent database operations are running
   * - 🛑 Take a full database backup before running (independent of built-in backup)
   * - 🛑 Test the migration on a copy of production data first
   * - 🛑 Plan for downtime during migration execution
   *
   * **What this migration does:**
   * 1. Creates backup tables (if createBackup=true)
   * 2. Creates temporary tables with new schema
   * 3. Migrates data from old tables to new schema
   * 4. DROPS original tables
   * 5. Renames temporary tables to original names
   * 6. All operations are wrapped in a transaction for atomicity
   *
   * @param options Migration configuration options
   * @param options.createBackup Whether to create backup tables before migration (default: true, HIGHLY RECOMMENDED)
   * @param options.restoreFromBackup Whether to restore from existing backup instead of migrating (default: false)
   * @param options.deleteBackupAfterSuccess Whether to delete backup tables after successful migration (default: false)
   *
   * @returns Promise resolving to migration result with success status, migrated count, and backup info
   *
   * @example
   * ```typescript
   * // RECOMMENDED: Run with backup creation (default)
   * const result = await storage.migrateConversationSchema({
   *   createBackup: true,
   *   deleteBackupAfterSuccess: false // Keep backup for safety
   * });
   *
   * if (result.success) {
   *   console.log(`Migrated ${result.migratedCount} conversations successfully`);
   * } else {
   *   console.error('Migration failed:', result.error);
   *   // Consider restoring from backup
   * }
   *
   * // If migration fails, restore from backup:
   * const restoreResult = await storage.migrateConversationSchema({
   *   restoreFromBackup: true
   * });
   * ```
   *
   * @throws {Error} If migration fails and transaction is rolled back
   *
   * @since This migration is typically only needed when upgrading from older schema versions
   */
  private async migrateConversationSchema(
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

      // Check if migration has already been completed
      const flagCheck = await this.checkMigrationFlag("conversation_schema_migration");
      if (flagCheck.alreadyCompleted) {
        return { success: true, migratedCount: 0 };
      }

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
        WHERE table_name = $1 AND column_name = 'user_id'
      `,
        [conversationsTableName],
      );

      const msgColumnCheck = await client.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'user_id'
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
      const createdConversations = new Set<string>();

      // Process each message and create conversation if needed
      for (const row of messageData) {
        const conversationId = row.conversation_id;
        let userId = "default";

        // Get user_id from message if old schema has it
        if (hasUserIdInMessages && row.user_id) {
          userId = row.user_id;
        }

        // Check if conversation already exists (either migrated or auto-created)
        if (!createdConversations.has(conversationId)) {
          // Check if conversation exists in original conversations data
          const existingConversation = conversationData.find((conv) => conv.id === conversationId);

          if (existingConversation) {
            // Migrate existing conversation
            let convUserId = userId; // Use user_id from message

            // If conversation already has user_id, use it instead
            if (hasUserIdInConversations && existingConversation.user_id) {
              convUserId = existingConversation.user_id;
            }

            await client.query(
              `INSERT INTO ${tempConversationsTable} 
               (id, resource_id, user_id, title, metadata, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                existingConversation.id,
                existingConversation.resource_id,
                convUserId,
                existingConversation.title,
                existingConversation.metadata,
                existingConversation.created_at,
                existingConversation.updated_at,
              ],
            );
          } else {
            // Create new conversation from message data
            const now = new Date().toISOString();

            await client.query(
              `INSERT INTO ${tempConversationsTable} 
               (id, resource_id, user_id, title, metadata, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                conversationId,
                "default", // Default resource_id for auto-created conversations
                userId,
                "Migrated Conversation", // Default title
                JSON.stringify({}), // Empty metadata
                now,
                now,
              ],
            );
          }

          createdConversations.add(conversationId);
          migratedCount++;
        }

        // Migrate the message (without user_id column)
        await client.query(
          `INSERT INTO ${tempMessagesTable} 
           (conversation_id, message_id, role, content, type, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.conversation_id, row.message_id, row.role, row.content, row.type, row.created_at],
        );
      }

      // Handle any conversations that exist but have no messages
      for (const row of conversationData) {
        const conversationId = row.id;

        if (!createdConversations.has(conversationId)) {
          let userId = "default";

          // If conversation already has user_id, use it
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

      // Create indexes for the new schema
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_conversations_resource
        ON ${conversationsTableName}(resource_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_conversations_user
        ON ${conversationsTableName}(user_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_messages_lookup
        ON ${messagesTableName}(conversation_id, created_at)
      `);

      // Commit transaction
      await client.query("COMMIT");

      // Delete backups if requested
      if (deleteBackupAfterSuccess) {
        await client.query(`DROP TABLE IF EXISTS ${conversationsBackupName} CASCADE`);
        await client.query(`DROP TABLE IF EXISTS ${messagesBackupName} CASCADE`);
      }

      // Set migration flag to prevent future runs
      await this.setMigrationFlag("conversation_schema_migration", migratedCount);

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
  public async addMessage(message: MemoryMessage, conversationId = "default"): Promise<void> {
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
          typeof message.content === "string" ? message.content : JSON.stringify(message.content),
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
      this.debug(`Added message for conversation ${conversationId}`);
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
  public async getMessages(options: MessageFilterOptions = {}): Promise<MemoryMessage[]> {
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
  public async clearMessages(options: { userId: string; conversationId?: string }): Promise<void> {
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
  public async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
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
  public async getConversation(id: string): Promise<Conversation | null> {
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
  public async getConversations(resourceId: string): Promise<Conversation[]> {
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
  public async getConversationsByUserId(
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
   * Query conversations with filtering and pagination options
   *
   * @param options Query options for filtering and pagination
   * @returns Promise that resolves to an array of conversations matching the criteria
   * @see {@link https://voltagent.ai/docs/agents/memory/postgres#querying-conversations | Querying Conversations}
   */
  public async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
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
   * Get messages for a specific conversation with pagination support
   *
   * @param conversationId The unique identifier of the conversation to retrieve messages from
   * @param options Optional pagination and filtering options
   * @returns Promise that resolves to an array of messages in chronological order (oldest first)
   * @see {@link https://voltagent.ai/docs/agents/memory/postgres#conversation-messages | Getting Conversation Messages}
   */
  public async getConversationMessages(
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
  public async updateConversation(
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

      setClauses.push(`updated_at = timezone('utc'::text, now())`);

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
  public async deleteConversation(id: string): Promise<void> {
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
  public async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      // Normalize the data for storage
      const inputJSON = value.input ? JSON.stringify(value.input) : null;
      const outputJSON = value.output ? JSON.stringify(value.output) : null;
      const usageJSON = value.usage ? JSON.stringify(value.usage) : null;
      const metadataJSON = value.metadata ? JSON.stringify(value.metadata) : null;

      // Insert or replace with the structured format including userid and conversationid
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_agent_history 
        (id, agent_id, timestamp, status, input, output, usage, metadata, userid, conversationid) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          agent_id = $2,
          timestamp = $3,
          status = $4,
          input = $5,
          output = $6,
          usage = $7,
          metadata = $8,
          userid = $9,
          conversationid = $10
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
          value.userId || null, // userId
          value.conversationId || null, // conversationId
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
  public async updateHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    return this.addHistoryEntry(key, value, agentId);
  }

  /**
   * Add a history step
   */
  public async addHistoryStep(
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
  public async updateHistoryStep(
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
  public async getHistoryEntry(key: string): Promise<any | undefined> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      this.debug("Getting history entry for key:", key);
      const result = await client.query(
        `
        SELECT id, agent_id, timestamp, status, input, output, usage, metadata, userid, conversationid 
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
        userId: row.userid as string | null,
        conversationId: row.conversationid as string | null,
      };

      this.debug(`Got history entry with ID ${key}`);

      // Now also get related steps
      const stepsResult = await client.query(
        `
        SELECT value 
        FROM ${this.options.tablePrefix}_agent_history_steps 
        WHERE history_id = $1 AND agent_id = $2
        ORDER BY (value->>'timestamp')::timestamp ASC
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
  public async getHistoryStep(key: string): Promise<any | undefined> {
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
  public async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT id, agent_id, timestamp, status, input, output, usage, metadata, userid, conversationid 
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
        userId: row.userid as string | null,
        conversationId: row.conversationid as string | null,
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
            ORDER BY (value->>'timestamp')::timestamp ASC
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
  public async close(): Promise<void> {
    await this.pool.end();
    this.debug("PostgreSQL connection pool closed");
  }

  /**
   * Get conversations for a user with a fluent query builder interface
   * @param userId User ID to filter by
   * @returns Query builder object
   */
  public getUserConversations(userId: string) {
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
  public async getUserConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation | null> {
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
  public async getPaginatedUserConversations(
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

  /**
   * Check and create migration flag table, return if migration already completed
   * @param migrationType Type of migration to check
   * @returns Object with completion status and details
   */
  private async checkMigrationFlag(migrationType: string): Promise<{
    alreadyCompleted: boolean;
    migrationCount?: number;
    completedAt?: string;
  }> {
    const migrationFlagTable = `${this.options.tablePrefix}_conversations_migration_flags`;

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM ${migrationFlagTable} WHERE migration_type = $1`,
        [migrationType],
      );

      if (result.rows.length > 0) {
        const migrationFlag = result.rows[0];
        this.debug(`${migrationType} migration already completed`);
        this.debug(`Migration completed on: ${migrationFlag.completed_at}`);
        this.debug(`Migrated ${migrationFlag.migrated_count || 0} records previously`);
        return {
          alreadyCompleted: true,
          migrationCount: migrationFlag.migrated_count as number,
          completedAt: migrationFlag.completed_at as string,
        };
      }

      this.debug("Migration flags table found, but no migration flag exists yet");
      return { alreadyCompleted: false };
    } catch (flagError) {
      // Migration flag table doesn't exist, create it
      this.debug("Migration flag table not found, creating it...");
      this.debug("Original error:", flagError);

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${migrationFlagTable} (
            id SERIAL PRIMARY KEY,
            migration_type TEXT NOT NULL UNIQUE,
            completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
            migrated_count INTEGER DEFAULT 0,
            metadata JSONB DEFAULT '{}'::jsonb
          )
        `);
        this.debug("Migration flags table created successfully");
      } catch (createError) {
        this.debug("Failed to create migration flags table:", createError);
        // Continue with migration even if flag table creation fails
      }

      return { alreadyCompleted: false };
    } finally {
      client.release();
    }
  }

  /**
   * Set migration flag after successful completion
   * @param migrationType Type of migration completed
   * @param migratedCount Number of records migrated
   */
  private async setMigrationFlag(migrationType: string, migratedCount: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      const migrationFlagTable = `${this.options.tablePrefix}_conversations_migration_flags`;

      await client.query(
        `INSERT INTO ${migrationFlagTable} 
         (migration_type, migrated_count) 
         VALUES ($1, $2)
         ON CONFLICT (migration_type) DO UPDATE 
         SET migrated_count = $2, completed_at = timezone('utc'::text, now())`,
        [migrationType, migratedCount],
      );

      this.debug("Migration flag set successfully");
    } catch (flagSetError) {
      this.debug("Could not set migration flag (non-critical):", flagSetError);
    } finally {
      client.release();
    }
  }

  /**
   * Migrate agent history schema to add userid and conversationid columns
   */
  private async migrateAgentHistorySchema(): Promise<{
    success: boolean;
    error?: Error;
  }> {
    const client = await this.pool.connect();
    try {
      this.debug("Starting agent history schema migration...");

      // Check if migration has already been completed
      const flagCheck = await this.checkMigrationFlag("agent_history_schema_migration");
      if (flagCheck.alreadyCompleted) {
        return { success: true };
      }

      // Check if the table exists first
      const tableCheck = await client.query(
        `
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename = $1
        `,
        [`${this.options.tablePrefix}_agent_history`],
      );

      if (tableCheck.rows.length === 0) {
        this.debug("Agent history table doesn't exist, migration not needed");
        return { success: true };
      }

      // Check current table structure (PostgreSQL stores column names in lowercase)
      const columnCheck = await client.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name IN ('userid', 'conversationid')
        `,
        [`${this.options.tablePrefix}_agent_history`],
      );

      const hasUserIdColumn = columnCheck.rows.some((row) => row.column_name === "userid");
      const hasConversationIdColumn = columnCheck.rows.some(
        (row) => row.column_name === "conversationid",
      );

      // If both columns already exist, migration not needed
      if (hasUserIdColumn && hasConversationIdColumn) {
        this.debug(
          "Agent history table already has userId and conversationId columns, migration not needed",
        );
        return { success: true };
      }

      await client.query("BEGIN");

      // Add userId column if it doesn't exist
      if (!hasUserIdColumn) {
        try {
          await client.query(`
            ALTER TABLE ${this.options.tablePrefix}_agent_history
            ADD COLUMN userid TEXT
          `);
          this.debug("Added userid column to agent history table");
        } catch (error) {
          // Column might already exist, check error message
          if (error instanceof Error && error.message.includes("already exists")) {
            this.debug("userid column already exists, skipping");
          } else {
            throw error;
          }
        }
      }

      // Add conversationId column if it doesn't exist
      if (!hasConversationIdColumn) {
        try {
          await client.query(`
            ALTER TABLE ${this.options.tablePrefix}_agent_history
            ADD COLUMN conversationid TEXT
          `);
          this.debug("Added conversationid column to agent history table");
        } catch (error) {
          // Column might already exist, check error message
          if (error instanceof Error && error.message.includes("already exists")) {
            this.debug("conversationid column already exists, skipping");
          } else {
            throw error;
          }
        }
      }

      // Create indexes for new columns (verify columns exist after adding them)
      try {
        // Re-check column existence after adding them
        const finalColumnCheck = await client.query(
          `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name IN ('userid', 'conversationid')
          `,
          [`${this.options.tablePrefix}_agent_history`],
        );

        const finalHasUserIdColumn = finalColumnCheck.rows.some(
          (row) => row.column_name === "userid",
        );
        const finalHasConversationIdColumn = finalColumnCheck.rows.some(
          (row) => row.column_name === "conversationid",
        );

        if (finalHasUserIdColumn) {
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_userid
            ON ${this.options.tablePrefix}_agent_history(userid)
          `);
          this.debug("Created index for userid column during migration");
        }

        if (finalHasConversationIdColumn) {
          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_agent_history_conversationid
            ON ${this.options.tablePrefix}_agent_history(conversationid)
          `);
          this.debug("Created index for conversationid column during migration");
        }
      } catch (indexError) {
        this.debug("Error creating indexes during migration:", indexError);
        // Continue without failing - indexes are not critical for basic functionality
      }

      // Commit transaction
      await client.query("COMMIT");

      // Set migration flag
      await this.setMigrationFlag("agent_history_schema_migration", 0);

      this.debug("Agent history schema migration completed successfully");

      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      this.debug("Error during agent history schema migration:", error);
      return { success: false, error: error as Error };
    } finally {
      client.release();
    }
  }
}
