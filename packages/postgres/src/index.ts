import {
  type Conversation,
  type ConversationQueryOptions,
  type CreateConversationInput,
  type InternalMemory,
  type MemoryOptions,
  type NewTimelineEvent,
  type WorkflowHistoryEntry,
  type WorkflowStepHistoryEntry,
  type WorkflowTimelineEvent,
  safeJsonParse,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal/utils";
import type { UIMessage } from "ai";
import { Pool } from "pg";

/**
 * Workflow statistics interface
 */
export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
}

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
 * @see {@link https://voltagent.dev/docs/agents/memory/postgres | PostgreSQL Storage Documentation}
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
 * A PostgreSQL storage implementation of the Memory and WorkflowMemory interfaces
 * Uses node-postgres to store and retrieve conversation history and workflow data
 */
export class PostgresStorage implements InternalMemory {
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

      // startTime and endTime are already ISO strings from NewTimelineEvent interface

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

      // Create messages table with UIMessage support
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_messages (
          conversation_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_conversations(id) ON DELETE CASCADE,
          message_id TEXT NOT NULL,
          user_id TEXT NOT NULL DEFAULT 'default',
          role TEXT NOT NULL,
          parts JSONB,
          metadata JSONB,
          format_version INTEGER DEFAULT 2,
          content TEXT,
          type TEXT,
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

      // ===== Create Workflow Tables =====

      // Create workflow history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_workflow_history (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          workflow_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error', 'cancelled')),
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          input JSONB,
          output JSONB,
          metadata JSONB,
          user_id TEXT,
          conversation_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create workflow steps table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_workflow_steps (
          id TEXT PRIMARY KEY,
          workflow_history_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_workflow_history(id) ON DELETE CASCADE,
          step_index INTEGER NOT NULL,
          step_type TEXT NOT NULL CHECK (step_type IN ('agent', 'func', 'conditional-when', 'parallel-all', 'parallel-race')),
          step_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error', 'skipped')),
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          input JSONB,
          output JSONB,
          error_message TEXT,
          agent_execution_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create workflow timeline events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}_workflow_timeline_events (
          event_id TEXT PRIMARY KEY,
          workflow_history_id TEXT NOT NULL REFERENCES ${this.options.tablePrefix}_workflow_history(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ,
          status TEXT,
          level TEXT DEFAULT 'INFO',
          input JSONB,
          output JSONB,
          metadata JSONB,
          event_sequence INTEGER, -- ✅ ADD: Sequence number for proper ordering
          trace_id TEXT,
          parent_event_id TEXT,
          status_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create indexes for workflow tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_history_workflow_id
        ON ${this.options.tablePrefix}_workflow_history(workflow_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_history_status
        ON ${this.options.tablePrefix}_workflow_history(status)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_history_start_time
        ON ${this.options.tablePrefix}_workflow_history(start_time)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_steps_workflow_history_id
        ON ${this.options.tablePrefix}_workflow_steps(workflow_history_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_steps_step_index
        ON ${this.options.tablePrefix}_workflow_steps(workflow_history_id, step_index)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_timeline_events_workflow_history_id
        ON ${this.options.tablePrefix}_workflow_timeline_events(workflow_history_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_timeline_events_type
        ON ${this.options.tablePrefix}_workflow_timeline_events(type)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_timeline_events_start_time
        ON ${this.options.tablePrefix}_workflow_timeline_events(start_time)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.options.tablePrefix}_workflow_timeline_events_sequence
        ON ${this.options.tablePrefix}_workflow_timeline_events(event_sequence)
      `);

      await client.query("COMMIT");
      this.debug("Database initialized successfully with workflow tables");

      // Run agent history schema migration
      try {
        const migrationResult = await this.migrateAgentHistorySchema();

        if (!migrationResult.success) {
          console.error("Agent history schema migration error:", migrationResult.error);
        }
      } catch (error) {
        this.debug("Error migrating agent history schema:", error);
      }

      // Run UIMessage format migration for existing tables
      try {
        await this.addUIMessageColumnsToMessagesTable();
      } catch (error) {
        this.debug("Error adding UIMessage columns (non-critical):", error);
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
   * Add new columns to messages table for UIMessage format if they don't exist
   * This allows existing tables to support both old and new message formats
   */
  private async addUIMessageColumnsToMessagesTable(): Promise<void> {
    const messagesTableName = `${this.options.tablePrefix}_messages`;
    const client = await this.pool.connect();

    try {
      // Check which columns exist
      const columnCheck = await client.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
        `,
        [messagesTableName],
      );

      const existingColumns = columnCheck.rows.map((row) => row.column_name);

      // Add new columns if they don't exist
      if (!existingColumns.includes("parts")) {
        try {
          await client.query(`ALTER TABLE ${messagesTableName} ADD COLUMN parts JSONB`);
          this.debug("Added 'parts' column to messages table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!existingColumns.includes("metadata")) {
        try {
          await client.query(`ALTER TABLE ${messagesTableName} ADD COLUMN metadata JSONB`);
          this.debug("Added 'metadata' column to messages table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!existingColumns.includes("format_version")) {
        try {
          await client.query(
            `ALTER TABLE ${messagesTableName} ADD COLUMN format_version INTEGER DEFAULT 2`,
          );
          this.debug("Added 'format_version' column to messages table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!existingColumns.includes("user_id")) {
        try {
          await client.query(
            `ALTER TABLE ${messagesTableName} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'`,
          );
          this.debug("Added 'user_id' column to messages table");
        } catch (_e) {
          // Column might already exist
        }
      }

      // Make content and type nullable for new format
      if (existingColumns.includes("content")) {
        const contentInfo = await client.query(
          `
          SELECT is_nullable
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'content'
          `,
          [messagesTableName],
        );

        if (contentInfo.rows[0]?.is_nullable === "NO") {
          try {
            await client.query(
              `ALTER TABLE ${messagesTableName} ALTER COLUMN content DROP NOT NULL`,
            );
            this.debug("Made 'content' column nullable");
          } catch (e) {
            this.debug("Error making content nullable:", e);
          }
        }
      }

      if (existingColumns.includes("type")) {
        const typeInfo = await client.query(
          `
          SELECT is_nullable
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'type'
          `,
          [messagesTableName],
        );

        if (typeInfo.rows[0]?.is_nullable === "NO") {
          try {
            await client.query(`ALTER TABLE ${messagesTableName} ALTER COLUMN type DROP NOT NULL`);
            this.debug("Made 'type' column nullable");
          } catch (e) {
            this.debug("Error making type nullable:", e);
          }
        }
      }

      this.debug("UIMessage columns migration completed for messages table");
    } catch (error) {
      this.debug("Error in UIMessage columns migration (non-critical):", error);
      // Don't throw - this is not critical for new installations
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
   * @param message UIMessage to add
   * @param userId User identifier
   * @param conversationId Conversation identifier
   */
  public async addMessage(
    message: UIMessage,
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const partsString = safeStringify(message.parts || []);
      const metadataString = safeStringify(message.metadata || {});

      // Insert the message with UIMessage format
      await client.query(
        `
        INSERT INTO ${this.options.tablePrefix}_messages 
        (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          conversationId,
          message.id || this.generateId(),
          userId,
          message.role,
          partsString,
          metadataString,
          2, // format_version for new UIMessage format
          new Date().toISOString(),
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
   * Add multiple UIMessages to the conversation history
   * @param messages Array of UIMessages to add
   * @param userId User identifier
   * @param conversationId Conversation identifier
   */
  public async addMessages(
    messages: UIMessage[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message, userId, conversationId);
    }
  }

  /**
   * Get messages with filtering options
   * @param userId User identifier
   * @param conversationId Conversation identifier
   * @param options Optional filtering options
   * @returns Array of UIMessages
   */
  public async getMessages(
    userId: string,
    conversationId: string,
    options?: { limit?: number; before?: Date; after?: Date; roles?: string[] },
  ): Promise<UIMessage[]> {
    await this.initialized;

    const { limit = this.options.storageLimit, before, after, roles } = options || {};

    const client = await this.pool.connect();
    try {
      // Select all columns to handle both old and new schemas
      let sql = `
        SELECT m.*
        FROM ${this.options.tablePrefix}_messages m
      `;
      const params: any[] = [];
      const conditions: string[] = [];
      let paramCount = 1;

      // Add user_id filter
      conditions.push(`m.user_id = $${paramCount}`);
      params.push(userId);
      paramCount++;

      // Add conversation_id filter
      conditions.push(`m.conversation_id = $${paramCount}`);
      params.push(conversationId);
      paramCount++;

      // Add time-based filters
      if (before) {
        conditions.push(`m.created_at < $${paramCount}`);
        params.push(before.toISOString());
        paramCount++;
      }

      if (after) {
        conditions.push(`m.created_at > $${paramCount}`);
        params.push(after.toISOString());
        paramCount++;
      }

      // Add role filter
      if (roles && roles.length > 0) {
        const placeholders = roles.map(() => `$${paramCount++}`).join(", ");
        conditions.push(`m.role IN (${placeholders})`);
        params.push(...roles);
      }

      // Add WHERE clause if we have conditions
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      // Add ordering and limit
      // When limit is specified, we need to get the most recent messages
      if (limit && limit > 0) {
        sql += ` ORDER BY m.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);
      } else {
        sql += " ORDER BY m.created_at ASC";
      }

      const result = await client.query(sql, params);

      // Map the results to UIMessage format
      const messages = result.rows.map((row: any) => {
        const formatVersion = row.format_version as number;

        // If format_version is 2, parse the new format
        if (formatVersion === 2 || row.parts) {
          const parts = row.parts || [];
          const metadata = row.metadata || {};

          return {
            id: row.message_id,
            role: row.role as "user" | "assistant" | "system",
            parts,
            metadata,
          } as UIMessage;
        }

        // Legacy format - convert to UIMessage
        let content = row.content;
        const parsedContent = safeJsonParse(content);
        if (parsedContent !== null) {
          content = parsedContent;
        }

        // Convert legacy format to UIMessage parts
        const messageType = row.type as string;
        const parts = [];

        if (messageType === "text") {
          parts.push({
            type: "text",
            text: typeof content === "string" ? content : JSON.stringify(content),
          });
        } else if (messageType === "tool-call") {
          parts.push({
            type: "tool-call",
            toolCallId: row.message_id,
            toolName:
              typeof content === "object" && content !== null && "name" in content
                ? (content as any).name
                : "unknown",
            args: typeof content === "object" ? content : {},
          });
        } else if (messageType === "tool-result") {
          parts.push({
            type: "tool-result",
            toolCallId: row.message_id,
            result: content,
          });
        } else {
          // Default to text part
          parts.push({
            type: "text",
            text: typeof content === "string" ? content : JSON.stringify(content),
          });
        }

        return {
          id: row.message_id,
          role: row.role as "user" | "assistant" | "system",
          parts,
          metadata: {},
        } as UIMessage;
      });

      // If we used DESC order with limit, reverse to get chronological order
      if (limit && limit > 0) {
        return messages.reverse();
      }

      return messages;
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
  public async clearMessages(userId: string, conversationId?: string): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (conversationId) {
        // Clear messages for a specific conversation (with user validation)
        await client.query(
          `
          DELETE FROM ${this.options.tablePrefix}_messages 
          WHERE conversation_id = $1 
          AND user_id = $2
          `,
          [conversationId, userId],
        );
        this.debug(`Cleared messages for conversation ${conversationId} for user ${userId}`);
      } else {
        // Clear all messages for the user
        await client.query(
          `
          DELETE FROM ${this.options.tablePrefix}_messages 
          WHERE user_id = $1
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
   * @see {@link https://voltagent.dev/docs/agents/memory/postgres#querying-conversations | Querying Conversations}
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
   * @returns Promise that resolves to an array of UIMessages in chronological order (oldest first)
   * @see {@link https://voltagent.dev/docs/agents/memory/postgres#conversation-messages | Getting Conversation Messages}
   */
  public async getConversationMessages(
    conversationId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<UIMessage[]> {
    await this.initialized;

    const { limit = 100, offset = 0 } = options;
    const client = await this.pool.connect();

    try {
      let sql = `
        SELECT * FROM ${this.options.tablePrefix}_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `;
      const params: any[] = [conversationId];

      if (limit > 0) {
        sql += " LIMIT $2 OFFSET $3";
        params.push(limit, offset);
      }

      const result = await client.query(sql, params);

      return result.rows.map((row: any) => {
        const formatVersion = row.format_version as number;

        // If format_version is 2, parse the new format
        if (formatVersion === 2 || row.parts) {
          const parts = row.parts || [];
          const metadata = row.metadata || {};

          return {
            id: row.message_id,
            role: row.role as "user" | "assistant" | "system",
            parts,
            metadata,
          } as UIMessage;
        }

        // Legacy format - convert to UIMessage
        let content = row.content;
        const parsedContent = safeJsonParse(content);
        if (parsedContent !== null) {
          content = parsedContent;
        }

        // Convert legacy format to UIMessage parts
        const messageType = row.type as string;
        const parts = [];

        if (messageType === "text") {
          parts.push({
            type: "text",
            text: typeof content === "string" ? content : JSON.stringify(content),
          });
        } else if (messageType === "tool-call") {
          parts.push({
            type: "tool-call",
            toolCallId: row.message_id,
            toolName:
              typeof content === "object" && content !== null && "name" in content
                ? (content as any).name
                : "unknown",
            args: typeof content === "object" ? content : {},
          });
        } else if (messageType === "tool-result") {
          parts.push({
            type: "tool-result",
            toolCallId: row.message_id,
            result: content,
          });
        } else {
          // Default to text part
          parts.push({
            type: "text",
            text: typeof content === "string" ? content : JSON.stringify(content),
          });
        }

        return {
          id: row.message_id,
          role: row.role as "user" | "assistant" | "system",
          parts,
          metadata: {},
        } as UIMessage;
      });
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
   * Get all history entries for an agent with pagination
   */
  public async getAllHistoryEntriesByAgent(
    agentId: string,
    page: number,
    limit: number,
  ): Promise<{
    entries: any[];
    total: number;
  }> {
    await this.initialized;

    const client = await this.pool.connect();
    try {
      // Get total count
      const countResult = await client.query(
        `
        SELECT COUNT(*) as total 
        FROM ${this.options.tablePrefix}_agent_history
        WHERE agent_id = $1
        `,
        [agentId],
      );

      const total = Number.parseInt(countResult.rows[0].total);
      const offset = page * limit;

      const result = await client.query(
        `
        SELECT id, agent_id, timestamp, status, input, output, usage, metadata, userid, conversationid 
        FROM ${this.options.tablePrefix}_agent_history
        WHERE agent_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
        `,
        [agentId, limit, offset],
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
      return {
        entries: completeEntries,
        total,
      };
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

  // ===== WorkflowMemory Interface Implementation =====

  /**
   * Store a workflow history entry
   */
  public async storeWorkflowHistory(entry: WorkflowHistoryEntry): Promise<void> {
    this.debug("Storing workflow history", {
      id: entry.id,
      workflowId: entry.workflowId,
      userId: entry.userId,
      conversationId: entry.conversationId,
    });

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Insert workflow history entry
      await client.query(
        `INSERT INTO ${this.options.tablePrefix}_workflow_history (
          id, workflow_id, name, status, start_time, end_time, 
          input, output, user_id, conversation_id, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          end_time = EXCLUDED.end_time,
          output = EXCLUDED.output,
          user_id = EXCLUDED.user_id,
          conversation_id = EXCLUDED.conversation_id,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at`,
        [
          entry.id,
          entry.workflowId,
          entry.workflowName,
          entry.status,
          entry.startTime,
          entry.endTime,
          JSON.stringify(entry.input),
          entry.output ? JSON.stringify(entry.output) : null,
          entry.userId || null,
          entry.conversationId || null,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          entry.createdAt || new Date(),
          entry.updatedAt || new Date(),
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a workflow history entry by ID
   */
  public async getWorkflowHistory(id: string): Promise<WorkflowHistoryEntry | null> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, workflow_id, name, status, start_time, end_time, input, output, 
         user_id, conversation_id, metadata, created_at, updated_at 
         FROM ${this.options.tablePrefix}_workflow_history 
         WHERE id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const entry: WorkflowHistoryEntry = {
        id: row.id,
        workflowId: row.workflow_id,
        workflowName: row.name,
        status: row.status,
        startTime: row.start_time,
        endTime: row.end_time,
        input: row.input,
        output: row.output,
        userId: row.user_id,
        conversationId: row.conversation_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        steps: [],
        events: [],
      };

      return entry;
    } catch (error) {
      this.debug("Error getting workflow history:", error);
      throw new Error("Failed to get workflow history entry");
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow history entries by workflow ID
   */
  public async getWorkflowHistoryByWorkflowId(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, workflow_id, name, status, start_time, end_time, input, output, 
         user_id, conversation_id, metadata, created_at, updated_at 
         FROM ${this.options.tablePrefix}_workflow_history 
         WHERE workflow_id = $1 
         ORDER BY created_at DESC`,
        [workflowId],
      );

      const entries: WorkflowHistoryEntry[] = result.rows.map((row) => ({
        id: row.id,
        workflowId: row.workflow_id,
        workflowName: row.name,
        status: row.status,
        startTime: row.start_time,
        endTime: row.end_time,
        input: row.input,
        output: row.output,
        userId: row.user_id,
        conversationId: row.conversation_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        steps: [],
        events: [],
      }));

      return entries;
    } catch (error) {
      this.debug("Error getting workflow history by workflow ID:", error);
      throw new Error("Failed to get workflow history entries");
    } finally {
      client.release();
    }
  }

  /**
   * Update a workflow history entry
   */
  public async updateWorkflowHistory(
    id: string,
    updates: Partial<WorkflowHistoryEntry>,
  ): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic SET clause based on provided updates
      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.endTime !== undefined) {
        setClauses.push(`end_time = $${paramIndex++}`);
        values.push(updates.endTime);
      }
      if (updates.output !== undefined) {
        setClauses.push(`output = $${paramIndex++}`);
        values.push(updates.output ? JSON.stringify(updates.output) : null);
      }
      if (updates.userId !== undefined) {
        setClauses.push(`user_id = $${paramIndex++}`);
        values.push(updates.userId);
      }
      if (updates.conversationId !== undefined) {
        setClauses.push(`conversation_id = $${paramIndex++}`);
        values.push(updates.conversationId);
      }
      if (updates.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex++}`);
        values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
      }

      // Always update the updated_at timestamp
      setClauses.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      // Add ID as the final parameter for WHERE clause
      values.push(id);

      if (setClauses.length > 1) {
        // More than just updated_at
        const query = `UPDATE ${this.options.tablePrefix}_workflow_history 
                       SET ${setClauses.join(", ")} 
                       WHERE id = $${paramIndex}`;

        await client.query(query, values);
      }
    } catch (error) {
      this.debug("Error updating workflow history:", error);
      throw new Error("Failed to update workflow history entry");
    } finally {
      client.release();
    }
  }

  /**
   * Delete a workflow history entry
   */
  public async deleteWorkflowHistory(id: string): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      await client.query(`DELETE FROM ${this.options.tablePrefix}_workflow_history WHERE id = $1`, [
        id,
      ]);
      this.debug(`Deleted workflow history entry: ${id}`);
    } catch (error) {
      this.debug("Error deleting workflow history:", error);
      throw new Error("Failed to delete workflow history entry");
    } finally {
      client.release();
    }
  }

  /**
   * Store a workflow step
   */
  public async storeWorkflowStep(step: WorkflowStepHistoryEntry): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO ${this.options.tablePrefix}_workflow_steps 
         (id, workflow_history_id, step_index, step_type, step_name, status, start_time, end_time, 
          input, output, error_message, agent_execution_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
         status = $6, end_time = $8, output = $10, error_message = $11, 
         agent_execution_id = $12, updated_at = $14`,
        [
          step.id,
          step.workflowHistoryId,
          step.stepIndex,
          step.stepType,
          step.stepName,
          step.status,
          step.startTime,
          step.endTime || null,
          step.input ? JSON.stringify(step.input) : null,
          step.output ? JSON.stringify(step.output) : null,
          step.error ? JSON.stringify(step.error) : null,
          step.agentExecutionId || null,
          step.createdAt,
          step.updatedAt,
        ],
      );
      this.debug(`Stored workflow step: ${step.id}`);
    } catch (error) {
      this.debug("Error storing workflow step:", error);
      throw new Error("Failed to store workflow step");
    } finally {
      client.release();
    }
  }

  /**
   * Get a workflow step by ID
   */
  public async getWorkflowStep(id: string): Promise<WorkflowStepHistoryEntry | null> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM ${this.options.tablePrefix}_workflow_steps WHERE id = $1`,
        [id],
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        workflowHistoryId: row.workflow_history_id,
        stepIndex: row.step_index,
        stepType: row.step_type,
        stepName: row.step_name,
        status: row.status,
        startTime: row.start_time,
        endTime: row.end_time,
        input: row.input ? safeJsonParse(row.input) : null,
        output: row.output ? safeJsonParse(row.output) : null,
        error: row.error_message ? safeJsonParse(row.error_message) : null,
        agentExecutionId: row.agent_execution_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      this.debug("Error getting workflow step:", error);
      throw new Error("Failed to get workflow step");
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow steps by workflow history ID
   */
  public async getWorkflowSteps(workflowHistoryId: string): Promise<WorkflowStepHistoryEntry[]> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM ${this.options.tablePrefix}_workflow_steps 
         WHERE workflow_history_id = $1 ORDER BY step_index ASC`,
        [workflowHistoryId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        workflowHistoryId: row.workflow_history_id,
        stepIndex: row.step_index,
        stepType: row.step_type,
        stepName: row.step_name,
        status: row.status,
        startTime: row.start_time,
        endTime: row.end_time,
        input: row.input ? safeJsonParse(row.input) : null,
        output: row.output ? safeJsonParse(row.output) : null,
        error: row.error_message ? safeJsonParse(row.error_message) : null,
        agentExecutionId: row.agent_execution_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      this.debug("Error getting workflow steps:", error);
      throw new Error("Failed to get workflow steps");
    } finally {
      client.release();
    }
  }

  /**
   * Update a workflow step
   */
  public async updateWorkflowStep(
    id: string,
    updates: Partial<WorkflowStepHistoryEntry>,
  ): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }
      if (updates.endTime !== undefined) {
        updateFields.push(`end_time = $${paramCount++}`);
        values.push(updates.endTime);
      }
      if (updates.output !== undefined) {
        updateFields.push(`output = $${paramCount++}`);
        values.push(updates.output ? JSON.stringify(updates.output) : null);
      }
      if (updates.error !== undefined) {
        updateFields.push(`error_message = $${paramCount++}`);
        values.push(updates.error ? JSON.stringify(updates.error) : null);
      }
      if (updates.agentExecutionId !== undefined) {
        updateFields.push(`agent_execution_id = $${paramCount++}`);
        values.push(updates.agentExecutionId);
      }

      updateFields.push(`updated_at = $${paramCount++}`);
      values.push(new Date());

      values.push(id); // Add ID as last parameter

      await client.query(
        `UPDATE ${this.options.tablePrefix}_workflow_steps 
         SET ${updateFields.join(", ")} 
         WHERE id = $${paramCount}`,
        values,
      );

      this.debug(`Updated workflow step: ${id}`);
    } catch (error) {
      this.debug("Error updating workflow step:", error);
      throw new Error("Failed to update workflow step");
    } finally {
      client.release();
    }
  }

  /**
   * Delete a workflow step
   */
  public async deleteWorkflowStep(id: string): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      await client.query(`DELETE FROM ${this.options.tablePrefix}_workflow_steps WHERE id = $1`, [
        id,
      ]);
      this.debug(`Deleted workflow step: ${id}`);
    } catch (error) {
      this.debug("Error deleting workflow step:", error);
      throw new Error("Failed to delete workflow step");
    } finally {
      client.release();
    }
  }

  /**
   * Store a workflow timeline event
   */
  public async storeWorkflowTimelineEvent(event: any): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      // Convert Date to ISO string for PostgreSQL
      const createdAt = new Date().toISOString();

      // Extract event sequence from metadata (required)
      const eventSequence = event.metadata?.eventSequence;

      await client.query(
        `INSERT INTO ${this.options.tablePrefix}_workflow_timeline_events 
         (event_id, workflow_history_id, type, name, start_time, end_time, 
          status, level, input, output, metadata, event_sequence, 
          trace_id, parent_event_id, status_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (event_id) DO UPDATE SET
         end_time = $6, status = $7, output = $10, metadata = $11, event_sequence = $12`,
        [
          event.id,
          event.workflowHistoryId || event.traceId,
          event.type,
          event.name,
          event.startTime,
          event.endTime || null,
          event.status || null,
          event.level || "INFO",
          event.input ? JSON.stringify(event.input) : null,
          event.output ? JSON.stringify(event.output) : null,
          event.metadata ? JSON.stringify(event.metadata) : null,
          eventSequence, // ✅ ADD: Event sequence for ordering
          event.traceId || null,
          event.parentEventId || null,
          event.statusMessage ? JSON.stringify(event.statusMessage) : null,
          createdAt,
        ],
      );
      this.debug(`Stored workflow timeline event: ${event.eventId || event.id}`);
    } catch (error) {
      this.debug("Error storing workflow timeline event:", error);
      throw new Error("Failed to store workflow timeline event");
    } finally {
      client.release();
    }
  }

  /**
   * Get a workflow timeline event by ID
   */
  public async getWorkflowTimelineEvent(id: string): Promise<any | null> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM ${this.options.tablePrefix}_workflow_timeline_events WHERE event_id = $1`,
        [id],
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.event_id,
        workflowHistoryId: row.workflow_history_id,
        eventId: row.event_id,
        name: row.name,
        type: row.type,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        level: row.level,
        input: row.input ? safeJsonParse(row.input) : null,
        output: row.output ? safeJsonParse(row.output) : null,
        metadata: row.metadata ? safeJsonParse(row.metadata) : null,
        traceId: row.trace_id,
        parentEventId: row.parent_event_id,
        eventSequence: row.event_sequence,
        createdAt: new Date(row.created_at),
      } as WorkflowTimelineEvent;
    } catch (error) {
      this.debug("Error getting workflow timeline event:", error);
      throw new Error("Failed to get workflow timeline event");
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow timeline events by workflow history ID
   */
  public async getWorkflowTimelineEvents(workflowHistoryId: string): Promise<any[]> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM ${this.options.tablePrefix}_workflow_timeline_events 
         WHERE workflow_history_id = $1 
         ORDER BY event_sequence ASC, start_time ASC`,
        [workflowHistoryId],
      );

      return result.rows.map((row) => ({
        id: row.event_id,
        workflowHistoryId: row.workflow_history_id,
        eventId: row.event_id,
        name: row.name,
        type: row.type,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        level: row.level,
        input: row.input ? safeJsonParse(row.input) : null,
        output: row.output ? safeJsonParse(row.output) : null,
        metadata: row.metadata ? safeJsonParse(row.metadata) : null,
        traceId: row.trace_id,
        parentEventId: row.parent_event_id,
        eventSequence: row.event_sequence,
        createdAt: new Date(row.created_at),
      })) as WorkflowTimelineEvent[];
    } catch (error) {
      this.debug("Error getting workflow timeline events:", error);
      throw new Error("Failed to get workflow timeline events");
    } finally {
      client.release();
    }
  }

  /**
   * Delete a workflow timeline event
   */
  public async deleteWorkflowTimelineEvent(id: string): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM ${this.options.tablePrefix}_workflow_timeline_events WHERE event_id = $1`,
        [id],
      );
      this.debug(`Deleted workflow timeline event: ${id}`);
    } catch (error) {
      this.debug("Error deleting workflow timeline event:", error);
      throw new Error("Failed to delete workflow timeline event");
    } finally {
      client.release();
    }
  }

  /**
   * Get all workflow IDs
   */
  public async getAllWorkflowIds(): Promise<string[]> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT workflow_id FROM ${this.options.tablePrefix}_workflow_history`,
      );
      return result.rows.map((row) => row.workflow_id);
    } catch (error) {
      this.debug("Error getting all workflow IDs:", error);
      throw new Error("Failed to get workflow IDs");
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow statistics
   */
  public async getWorkflowStats(workflowId: string): Promise<WorkflowStats> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      const statsResult = await client.query(
        `SELECT 
           COUNT(*) as total_executions,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_executions,
           COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_executions,
           AVG(CASE WHEN status = 'completed' AND end_time IS NOT NULL 
               THEN EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 END) as avg_execution_time_ms,
           MAX(start_time) as last_execution_time
         FROM ${this.options.tablePrefix}_workflow_history 
         WHERE workflow_id = $1`,
        [workflowId],
      );

      const row = statsResult.rows[0];
      return {
        totalExecutions: Number.parseInt(row.total_executions) || 0,
        successfulExecutions: Number.parseInt(row.successful_executions) || 0,
        failedExecutions: Number.parseInt(row.failed_executions) || 0,
        averageExecutionTime: Number.parseFloat(row.avg_execution_time_ms) || 0,
        lastExecutionTime: row.last_execution_time ? new Date(row.last_execution_time) : undefined,
      };
    } catch (error) {
      this.debug("Error getting workflow stats:", error);
      throw new Error("Failed to get workflow statistics");
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow history with steps and events
   */
  public async getWorkflowHistoryWithStepsAndEvents(
    id: string,
  ): Promise<WorkflowHistoryEntry | null> {
    const history = await this.getWorkflowHistory(id);
    if (!history) return null;

    const [steps, events] = await Promise.all([
      this.getWorkflowSteps(id),
      this.getWorkflowTimelineEvents(id),
    ]);

    return {
      ...history,
      steps,
      events,
    };
  }

  /**
   * Delete workflow history with all related data
   */
  public async deleteWorkflowHistoryWithRelated(id: string): Promise<void> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Delete timeline events first
      await client.query(
        `DELETE FROM ${this.options.tablePrefix}_workflow_timeline_events WHERE workflow_history_id = $1`,
        [id],
      );

      // Delete steps
      await client.query(
        `DELETE FROM ${this.options.tablePrefix}_workflow_steps WHERE workflow_history_id = $1`,
        [id],
      );

      // Delete history entry
      await client.query(`DELETE FROM ${this.options.tablePrefix}_workflow_history WHERE id = $1`, [
        id,
      ]);

      await client.query("COMMIT");
      this.debug(`Deleted workflow history with related data: ${id}`);
    } catch (error) {
      await client.query("ROLLBACK");
      this.debug("Error deleting workflow history with related data:", error);
      throw new Error("Failed to delete workflow history with related data");
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup old workflow histories
   */
  public async cleanupOldWorkflowHistories(
    workflowId: string,
    maxEntries: number,
  ): Promise<number> {
    await this.initialized;
    const client = await this.pool.connect();
    try {
      // Get workflow history IDs to delete
      const historyResult = await client.query(
        `SELECT id FROM ${this.options.tablePrefix}_workflow_history 
         WHERE workflow_id = $1 
         ORDER BY created_at DESC 
         OFFSET $2`,
        [workflowId, maxEntries],
      );

      const idsToDelete = historyResult.rows.map((row) => row.id);

      if (idsToDelete.length === 0) {
        return 0;
      }

      // Delete related data for these entries
      for (const historyId of idsToDelete) {
        await this.deleteWorkflowHistoryWithRelated(historyId);
      }

      this.debug(
        `Cleaned up ${idsToDelete.length} old workflow histories for workflow: ${workflowId}`,
      );
      return idsToDelete.length;
    } catch (error) {
      this.debug("Error cleaning up old workflow histories:", error);
      throw new Error("Failed to cleanup old workflow histories");
    } finally {
      client.release();
    }
  }
}
