/**
 * PostgreSQL Storage Adapter for Memory
 * Stores conversations and messages in PostgreSQL database
 * Compatible with existing PostgreSQL storage structure
 */

import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type {
  Conversation,
  ConversationQueryOptions,
  CreateConversationInput,
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
        ssl?: boolean;
      }
    | string;

  /**
   * Maximum number of connections in the pool
   * @default 10
   */
  maxConnections?: number;

  /**
   * Maximum number of messages to store per conversation
   * @default 100
   */
  storageLimit?: number;

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
}

/**
 * PostgreSQL Storage Adapter for Memory
 * Production-ready storage for conversations and messages
 * Compatible with existing PostgreSQL storage structure
 */
export class PostgreSQLMemoryAdapter implements StorageAdapter {
  private pool: Pool;
  private storageLimit: number;
  private tablePrefix: string;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private debug: boolean;

  constructor(options: PostgreSQLMemoryOptions) {
    this.storageLimit = options.storageLimit ?? 100;
    this.tablePrefix = options.tablePrefix ?? "voltagent_memory";
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

      const conversationsTable = `${this.tablePrefix}_conversations`;
      const messagesTable = `${this.tablePrefix}_messages`;
      const usersTable = `${this.tablePrefix}_users`;

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
      const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${workflowStatesTable} (
          id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          workflow_name TEXT NOT NULL,
          status TEXT NOT NULL,
          suspension JSONB,
          user_id TEXT,
          conversation_id TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_user_id 
        ON ${conversationsTable}(user_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_resource_id 
        ON ${conversationsTable}(resource_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${messagesTable}_conversation_id 
        ON ${messagesTable}(conversation_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${messagesTable}_created_at 
        ON ${messagesTable}(created_at)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_workflow_id 
        ON ${workflowStatesTable}(workflow_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_status 
        ON ${workflowStatesTable}(status)
      `);

      // Run migration for existing tables
      try {
        await this.addUIMessageColumnsToMessagesTable(client);
      } catch (error) {
        this.log("Error adding UIMessage columns (non-critical):", error);
      }

      // Migrate default user_id values to actual values from conversations
      // Use pool-level queries to avoid interfering with transactional init queries
      try {
        await this.migrateDefaultUserIds(client);
      } catch (error) {
        this.log("Error migrating default user_ids (non-critical):", error);
      }

      await client.query("COMMIT");
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

      const messagesTable = `${this.tablePrefix}_messages`;

      // Ensure conversation exists
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new ConversationNotFoundError(conversationId);
      }

      // Insert message
      await client.query(
        `INSERT INTO ${messagesTable} 
         (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          conversationId,
          message.id || this.generateId(),
          userId,
          message.role,
          safeStringify(message.parts),
          message.metadata ? safeStringify(message.metadata) : null,
          2, // format_version
          new Date().toISOString(),
        ],
      );

      // Apply storage limit
      await this.applyStorageLimit(client, conversationId);

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

      const messagesTable = `${this.tablePrefix}_messages`;

      // Ensure conversation exists
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new ConversationNotFoundError(conversationId);
      }

      const now = new Date().toISOString();

      // Insert all messages
      for (const message of messages) {
        await client.query(
          `INSERT INTO ${messagesTable} 
           (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            conversationId,
            message.id || this.generateId(),
            userId,
            message.role,
            safeStringify(message.parts),
            message.metadata ? safeStringify(message.metadata) : null,
            2, // format_version
            now,
          ],
        );
      }

      // Apply storage limit
      await this.applyStorageLimit(client, conversationId);

      await client.query("COMMIT");
      this.log(`Added ${messages.length} messages to conversation ${conversationId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply storage limit to a conversation
   */
  private async applyStorageLimit(client: PoolClient, conversationId: string): Promise<void> {
    const messagesTable = `${this.tablePrefix}_messages`;

    // Get count of messages
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM ${messagesTable} WHERE conversation_id = $1`,
      [conversationId],
    );

    const count = Number.parseInt(countResult.rows[0].count);

    // Delete old messages beyond the storage limit
    if (count > this.storageLimit) {
      await client.query(
        `DELETE FROM ${messagesTable}
         WHERE conversation_id = $1 
         AND message_id IN (
           SELECT message_id FROM ${messagesTable}
           WHERE conversation_id = $1 
           ORDER BY created_at ASC 
           LIMIT $2
         )`,
        [conversationId, count - this.storageLimit],
      );
    }
  }

  /**
   * Get messages with optional filtering
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
  ): Promise<UIMessage[]> {
    await this.initPromise;

    const client = await this.pool.connect();
    try {
      const messagesTable = `${this.tablePrefix}_messages`;
      const { limit = this.storageLimit, before, after, roles } = options || {};

      // Build query with filters - use SELECT * to handle both old and new schemas safely
      let sql = `SELECT * FROM ${messagesTable}
                 WHERE conversation_id = $1 AND user_id = $2`;
      const params: any[] = [conversationId, userId];
      let paramCount = 3;

      // Add role filter
      if (roles && roles.length > 0) {
        const placeholders = roles.map((_, i) => `$${paramCount + i}`).join(",");
        sql += ` AND role IN (${placeholders})`;
        params.push(...roles);
        paramCount += roles.length;
      }

      // Add time filters
      if (before) {
        sql += ` AND created_at < $${paramCount}`;
        params.push(before.toISOString());
        paramCount++;
      }

      if (after) {
        sql += ` AND created_at > $${paramCount}`;
        params.push(after.toISOString());
        paramCount++;
      }

      // Order by creation time and apply limit
      sql += " ORDER BY created_at ASC";
      if (limit && limit > 0) {
        sql += ` LIMIT $${paramCount}`;
        params.push(limit);
      }

      const result = await client.query(sql, params);

      // Convert rows to UIMessages with on-the-fly migration for old format
      return result.rows.map((row) => {
        // Determine parts based on whether we have new format (parts) or old format (content)
        let parts: any;

        // Check for new format first (parts column exists and has value)
        if (row.parts !== undefined && row.parts !== null) {
          // New format - use parts directly (PostgreSQL returns JSONB as parsed object)
          if (typeof row.parts === "string") {
            try {
              parts = JSON.parse(row.parts);
            } catch {
              parts = [];
            }
          } else {
            parts = row.parts;
          }
        }
        // Check for old format (content column exists and has value)
        else if (row.content !== undefined && row.content !== null) {
          // Old format - convert content to parts
          let content = row.content;

          // PostgreSQL might return JSONB as already parsed
          if (typeof content === "string") {
            try {
              content = JSON.parse(content);
            } catch {
              // If parsing fails, treat as plain text
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
          } else if (Array.isArray(content)) {
            // Already an array of parts (old BaseMessage format with MessageContent array)
            parts = content;
          } else {
            // Unknown format - fallback to empty
            parts = [];
          }
        } else {
          // No content at all - empty parts
          parts = [];
        }

        return {
          id: row.message_id,
          role: row.role as "system" | "user" | "assistant",
          parts,
          metadata: row.metadata,
        };
      });
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

      const messagesTable = `${this.tablePrefix}_messages`;
      const conversationsTable = `${this.tablePrefix}_conversations`;

      if (conversationId) {
        // Clear messages for specific conversation
        await client.query(
          `DELETE FROM ${messagesTable} WHERE conversation_id = $1 AND user_id = $2`,
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
      const conversationsTable = `${this.tablePrefix}_conversations`;

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
      const conversationsTable = `${this.tablePrefix}_conversations`;

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
      const conversationsTable = `${this.tablePrefix}_conversations`;

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
      const conversationsTable = `${this.tablePrefix}_conversations`;
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

      const conversationsTable = `${this.tablePrefix}_conversations`;
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
      const conversationsTable = `${this.tablePrefix}_conversations`;

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
        const usersTable = `${this.tablePrefix}_users`;
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
        const usersTable = `${this.tablePrefix}_users`;
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
        const usersTable = `${this.tablePrefix}_users`;
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

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
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
      userId: row.user_id || undefined,
      conversationId: row.conversation_id || undefined,
      metadata: row.metadata || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Set workflow state
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    await this.initPromise;

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO ${workflowStatesTable} 
         (id, workflow_id, workflow_name, status, suspension, user_id, conversation_id, metadata, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
         workflow_id = EXCLUDED.workflow_id,
         workflow_name = EXCLUDED.workflow_name,
         status = EXCLUDED.status,
         suspension = EXCLUDED.suspension,
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

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
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
    const messagesTableName = `${this.tablePrefix}_messages`;
    const conversationsTableName = `${this.tablePrefix}_conversations`;

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
   * Add new columns to messages table for UIMessage format if they don't exist
   * This allows existing tables to support both old and new message formats
   */
  private async addUIMessageColumnsToMessagesTable(client: PoolClient): Promise<void> {
    const messagesTableName = `${this.tablePrefix}_messages`;

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
          this.log("Added 'parts' column to messages table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!existingColumns.includes("metadata")) {
        try {
          await client.query(`ALTER TABLE ${messagesTableName} ADD COLUMN metadata JSONB`);
          this.log("Added 'metadata' column to messages table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!existingColumns.includes("format_version")) {
        try {
          await client.query(
            `ALTER TABLE ${messagesTableName} ADD COLUMN format_version INTEGER DEFAULT 2`,
          );
          this.log("Added 'format_version' column to messages table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!existingColumns.includes("user_id")) {
        try {
          await client.query(
            `ALTER TABLE ${messagesTableName} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'`,
          );
          this.log("Added 'user_id' column to messages table");
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
          WHERE table_name = $1 AND column_name = 'type'
          `,
          [messagesTableName],
        );

        if (typeInfo.rows[0]?.is_nullable === "NO") {
          try {
            await client.query(`ALTER TABLE ${messagesTableName} ALTER COLUMN type DROP NOT NULL`);
            this.log("Made 'type' column nullable");
          } catch (e) {
            this.log("Error making type nullable:", e);
          }
        }
      }

      this.log("UIMessage columns migration completed for messages table");
    } catch (error) {
      this.log("Error in UIMessage columns migration (non-critical):", error);
      // Don't throw - this is not critical for new installations
    }
  }
}
