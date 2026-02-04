/**
 * PostgreSQL Storage Adapter for Memory
 * Stores conversations and messages in PostgreSQL database
 * Compatible with existing PostgreSQL storage structure
 */

import type { ConnectionOptions } from "node:tls";
import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type {
  Conversation,
  ConversationQueryOptions,
  ConversationStepRecord,
  CreateConversationInput,
  GetConversationStepsOptions,
  GetMessagesOptions,
  StorageAdapter,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import { Pool, type PoolClient } from "pg";

/**
 * PostgreSQL configuration options for Memory
 */
export interface PostgreSQLMemoryOptions {
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
        ssl?: boolean | ConnectionOptions;
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
   * PostgreSQL schema to use for all tables
   * @default undefined
   */
  schema?: string;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * PostgreSQL Storage Adapter for Memory
 * Production-ready storage for conversations and messages
 * Compatible with existing PostgreSQL storage structure
 */
export class PostgreSQLMemoryAdapter implements StorageAdapter {
  private pool: Pool;
  private tablePrefix: string;
  private schema: string | undefined;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private debug: boolean;

  constructor(options: PostgreSQLMemoryOptions) {
    this.tablePrefix = options.tablePrefix ?? "voltagent_memory";
    this.schema = options.schema;
    this.debug = options.debug ?? false;

    // Create PostgreSQL connection pool
    this.pool = new Pool({
      ...(typeof options.connection === "string"
        ? { connectionString: options.connection }
        : options.connection),
      max: options.maxConnections ?? 10,
    });

    this.log("PostgreSQL Memory V2 adapter initialized");

    // Start initialization but don't await it
    this.initPromise = this.initialize();
  }

  /**
   * Log debug messages
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[PostgreSQL Memory V2]", ...args);
    }
  }

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Get fully qualified table name with schema
   */
  private getTableName(tableName: string): string {
    if (this.schema) {
      return `"${this.schema}"."${tableName}"`;
    }
    return tableName;
  }

  /**
   * Initialize database schema
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Prevent multiple simultaneous initializations
    if (this.initPromise && !this.initialized) {
      return this.initPromise;
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Create schema if it doesn't exist and it's not the default public schema
      if (this.schema && this.schema !== "public") {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
        this.log(`Ensured schema "${this.schema}" exists`);
      }

      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);
      const baseConversationsTable = `${this.tablePrefix}_conversations`;
      const messagesTable = this.getTableName(`${this.tablePrefix}_messages`);
      const baseMessagesTable = `${this.tablePrefix}_messages`;
      const usersTable = this.getTableName(`${this.tablePrefix}_users`);
      const stepsTable = this.getTableName(`${this.tablePrefix}_steps`);
      const baseStepsTable = `${this.tablePrefix}_steps`;

      // Create users table (for user-level working memory)
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${usersTable} (
          id TEXT PRIMARY KEY,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create conversations table (matching existing structure)
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${conversationsTable} (
          id TEXT PRIMARY KEY,
          resource_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          metadata JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create messages table (matching existing structure)
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${messagesTable} (
          conversation_id TEXT NOT NULL REFERENCES ${conversationsTable}(id) ON DELETE CASCADE,
          message_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL,
          parts JSONB,
          metadata JSONB,
          format_version INTEGER DEFAULT 2,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          PRIMARY KEY (conversation_id, message_id)
        )
      `);

      // Create workflow states table
      const workflowStatesTable = this.getTableName(`${this.tablePrefix}_workflow_states`);
      const baseWorkflowStatesTable = `${this.tablePrefix}_workflow_states`;
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${workflowStatesTable} (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          workflow_name TEXT NOT NULL,
          status TEXT NOT NULL,
          suspension JSONB,
          events JSONB,
          output JSONB,
          cancellation JSONB,
          user_id TEXT,
          conversation_id TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);

      // Create conversation steps table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${stepsTable} (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL REFERENCES ${conversationsTable}(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          agent_name TEXT,
          operation_id TEXT,
          step_index INTEGER NOT NULL,
          type TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT,
          arguments JSONB,
          result JSONB,
          usage JSONB,
          sub_agent_id TEXT,
          sub_agent_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
        )
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseConversationsTable}_user_id 
        ON ${conversationsTable}(user_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseConversationsTable}_resource_id 
        ON ${conversationsTable}(resource_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseMessagesTable}_conversation_id 
        ON ${messagesTable}(conversation_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseMessagesTable}_created_at 
        ON ${messagesTable}(created_at)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseWorkflowStatesTable}_workflow_id 
        ON ${workflowStatesTable}(workflow_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseWorkflowStatesTable}_status 
        ON ${workflowStatesTable}(status)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseStepsTable}_conversation 
        ON ${stepsTable}(conversation_id, step_index)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${baseStepsTable}_operation 
        ON ${stepsTable}(conversation_id, operation_id)
      `);

      // Run migration for existing tables
      try {
        await this.addUIMessageColumnsToMessagesTable(client);
      } catch (error) {
        this.log("Error adding UIMessage columns (non-critical):", error);
      }

      // Run workflow state columns migration
      try {
        await this.addWorkflowStateColumns(client);
      } catch (error) {
        this.log("Error adding workflow state columns (non-critical):", error);
      }

      await client.query("COMMIT");

      // Migrate default user_id values to actual values from conversations
      // Use pool-level queries to avoid interfering with transactional init queries
      try {
        await this.migrateDefaultUserIds(client);
      } catch (error) {
        this.log("Error migrating default user_ids (non-critical):", error);
      }

      this.initialized = true;
      this.log("Database schema initialized");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Add a single message
   */
  async addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const messagesTable = this.getTableName(`${this.tablePrefix}_messages`);
      const messageId = message.id || this.generateId();

      // Ensure conversation exists
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new ConversationNotFoundError(conversationId);
      }

      // Insert message
      await client.query(
        `INSERT INTO ${messagesTable} 
         (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (conversation_id, message_id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           role = EXCLUDED.role,
           parts = EXCLUDED.parts,
           metadata = EXCLUDED.metadata,
           format_version = EXCLUDED.format_version`,
        [
          conversationId,
          messageId,
          userId,
          message.role,
          safeStringify(message.parts),
          message.metadata ? safeStringify(message.metadata) : null,
          2, // format_version
          new Date().toISOString(),
        ],
      );

      await client.query("COMMIT");
      this.log(`Added message to conversation ${conversationId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add multiple messages
   */
  async addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const messagesTable = this.getTableName(`${this.tablePrefix}_messages`);

      // Ensure conversation exists
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new ConversationNotFoundError(conversationId);
      }

      const now = new Date().toISOString();

      // Insert all messages
      for (const message of messages) {
        const messageId = message.id || this.generateId();
        await client.query(
          `INSERT INTO ${messagesTable} 
           (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (conversation_id, message_id) DO UPDATE SET
             user_id = EXCLUDED.user_id,
             role = EXCLUDED.role,
             parts = EXCLUDED.parts,
             metadata = EXCLUDED.metadata,
             format_version = EXCLUDED.format_version`,
          [
            conversationId,
            messageId,
            userId,
            message.role,
            safeStringify(message.parts),
            message.metadata ? safeStringify(message.metadata) : null,
            2, // format_version
            now,
          ],
        );
      }

      await client.query("COMMIT");
      this.log(`Added ${messages.length} messages to conversation ${conversationId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    if (steps.length === 0) {
      return;
    }

    await this.initPromise;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const stepsTable = this.getTableName(`${this.tablePrefix}_steps`);

      for (const step of steps) {
        await client.query(
          `INSERT INTO ${stepsTable} (
             id,
             conversation_id,
             user_id,
             agent_id,
             agent_name,
             operation_id,
             step_index,
             type,
             role,
             content,
             arguments,
             result,
             usage,
             sub_agent_id,
             sub_agent_name,
             created_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
           )
           ON CONFLICT (id) DO UPDATE SET
             conversation_id = EXCLUDED.conversation_id,
             user_id = EXCLUDED.user_id,
             agent_id = EXCLUDED.agent_id,
             agent_name = EXCLUDED.agent_name,
             operation_id = EXCLUDED.operation_id,
             step_index = EXCLUDED.step_index,
             type = EXCLUDED.type,
             role = EXCLUDED.role,
             content = EXCLUDED.content,
             arguments = EXCLUDED.arguments,
             result = EXCLUDED.result,
             usage = EXCLUDED.usage,
             sub_agent_id = EXCLUDED.sub_agent_id,
             sub_agent_name = EXCLUDED.sub_agent_name,
             created_at = EXCLUDED.created_at`,
          [
            step.id,
            step.conversationId,
            step.userId,
            step.agentId,
            step.agentName ?? null,
            step.operationId ?? null,
            step.stepIndex,
            step.type,
            step.role,
            step.content ?? null,
            step.arguments ? safeStringify(step.arguments) : null,
            step.result ? safeStringify(step.result) : null,
            step.usage ? safeStringify(step.usage) : null,
            step.subAgentId ?? null,
            step.subAgentName ?? null,
            step.createdAt ?? new Date().toISOString(),
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get messages with optional filtering
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    await this.initPromise;

    // Debug: Method entry
    this.log("getMessages called:", { userId, conversationId, options });

    const client = await this.pool.connect();
    try {
      const messagesTable = this.getTableName(`${this.tablePrefix}_messages`);
      const { limit, before, after, roles } = options || {};

      // Debug: Parsed options
      this.log("Parsed options:", {
        limit,
        before: before?.toISOString(),
        after: after?.toISOString(),
        roles,
      });

      // Build query with filters - use SELECT * to handle both old and new schemas safely
      let sql = `SELECT * FROM (
             SELECT * FROM ${messagesTable}
             WHERE conversation_id = $1 AND user_id = $2`;
      const params: any[] = [conversationId, userId];
      let paramCount = 3;

      // Add role filter
      if (roles && roles.length > 0) {
        const placeholders = roles.map((_, i) => `$${paramCount + i}`).join(",");
        sql += ` AND role IN (${placeholders})`;
        params.push(...roles);
        paramCount += roles.length;

        // Debug: Role filter added
        this.log("Added role filter:", { roles, placeholders });
      }

      // Add time filters
      if (before) {
        sql += ` AND created_at < $${paramCount}`;
        params.push(before.toISOString());
        paramCount++;

        // Debug: Before filter added
        this.log("Added before filter:", before.toISOString());
      }

      if (after) {
        sql += ` AND created_at > $${paramCount}`;
        params.push(after.toISOString());
        paramCount++;

        // Debug: After filter added
        this.log("Added after filter:", after.toISOString());
      }

      // Order by creation time and apply limit
      sql += " ORDER BY created_at DESC";
      if (limit && limit > 0) {
        sql += ` LIMIT $${paramCount}`;
        params.push(limit);
      }

      sql += " ) AS subq ORDER BY created_at ASC";

      // Debug: Final SQL and parameters
      this.log("Final SQL query:", sql);
      this.log("Query parameters:", params);

      const result = await client.query(sql, params);

      // Debug: Query results
      this.log("Query returned rows:", result.rows.length);

      // Convert rows to UIMessages with on-the-fly migration for old format
      const messages = result.rows.map((row, index) => {
        // Debug: Processing row
        this.log(`Processing row ${index}:`, {
          message_id: row.message_id,
          has_parts: row.parts !== undefined && row.parts !== null,
          has_content: row.content !== undefined && row.content !== null,
          role: row.role,
        });

        // Determine parts based on whether we have new format (parts) or old format (content)
        let parts: any;

        // Check for new format first (parts column exists and has value)
        if (row.parts !== undefined && row.parts !== null) {
          // Debug: New format detected
          this.log(`Row ${index}: Using new format (parts column)`);

          // New format - use parts directly (PostgreSQL returns JSONB as parsed object)
          if (typeof row.parts === "string") {
            try {
              parts = JSON.parse(row.parts);
              this.log(`Row ${index}: Parsed parts from string`);
            } catch (e) {
              parts = [];
              this.log(`Row ${index}: Failed to parse parts, using empty array`, e);
            }
          } else {
            parts = row.parts;
            this.log(`Row ${index}: Parts already parsed as object`);
          }
        }
        // Check for old format (content column exists and has value)
        else if (row.content !== undefined && row.content !== null) {
          // Debug: Old format detected
          this.log(`Row ${index}: Using old format (content column)`);

          // Old format - convert content to parts
          let content = row.content;

          // PostgreSQL might return JSONB as already parsed
          if (typeof content === "string") {
            try {
              content = JSON.parse(content);
              this.log(`Row ${index}: Parsed content from string`);
            } catch (e) {
              // If parsing fails, treat as plain text
              this.log(`Row ${index}: Failed to parse content, treating as plain text`, e);
              parts = [{ type: "text", text: content }];
              return {
                id: row.message_id,
                role: row.role as "system" | "user" | "assistant",
                parts,
                metadata: row.metadata,
              };
            }
          }

          if (typeof content === "string") {
            // Simple string content -> text part
            parts = [{ type: "text", text: content }];
            this.log(`Row ${index}: Converted string content to text part`);
          } else if (Array.isArray(content)) {
            // Already an array of parts (old BaseMessage format with MessageContent array)
            parts = content;
            this.log(`Row ${index}: Content is already an array of parts, length:`, content.length);
          } else {
            // Unknown format - fallback to empty
            parts = [];
            this.log(`Row ${index}: Unknown content format, using empty parts`, typeof content);
          }
        } else {
          // No content at all - empty parts
          parts = [];
          this.log(`Row ${index}: No content or parts found, using empty parts`);
        }

        const message = {
          id: row.message_id,
          role: row.role as "system" | "user" | "assistant",
          parts,
          metadata: {
            ...(row.metadata || {}),
            createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
          },
        };

        // Debug: Final message structure
        this.log(`Row ${index}: Final message:`, {
          id: message.id,
          role: message.role,
          partsCount: parts.length,
          hasMetadata: !!message.metadata,
        });

        return message;
      });

      // Debug: Method exit
      this.log(`getMessages returning ${messages.length} messages`);

      return messages;
    } finally {
      client.release();
    }
  }

  async getConversationSteps(
    userId: string,
    conversationId: string,
    options?: GetConversationStepsOptions,
  ): Promise<ConversationStepRecord[]> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const stepsTable = this.getTableName(`${this.tablePrefix}_steps`);
      const conditions: string[] = ["conversation_id = $1", "user_id = $2"];
      const values: Array<string | number> = [conversationId, userId];
      let paramIndex = values.length;

      if (options?.operationId) {
        paramIndex += 1;
        conditions.push(`operation_id = $${paramIndex}`);
        values.push(options.operationId);
      }

      let query = `SELECT * FROM ${stepsTable} WHERE ${conditions.join(" AND ")} ORDER BY step_index ASC`;

      if (options?.limit && options.limit > 0) {
        paramIndex += 1;
        query += ` LIMIT $${paramIndex}`;
        values.push(options.limit);
      }

      const result = await client.query(query, values);

      return result.rows.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        agentId: row.agent_id,
        agentName: row.agent_name ?? undefined,
        operationId: row.operation_id ?? undefined,
        stepIndex:
          typeof row.step_index === "number" ? row.step_index : Number(row.step_index ?? 0),
        type: row.type,
        role: row.role,
        content: row.content ?? undefined,
        arguments: row.arguments ?? undefined,
        result: row.result ?? undefined,
        usage: row.usage ?? undefined,
        subAgentId: row.sub_agent_id ?? undefined,
        subAgentName: row.sub_agent_name ?? undefined,
        createdAt: row.created_at ?? new Date().toISOString(),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Clear messages for a user
   */
  async clearMessages(userId: string, conversationId?: string): Promise<void> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const messagesTable = this.getTableName(`${this.tablePrefix}_messages`);
      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);
      const stepsTable = this.getTableName(`${this.tablePrefix}_steps`);

      if (conversationId) {
        // Clear messages for specific conversation
        await client.query(
          `DELETE FROM ${messagesTable} WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId],
        );
        await client.query(
          `DELETE FROM ${stepsTable} WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId],
        );
      } else {
        // Clear all messages for the user
        await client.query(
          `DELETE FROM ${messagesTable}
           WHERE conversation_id IN (
             SELECT id FROM ${conversationsTable} WHERE user_id = $1
           )`,
          [userId],
        );
        await client.query(
          `DELETE FROM ${stepsTable}
           WHERE conversation_id IN (
             SELECT id FROM ${conversationsTable} WHERE user_id = $1
           )`,
          [userId],
        );
      }

      await client.query("COMMIT");
      this.log(`Cleared messages for user ${userId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete specific messages by ID for a conversation
   */
  async deleteMessages(
    messageIds: string[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.initPromise;

    if (messageIds.length === 0) {
      return;
    }

    const client = await this.pool.connect();
    try {
      const messagesTable = this.getTableName(`${this.tablePrefix}_messages`);
      await client.query(
        `DELETE FROM ${messagesTable}
         WHERE conversation_id = $1 AND user_id = $2 AND message_id = ANY($3::text[])`,
        [conversationId, userId, messageIds],
      );
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);

      // Check if conversation already exists
      const existing = await this.getConversation(input.id);
      if (existing) {
        throw new ConversationAlreadyExistsError(input.id);
      }

      const now = new Date().toISOString();

      const result = await client.query(
        `INSERT INTO ${conversationsTable} 
         (id, resource_id, user_id, title, metadata, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          input.id,
          input.resourceId,
          input.userId,
          input.title,
          safeStringify(input.metadata || {}),
          now,
          now,
        ],
      );

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);

      const result = await client.query(`SELECT * FROM ${conversationsTable} WHERE id = $1`, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get conversations by resource ID
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);

      const result = await client.query(
        `SELECT * FROM ${conversationsTable} WHERE resource_id = $1 ORDER BY updated_at DESC`,
        [resourceId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get conversations by user ID
   */
  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    return this.queryConversations({ ...options, userId });
  }

  /**
   * Query conversations with filters
   */
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);
      let sql = `SELECT * FROM ${conversationsTable} WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 1;

      // Add filters
      if (options.userId) {
        sql += ` AND user_id = $${paramCount}`;
        params.push(options.userId);
        paramCount++;
      }

      if (options.resourceId) {
        sql += ` AND resource_id = $${paramCount}`;
        params.push(options.resourceId);
        paramCount++;
      }

      // Add ordering
      const orderBy = options.orderBy || "updated_at";
      const orderDirection = options.orderDirection || "DESC";
      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination
      if (options.limit) {
        sql += ` LIMIT $${paramCount}`;
        params.push(options.limit);
        paramCount++;
      }

      if (options.offset) {
        sql += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }

      const result = await client.query(sql, params);

      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Count conversations with filters
   */
  async countConversations(options: ConversationQueryOptions): Promise<number> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);
      let sql = `SELECT COUNT(*) as count FROM ${conversationsTable} WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 1;

      if (options.userId) {
        sql += ` AND user_id = $${paramCount}`;
        params.push(options.userId);
        paramCount++;
      }

      if (options.resourceId) {
        sql += ` AND resource_id = $${paramCount}`;
        params.push(options.resourceId);
        paramCount++;
      }

      const result = await client.query(sql, params);
      const count = Number(result.rows[0]?.count ?? 0);
      return Number.isNaN(count) ? 0 : count;
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
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);
      const conversation = await this.getConversation(id);
      if (!conversation) {
        throw new ConversationNotFoundError(id);
      }

      const now = new Date().toISOString();
      const fieldsToUpdate: string[] = ["updated_at = $1"];
      const params: any[] = [now];
      let paramCount = 2;

      if (updates.title !== undefined) {
        fieldsToUpdate.push(`title = $${paramCount}`);
        params.push(updates.title);
        paramCount++;
      }

      if (updates.resourceId !== undefined) {
        fieldsToUpdate.push(`resource_id = $${paramCount}`);
        params.push(updates.resourceId);
        paramCount++;
      }

      if (updates.metadata !== undefined) {
        fieldsToUpdate.push(`metadata = $${paramCount}`);
        params.push(safeStringify(updates.metadata));
        paramCount++;
      }

      params.push(id); // WHERE clause

      const result = await client.query(
        `UPDATE ${conversationsTable} 
         SET ${fieldsToUpdate.join(", ")} 
         WHERE id = $${paramCount}
         RETURNING *`,
        params,
      );

      await client.query("COMMIT");

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const conversationsTable = this.getTableName(`${this.tablePrefix}_conversations`);

      await client.query(`DELETE FROM ${conversationsTable} WHERE id = $1`, [id]);

      this.log(`Deleted conversation ${id}`);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // Working Memory Operations
  // ============================================================================

  /**
   * Get working memory
   */
  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      if (params.scope === "conversation" && params.conversationId) {
        const conversation = await this.getConversation(params.conversationId);
        return (conversation?.metadata?.workingMemory as string) || null;
      }

      if (params.scope === "user" && params.userId) {
        const usersTable = this.getTableName(`${this.tablePrefix}_users`);
        const result = await client.query(`SELECT metadata FROM ${usersTable} WHERE id = $1`, [
          params.userId,
        ]);

        if (result.rows.length > 0) {
          const metadata = result.rows[0].metadata || {};
          return metadata.workingMemory || null;
        }
      }

      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Set working memory
   */
  async setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      if (params.scope === "conversation" && params.conversationId) {
        const conversation = await this.getConversation(params.conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError(params.conversationId);
        }

        const metadata = conversation.metadata || {};
        metadata.workingMemory = params.content;

        await this.updateConversation(params.conversationId, { metadata });
      }

      if (params.scope === "user" && params.userId) {
        const usersTable = this.getTableName(`${this.tablePrefix}_users`);
        const now = new Date().toISOString();

        // Check if user exists
        const result = await client.query(`SELECT metadata FROM ${usersTable} WHERE id = $1`, [
          params.userId,
        ]);

        if (result.rows.length > 0) {
          // User exists, update metadata
          const metadata = result.rows[0].metadata || {};
          metadata.workingMemory = params.content;

          await client.query(
            `UPDATE ${usersTable} SET metadata = $1, updated_at = $2 WHERE id = $3`,
            [metadata, now, params.userId],
          );
        } else {
          // User doesn't exist, create new record
          await client.query(
            `INSERT INTO ${usersTable} (id, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4)`,
            [params.userId, { workingMemory: params.content }, now, now],
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete working memory
   */
  async deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      if (params.scope === "conversation" && params.conversationId) {
        const conversation = await this.getConversation(params.conversationId);
        if (conversation?.metadata?.workingMemory) {
          const metadata = { ...conversation.metadata };
          (metadata as any).workingMemory = undefined;
          await this.updateConversation(params.conversationId, { metadata });
        }
      }

      if (params.scope === "user" && params.userId) {
        const usersTable = this.getTableName(`${this.tablePrefix}_users`);
        const result = await client.query(`SELECT metadata FROM ${usersTable} WHERE id = $1`, [
          params.userId,
        ]);

        if (result.rows.length > 0 && result.rows[0].metadata) {
          const metadata = result.rows[0].metadata;
          if (metadata.workingMemory) {
            (metadata as any).workingMemory = undefined;
            await client.query(
              `UPDATE ${usersTable} SET metadata = $1, updated_at = $2 WHERE id = $3`,
              [metadata, new Date().toISOString(), params.userId],
            );
          }
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // Workflow State Operations
  // ============================================================================

  /**
   * Get workflow state by execution ID
   */
  async getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    await this.initPromise;

    const workflowStatesTable = this.getTableName(`${this.tablePrefix}_workflow_states`);
    const result = await this.pool.query(`SELECT * FROM ${workflowStatesTable} WHERE id = $1`, [
      executionId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      status: row.status,
      suspension: row.suspension || undefined,
      events: row.events || undefined,
      output: row.output || undefined,
      cancellation: row.cancellation || undefined,
      userId: row.user_id || undefined,
      conversationId: row.conversation_id || undefined,
      metadata: row.metadata || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Query workflow states with optional filters
   */
  async queryWorkflowRuns(query: {
    workflowId?: string;
    status?: WorkflowStateEntry["status"];
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<WorkflowStateEntry[]> {
    await this.initPromise;

    const workflowStatesTable = this.getTableName(`${this.tablePrefix}_workflow_states`);
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.workflowId) {
      conditions.push(`workflow_id = $${paramIndex++}`);
      params.push(query.workflowId);
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }

    if (query.from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(query.from);
    }

    if (query.to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(query.to);
    }

    let sql = `SELECT * FROM ${workflowStatesTable}`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY created_at DESC";

    if (query.limit !== undefined) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
    }

    if (query.offset !== undefined) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(query.offset);
    }

    const result = await this.pool.query(sql, params);

    return result.rows.map((row) => ({
      id: row.id,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      status: row.status as WorkflowStateEntry["status"],
      suspension: row.suspension || undefined,
      events: row.events || undefined,
      output: row.output || undefined,
      cancellation: row.cancellation || undefined,
      userId: row.user_id || undefined,
      conversationId: row.conversation_id || undefined,
      metadata: row.metadata || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Set workflow state
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    await this.initPromise;

    const workflowStatesTable = this.getTableName(`${this.tablePrefix}_workflow_states`);
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO ${workflowStatesTable}
         (id, workflow_id, workflow_name, status, suspension, events, output, cancellation, user_id, conversation_id, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
         workflow_id = EXCLUDED.workflow_id,
         workflow_name = EXCLUDED.workflow_name,
         status = EXCLUDED.status,
         suspension = EXCLUDED.suspension,
         events = EXCLUDED.events,
         output = EXCLUDED.output,
         cancellation = EXCLUDED.cancellation,
         user_id = EXCLUDED.user_id,
         conversation_id = EXCLUDED.conversation_id,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
        [
          executionId,
          state.workflowId,
          state.workflowName,
          state.status,
          state.suspension ? safeStringify(state.suspension) : null,
          state.events ? safeStringify(state.events) : null,
          state.output ? safeStringify(state.output) : null,
          state.cancellation ? safeStringify(state.cancellation) : null,
          state.userId || null,
          state.conversationId || null,
          state.metadata ? safeStringify(state.metadata) : null,
          state.createdAt,
          state.updatedAt,
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
   * Update workflow state
   */
  async updateWorkflowState(
    executionId: string,
    updates: Partial<WorkflowStateEntry>,
  ): Promise<void> {
    await this.initPromise;

    const existing = await this.getWorkflowState(executionId);
    if (!existing) {
      throw new Error(`Workflow state ${executionId} not found`);
    }

    const updated: WorkflowStateEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    await this.setWorkflowState(executionId, updated);
  }

  /**
   * Get suspended workflow states for a workflow
   */
  async getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    await this.initPromise;

    const workflowStatesTable = this.getTableName(`${this.tablePrefix}_workflow_states`);
    const result = await this.pool.query(
      `SELECT * FROM ${workflowStatesTable} WHERE workflow_id = $1 AND status = $2 ORDER BY created_at DESC`,
      [workflowId, "suspended"],
    );

    return result.rows.map((row) => ({
      id: row.id,
      workflowId: row.workflow_id,
      workflowName: row.workflow_name,
      status: "suspended" as const,
      suspension: row.suspension || undefined,
      userId: row.user_id || undefined,
      conversationId: row.conversation_id || undefined,
      metadata: row.metadata || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.log("Database connection pool closed");
  }

  /**
   * Migrate default user_id values in messages table
   * Updates messages with user_id='default' to use the actual user_id from their conversation
   */
  private async migrateDefaultUserIds(_client: PoolClient): Promise<void> {
    const messagesTableName = this.getTableName(`${this.tablePrefix}_messages`);
    const conversationsTableName = this.getTableName(`${this.tablePrefix}_conversations`);

    try {
      // First, check if there are any messages with default user_id
      // NOTE: Intentionally use pool.query instead of the transaction client
      // so this migration doesn't consume mocked transactional queries in tests.
      const checkResult: any = await this.pool.query(
        `SELECT COUNT(*) as count FROM ${messagesTableName} WHERE user_id = 'default'`,
      );

      const defaultCount = Number.parseInt(checkResult.rows[0]?.count || "0");

      if (defaultCount === 0) {
        return;
      }

      this.log(`Found ${defaultCount} messages with default user_id, starting migration`);

      // Update messages with the actual user_id from their conversation
      // PostgreSQL supports UPDATE FROM syntax for efficient joins
      const updateResult: any = await this.pool.query(
        `UPDATE ${messagesTableName} m
         SET user_id = c.user_id
         FROM ${conversationsTableName} c
         WHERE m.conversation_id = c.id
         AND m.user_id = 'default'`,
      );

      const updatedCount = updateResult.rowCount || 0;
      this.log(
        `Successfully migrated ${updatedCount} messages from default user_id to actual user_ids`,
      );

      // Check if there are any remaining messages with default user_id (orphaned messages)
      const remainingResult: any = await this.pool.query(
        `SELECT COUNT(*) as count FROM ${messagesTableName} WHERE user_id = 'default'`,
      );

      const remainingCount = Number.parseInt(remainingResult.rows[0]?.count || "0");

      if (remainingCount > 0) {
        this.log(
          `Warning: ${remainingCount} messages still have default user_id (possibly orphaned messages without valid conversations)`,
        );
      }
    } catch (error) {
      // Log the error but don't throw - this migration is not critical
      this.log("Failed to migrate default user_ids:", error);
    }
  }

  /**
   * Add new columns to workflow_states table for event persistence
   * This migration adds support for events, output, and cancellation tracking
   */
  private async addWorkflowStateColumns(client: PoolClient): Promise<void> {
    // Use base table name for information_schema queries
    const baseTable = `${this.tablePrefix}_workflow_states`;
    const schemaCondition = this.schema ? "table_schema = $1" : "table_schema = current_schema()";
    const params = this.schema ? [this.schema, baseTable] : [baseTable];

    try {
      const columnCheck = await client.query(
        `
      SELECT column_name
      FROM information_schema.columns
      WHERE ${schemaCondition} AND table_name = $${this.schema ? 2 : 1}
      `,
        params,
      );

      const existingColumns = columnCheck.rows.map((row) => row.column_name);

      if (!existingColumns.includes("events")) {
        try {
          await client.query(`ALTER TABLE ${this.getTableName(baseTable)} ADD COLUMN events JSONB`);
          this.log("Added 'events' column to workflow_states table");
        } catch (_e) {}
      }

      if (!existingColumns.includes("output")) {
        try {
          await client.query(`ALTER TABLE ${this.getTableName(baseTable)} ADD COLUMN output JSONB`);
          this.log("Added 'output' column to workflow_states table");
        } catch (_e) {}
      }

      if (!existingColumns.includes("cancellation")) {
        try {
          await client.query(
            `ALTER TABLE ${this.getTableName(baseTable)} ADD COLUMN cancellation JSONB`,
          );
          this.log("Added 'cancellation' column to workflow_states table");
        } catch (_e) {}
      }
    } catch (error) {
      this.log("Failed to add workflow state columns (non-critical):", error);
    }
  }

  /**
   * Add new columns to messages table for UIMessage format if they don't exist
   * This allows existing tables to support both old and new message formats
   */
  private async addUIMessageColumnsToMessagesTable(client: PoolClient): Promise<void> {
    const baseTable = `${this.tablePrefix}_messages`;
    const schemaCondition = this.schema ? "table_schema = $1" : "table_schema = current_schema()";
    const params = this.schema ? [this.schema, baseTable] : [baseTable];

    try {
      const columnCheck = await client.query(
        `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE ${schemaCondition} AND table_name = $${this.schema ? 2 : 1}
      `,
        params,
      );

      const existingColumns = columnCheck.rows.map((row) => row.column_name);

      if (!existingColumns.includes("parts")) {
        try {
          await client.query(`ALTER TABLE ${this.getTableName(baseTable)} ADD COLUMN parts JSONB`);
          this.log("Added 'parts' column to messages table");
        } catch (_e) {}
      }

      if (!existingColumns.includes("metadata")) {
        try {
          await client.query(
            `ALTER TABLE ${this.getTableName(baseTable)} ADD COLUMN metadata JSONB`,
          );
          this.log("Added 'metadata' column to messages table");
        } catch (_e) {}
      }

      if (!existingColumns.includes("format_version")) {
        try {
          await client.query(
            `ALTER TABLE ${this.getTableName(baseTable)} ADD COLUMN format_version INTEGER DEFAULT 2`,
          );
          this.log("Added 'format_version' column to messages table");
        } catch (_e) {}
      }

      if (!existingColumns.includes("user_id")) {
        try {
          await client.query(
            `ALTER TABLE ${this.getTableName(baseTable)} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'`,
          );
          this.log("Added 'user_id' column to messages table");
        } catch (_e) {}
      }

      // Make content and type nullable for new format
      if (existingColumns.includes("content")) {
        const contentInfo = await client.query(
          `
        SELECT is_nullable
        FROM information_schema.columns
        WHERE ${schemaCondition} AND table_name = $${this.schema ? 2 : 1} AND column_name = 'content'
        `,
          params,
        );

        if (contentInfo.rows[0]?.is_nullable === "NO") {
          try {
            await client.query(
              `ALTER TABLE ${this.getTableName(baseTable)} ALTER COLUMN content DROP NOT NULL`,
            );
            this.log("Made 'content' column nullable");
          } catch (e) {
            this.log("Error making content nullable:", e);
          }
        }
      }

      if (existingColumns.includes("type")) {
        const typeInfo = await client.query(
          `
        SELECT is_nullable
        FROM information_schema.columns
        WHERE ${schemaCondition} AND table_name = $${this.schema ? 2 : 1} AND column_name = 'type'
        `,
          params,
        );

        if (typeInfo.rows[0]?.is_nullable === "NO") {
          try {
            await client.query(
              `ALTER TABLE ${this.getTableName(baseTable)} ALTER COLUMN type DROP NOT NULL`,
            );
            this.log("Made 'type' column nullable");
          } catch (e) {
            this.log("Error making type nullable:", e);
          }
        }
      }

      this.log("UIMessage columns migration completed for messages table");
    } catch (error) {
      this.log("Error in UIMessage columns migration (non-critical):", error);
    }
  }
}
