/**
 * LibSQL Storage Adapter for Memory
 * Stores conversations and messages in SQLite/Turso database
 * Compatible with existing LibSQL storage structure
 */

import fs from "node:fs";
import path from "node:path";
import { type Client, createClient } from "@libsql/client";
import {
  AgentRegistry,
  ConversationAlreadyExistsError,
  ConversationNotFoundError,
} from "@voltagent/core";
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
import { type Logger, createPinoLogger } from "@voltagent/logger";
import type { UIMessage } from "ai";

/**
 * LibSQL configuration options for Memory
 */
export interface LibSQLMemoryOptions {
  /**
   * Database URL (e.g., 'file:./conversations.db' or 'libsql://...')
   * @default "file:./.voltagent/memory.db"
   */
  url?: string;

  /**
   * Auth token for remote connections (optional)
   */
  authToken?: string;

  /**
   * Prefix for table names
   * @default "voltagent_memory"
   */
  tablePrefix?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Logger instance
   */
  logger?: Logger;

  /**
   * Maximum number of retries for database operations
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial retry delay in milliseconds
   * @default 100
   */
  retryDelayMs?: number;
}

/**
 * LibSQL Storage Adapter for Memory
 * Production-ready storage for conversations and messages
 * Compatible with existing LibSQL storage structure
 */
export class LibSQLMemoryAdapter implements StorageAdapter {
  private client: Client;
  private tablePrefix: string;
  private initialized = false;
  private logger: Logger;
  private maxRetries: number;
  private retryDelayMs: number;
  private url: string;

  constructor(options: LibSQLMemoryOptions = {}) {
    this.tablePrefix = options.tablePrefix ?? "voltagent_memory";
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 100;

    // Initialize logger - use provided logger, global logger, or create new one
    this.logger =
      options.logger ||
      AgentRegistry.getInstance().getGlobalLogger() ||
      createPinoLogger({ name: "libsql-memory" });

    this.url = options.url ?? "file:./.voltagent/memory.db";

    // Create directory for file-based databases
    if (this.url.startsWith("file:")) {
      const dbPath = this.url.replace("file:", "");
      const dbDir = path.dirname(dbPath);
      if (dbDir && dbDir !== "." && !fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        this.logger.debug(`Created database directory: ${dbDir}`);
      }
    }

    // Create LibSQL client
    this.client = createClient({
      url: this.url,
      authToken: options.authToken,
    });

    this.logger.debug("LibSQL Memory adapter initialized", { url: this.url });
  }

  /**
   * Execute a database operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable (SQLITE_BUSY, etc.)
        if (
          error?.code === "SQLITE_BUSY" ||
          error?.message?.includes("SQLITE_BUSY") ||
          error?.message?.includes("database is locked")
        ) {
          const delay = this.retryDelayMs * 2 ** attempt; // Exponential backoff
          this.logger.debug(
            `Database busy, retrying ${operationName} (attempt ${attempt + 1}/${this.maxRetries}) after ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Non-retryable error, throw immediately
          throw error;
        }
      }
    }

    // All retries exhausted
    this.logger.error(
      `Failed to execute ${operationName} after ${this.maxRetries} attempts`,
      lastError,
    );
    throw lastError;
  }

  /**
   * Initialize database schema
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const conversationsTable = `${this.tablePrefix}_conversations`;
    const messagesTable = `${this.tablePrefix}_messages`;
    const usersTable = `${this.tablePrefix}_users`;
    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;

    // Set PRAGMA settings for better concurrency
    // Execute individually to handle errors gracefully
    const isMemoryDb = this.url === ":memory:" || this.url.includes("mode=memory");

    // Only set WAL mode for file-based databases (not for in-memory)
    if (!isMemoryDb && (this.url.startsWith("file:") || this.url.startsWith("libsql:"))) {
      try {
        await this.client.execute("PRAGMA journal_mode=WAL");
        this.logger.debug("Set PRAGMA journal_mode=WAL");
      } catch (err) {
        this.logger.debug("Failed to set PRAGMA journal_mode=WAL (non-critical)", { err });
      }
    }

    // Set busy timeout (works for both memory and file databases)
    try {
      await this.client.execute("PRAGMA busy_timeout=5000");
      this.logger.debug("Set PRAGMA busy_timeout=5000");
    } catch (err) {
      this.logger.debug("Failed to set PRAGMA busy_timeout (non-critical)", { err });
    }

    // Enable foreign keys (works for both memory and file databases)
    try {
      await this.client.execute("PRAGMA foreign_keys=ON");
      this.logger.debug("Set PRAGMA foreign_keys=ON");
    } catch (err) {
      this.logger.debug("Failed to set PRAGMA foreign_keys (non-critical)", { err });
    }

    this.logger.debug("Applied PRAGMA settings for better concurrency");

    await this.executeWithRetry(async () => {
      await this.client.batch([
        // Create users table (for user-level working memory)
        `CREATE TABLE IF NOT EXISTS ${usersTable} (
        id TEXT PRIMARY KEY,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

        // Create conversations table (matching existing structure)
        `CREATE TABLE IF NOT EXISTS ${conversationsTable} (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

        // Create messages table (matching existing structure)
        `CREATE TABLE IF NOT EXISTS ${messagesTable} (
        conversation_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        parts TEXT NOT NULL,
        metadata TEXT,
        format_version INTEGER DEFAULT 2,
        created_at TEXT NOT NULL,
        PRIMARY KEY (conversation_id, message_id)
      )`,

        // Create workflow states table
        `CREATE TABLE IF NOT EXISTS ${workflowStatesTable} (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        status TEXT NOT NULL,
        suspension TEXT,
        user_id TEXT,
        conversation_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

        // Create indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_user_id ON ${conversationsTable}(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_resource_id ON ${conversationsTable}(resource_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${messagesTable}_conversation_id ON ${messagesTable}(conversation_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${messagesTable}_created_at ON ${messagesTable}(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_workflow_id ON ${workflowStatesTable}(workflow_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_status ON ${workflowStatesTable}(status)`,
      ]);
    }, "initialize database schema");

    // Add V2 columns to existing messages table if needed
    await this.addV2ColumnsToMessagesTable();

    // Migrate default user_id values to actual values from conversations
    await this.migrateDefaultUserIds();

    this.initialized = true;
    this.logger.debug("Database schema initialized");
  }

  /**
   * Add new columns to messages table for V2 format if they don't exist
   * This allows existing tables to support both old and new message formats
   */
  private async addV2ColumnsToMessagesTable(): Promise<void> {
    const messagesTableName = `${this.tablePrefix}_messages`;

    try {
      // Check which columns exist
      const tableInfo = await this.client.execute(`PRAGMA table_info(${messagesTableName})`);
      const columns = tableInfo.rows.map((row) => row.name as string);

      // Step 1: Add new V2 columns if they don't exist
      if (!columns.includes("parts")) {
        try {
          await this.client.execute(`ALTER TABLE ${messagesTableName} ADD COLUMN parts TEXT`);
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!columns.includes("metadata")) {
        try {
          await this.client.execute(`ALTER TABLE ${messagesTableName} ADD COLUMN metadata TEXT`);
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!columns.includes("format_version")) {
        try {
          await this.client.execute(
            `ALTER TABLE ${messagesTableName} ADD COLUMN format_version INTEGER DEFAULT 2`,
          );
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!columns.includes("user_id")) {
        try {
          await this.client.execute(
            `ALTER TABLE ${messagesTableName} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'`,
          );
        } catch (_e) {
          // Column might already exist
        }
      }

      // Step 2: Migrate old columns to nullable versions if they exist
      // Check if content needs migration (check for NOT NULL constraint)
      const contentInfo = tableInfo.rows.find((row) => row.name === "content");
      if (contentInfo && contentInfo.notnull === 1) {
        try {
          // Create nullable temp column
          await this.client.execute(
            `ALTER TABLE ${messagesTableName} ADD COLUMN content_temp TEXT`,
          );

          // Copy data
          await this.client.execute(
            `UPDATE ${messagesTableName} SET content_temp = content WHERE content IS NOT NULL`,
          );

          // Try to drop old column (SQLite 3.35.0+)
          try {
            await this.client.execute(`ALTER TABLE ${messagesTableName} DROP COLUMN content`);

            // If drop succeeded, rename temp to original
            await this.client.execute(
              `ALTER TABLE ${messagesTableName} RENAME COLUMN content_temp TO content`,
            );
          } catch (_) {
            // If DROP not supported, keep both columns
            // Silent fail - not critical
          }
        } catch (_) {
          // Content migration error - not critical
        }
      }

      // Same for type column
      const typeInfo = tableInfo.rows.find((row) => row.name === "type");
      if (typeInfo && typeInfo.notnull === 1) {
        try {
          // Create nullable temp column
          await this.client.execute(`ALTER TABLE ${messagesTableName} ADD COLUMN type_temp TEXT`);

          // Copy data
          await this.client.execute(
            `UPDATE ${messagesTableName} SET type_temp = type WHERE type IS NOT NULL`,
          );

          // Try to drop old column (SQLite 3.35.0+)
          try {
            await this.client.execute(`ALTER TABLE ${messagesTableName} DROP COLUMN type`);

            // If drop succeeded, rename temp to original
            await this.client.execute(
              `ALTER TABLE ${messagesTableName} RENAME COLUMN type_temp TO type`,
            );
          } catch (_) {
            // If DROP not supported, keep both columns
            // Silent fail - not critical
          }
        } catch (_) {
          // Type migration error - not critical
        }
      }
    } catch (_) {
      // Don't throw - this is not critical for new installations
    }
  }

  /**
   * Migrate default user_id values in messages table
   * Updates messages with user_id='default' to use the actual user_id from their conversation
   */
  private async migrateDefaultUserIds(): Promise<void> {
    const messagesTableName = `${this.tablePrefix}_messages`;
    const conversationsTableName = `${this.tablePrefix}_conversations`;

    try {
      // First, check if there are any messages with default user_id
      const checkResult = await this.client.execute({
        sql: `SELECT COUNT(*) as count FROM ${messagesTableName} WHERE user_id = 'default'`,
        args: [],
      });

      const defaultCount = (checkResult.rows[0]?.count as number) || 0;

      if (defaultCount === 0) {
        return;
      }

      this.logger.debug(`Found ${defaultCount} messages with default user_id, starting migration`);

      // Update messages with the actual user_id from their conversation
      // Using a JOIN to get the user_id from the conversations table
      await this.executeWithRetry(async () => {
        const result = await this.client.execute({
          sql: `UPDATE ${messagesTableName}
                SET user_id = (
                  SELECT c.user_id 
                  FROM ${conversationsTableName} c 
                  WHERE c.id = ${messagesTableName}.conversation_id
                )
                WHERE user_id = 'default'
                AND EXISTS (
                  SELECT 1 
                  FROM ${conversationsTableName} c 
                  WHERE c.id = ${messagesTableName}.conversation_id
                )`,
          args: [],
        });

        const updatedCount = result.rowsAffected || 0;
        this.logger.info(
          `Successfully migrated ${updatedCount} messages from default user_id to actual user_ids`,
        );

        // Check if there are any remaining messages with default user_id (orphaned messages)
        const remainingResult = await this.client.execute({
          sql: `SELECT COUNT(*) as count FROM ${messagesTableName} WHERE user_id = 'default'`,
          args: [],
        });

        const remainingCount = (remainingResult.rows[0]?.count as number) || 0;

        if (remainingCount > 0) {
          this.logger.warn(
            `${remainingCount} messages still have default user_id (possibly orphaned messages without valid conversations)`,
          );
        }
      }, "migrate default user_ids");
    } catch (error) {
      // Log the error but don't throw - this migration is not critical
      this.logger.error("Failed to migrate default user_ids", error as Error);
    }
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Add a single message
   */
  async addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;

    // Ensure conversation exists
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Insert message
    await this.executeWithRetry(async () => {
      await this.client.execute({
        sql: `INSERT INTO ${messagesTable} (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          conversationId,
          message.id,
          userId,
          message.role,
          safeStringify(message.parts),
          message.metadata ? safeStringify(message.metadata) : null,
          2, // format_version
          new Date().toISOString(),
        ],
      });
    }, "add message");
  }

  /**
   * Add multiple messages
   */
  async addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;

    // Ensure conversation exists
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const now = new Date().toISOString();

    // Use transaction for batch insert
    await this.executeWithRetry(async () => {
      await this.client.batch(
        messages.map((message) => ({
          sql: `INSERT INTO ${messagesTable} (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            conversationId,
            message.id,
            userId,
            message.role,
            safeStringify(message.parts),
            message.metadata ? safeStringify(message.metadata) : null,
            2, // format_version
            now,
          ],
        })),
      );
    }, "add batch messages");
  }

  /**
   * Get messages with optional filtering
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
  ): Promise<UIMessage[]> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;
    const { limit, before, after, roles } = options || {};

    // Build query with filters - use SELECT * to handle both old and new schemas safely
    let sql = `SELECT * FROM ${messagesTable}
               WHERE conversation_id = ? AND user_id = ?`;
    const args: any[] = [conversationId, userId];

    // Add role filter
    if (roles && roles.length > 0) {
      const placeholders = roles.map(() => "?").join(",");
      sql += ` AND role IN (${placeholders})`;
      args.push(...roles);
    }

    // Add time filters
    if (before) {
      sql += " AND created_at < ?";
      args.push(before.toISOString());
    }

    if (after) {
      sql += " AND created_at > ?";
      args.push(after.toISOString());
    }

    // Order by creation time and apply limit
    sql += " ORDER BY created_at ASC";
    if (limit && limit > 0) {
      sql += " LIMIT ?";
      args.push(limit);
    }

    const result = await this.client.execute({ sql, args });

    // Convert rows to UIMessages with on-the-fly migration for old format
    return result.rows.map((row) => {
      // Determine parts based on whether we have new format (parts) or old format (content)
      let parts: any;

      // Check for new format first (parts column exists and has value)
      if (row.parts !== undefined && row.parts !== null) {
        // New format - parse parts directly
        try {
          parts = JSON.parse(row.parts as string);
        } catch {
          parts = [];
        }
      }
      // Check for old format (content column exists and has value)
      else if (row.content !== undefined && row.content !== null) {
        // Old format - convert content to parts
        try {
          const content = JSON.parse(row.content as string);

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
        } catch {
          // If parsing fails, treat as plain text
          parts = [{ type: "text", text: row.content as string }];
        }
      } else {
        // No content at all - empty parts
        parts = [];
      }

      return {
        id: row.message_id as string,
        role: row.role as "system" | "user" | "assistant",
        parts,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      };
    });
  }

  /**
   * Clear messages for a user
   */
  async clearMessages(userId: string, conversationId?: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;
    const conversationsTable = `${this.tablePrefix}_conversations`;

    if (conversationId) {
      // Clear messages for specific conversation
      await this.client.execute({
        sql: `DELETE FROM ${messagesTable} WHERE conversation_id = ? AND user_id = ?`,
        args: [conversationId, userId],
      });
    } else {
      // Clear all messages for the user
      await this.client.execute({
        sql: `DELETE FROM ${messagesTable}
              WHERE conversation_id IN (
                SELECT id FROM ${conversationsTable} WHERE user_id = ?
              )`,
        args: [userId],
      });
    }
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;

    // Check if conversation already exists
    const existing = await this.getConversation(input.id);
    if (existing) {
      throw new ConversationAlreadyExistsError(input.id);
    }

    const now = new Date().toISOString();

    await this.executeWithRetry(async () => {
      await this.client.execute({
        sql: `INSERT INTO ${conversationsTable} (id, resource_id, user_id, title, metadata, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          input.id,
          input.resourceId,
          input.userId,
          input.title,
          safeStringify(input.metadata || {}),
          now,
          now,
        ],
      });
    }, "create conversation");

    return {
      id: input.id,
      userId: input.userId,
      resourceId: input.resourceId,
      title: input.title,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;

    const result = await this.client.execute({
      sql: `SELECT * FROM ${conversationsTable} WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      userId: row.user_id as string,
      resourceId: row.resource_id as string,
      title: row.title as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Get conversations by resource ID
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;

    const result = await this.client.execute({
      sql: `SELECT * FROM ${conversationsTable} WHERE resource_id = ? ORDER BY updated_at DESC`,
      args: [resourceId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      resourceId: row.resource_id as string,
      title: row.title as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
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
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;
    let sql = `SELECT * FROM ${conversationsTable} WHERE 1=1`;
    const args: any[] = [];

    // Add filters
    if (options.userId) {
      sql += " AND user_id = ?";
      args.push(options.userId);
    }

    if (options.resourceId) {
      sql += " AND resource_id = ?";
      args.push(options.resourceId);
    }

    // Add ordering
    const orderBy = options.orderBy || "updated_at";
    const orderDirection = options.orderDirection || "DESC";
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    // Add pagination
    if (options.limit) {
      sql += " LIMIT ?";
      args.push(options.limit);
    }

    if (options.offset) {
      sql += " OFFSET ?";
      args.push(options.offset);
    }

    const result = await this.client.execute({ sql, args });

    return result.rows.map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      resourceId: row.resource_id as string,
      title: row.title as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;
    const conversation = await this.getConversation(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }

    const now = new Date().toISOString();
    const fieldsToUpdate: string[] = ["updated_at = ?"];
    const args: any[] = [now];

    if (updates.title !== undefined) {
      fieldsToUpdate.push("title = ?");
      args.push(updates.title);
    }

    if (updates.resourceId !== undefined) {
      fieldsToUpdate.push("resource_id = ?");
      args.push(updates.resourceId);
    }

    if (updates.metadata !== undefined) {
      fieldsToUpdate.push("metadata = ?");
      args.push(safeStringify(updates.metadata));
    }

    args.push(id); // WHERE clause

    await this.client.execute({
      sql: `UPDATE ${conversationsTable} SET ${fieldsToUpdate.join(", ")} WHERE id = ?`,
      args,
    });

    const updated = await this.getConversation(id);
    if (!updated) {
      throw new Error(`Conversation not found after update: ${id}`);
    }
    return updated;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;

    await this.client.execute({
      sql: `DELETE FROM ${conversationsTable} WHERE id = ?`,
      args: [id],
    });
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
    await this.initialize();

    if (params.scope === "conversation" && params.conversationId) {
      const conversation = await this.getConversation(params.conversationId);
      return (conversation?.metadata?.workingMemory as string) || null;
    }

    if (params.scope === "user" && params.userId) {
      const usersTable = `${this.tablePrefix}_users`;
      const result = await this.client.execute({
        sql: `SELECT metadata FROM ${usersTable} WHERE id = ?`,
        args: [params.userId],
      });

      if (result.rows.length > 0) {
        const metadata = result.rows[0].metadata
          ? JSON.parse(result.rows[0].metadata as string)
          : {};
        return metadata.workingMemory || null;
      }
    }

    return null;
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
    await this.initialize();

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
      const result = await this.client.execute({
        sql: `SELECT metadata FROM ${usersTable} WHERE id = ?`,
        args: [params.userId],
      });

      if (result.rows.length > 0) {
        // User exists, update metadata
        const metadata = result.rows[0].metadata
          ? JSON.parse(result.rows[0].metadata as string)
          : {};
        metadata.workingMemory = params.content;

        await this.client.execute({
          sql: `UPDATE ${usersTable} SET metadata = ?, updated_at = ? WHERE id = ?`,
          args: [safeStringify(metadata), now, params.userId],
        });
      } else {
        // User doesn't exist, create new record
        await this.client.execute({
          sql: `INSERT INTO ${usersTable} (id, metadata, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: [params.userId, safeStringify({ workingMemory: params.content }), now, now],
        });
      }
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
    await this.initialize();

    if (params.scope === "conversation" && params.conversationId) {
      const conversation = await this.getConversation(params.conversationId);
      if (conversation?.metadata?.workingMemory) {
        const metadata = { ...conversation.metadata };
        // biome-ignore lint/performance/noDelete: <explanation>
        delete metadata.workingMemory;
        await this.updateConversation(params.conversationId, { metadata });
      }
    }

    if (params.scope === "user" && params.userId) {
      const usersTable = `${this.tablePrefix}_users`;
      const result = await this.client.execute({
        sql: `SELECT metadata FROM ${usersTable} WHERE id = ?`,
        args: [params.userId],
      });

      if (result.rows.length > 0 && result.rows[0].metadata) {
        const metadata = JSON.parse(result.rows[0].metadata as string);
        if (metadata.workingMemory) {
          // biome-ignore lint/performance/noDelete: <explanation>
          delete metadata.workingMemory;
          await this.client.execute({
            sql: `UPDATE ${usersTable} SET metadata = ?, updated_at = ? WHERE id = ?`,
            args: [safeStringify(metadata), new Date().toISOString(), params.userId],
          });
        }
      }
    }
  }

  // ============================================================================
  // Workflow State Operations
  // ============================================================================

  /**
   * Get workflow state by execution ID
   */
  async getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null> {
    await this.initialize();

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
    const result = await this.client.execute({
      sql: `SELECT * FROM ${workflowStatesTable} WHERE id = ?`,
      args: [executionId],
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      workflowName: row.workflow_name as string,
      status: row.status as "running" | "suspended" | "completed" | "error",
      suspension: row.suspension ? JSON.parse(row.suspension as string) : undefined,
      userId: row.user_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Set workflow state
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    await this.initialize();

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
    await this.client.execute({
      sql: `INSERT OR REPLACE INTO ${workflowStatesTable} 
            (id, workflow_id, workflow_name, status, suspension, user_id, conversation_id, metadata, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        executionId,
        state.workflowId,
        state.workflowName,
        state.status,
        state.suspension ? safeStringify(state.suspension) : null,
        state.userId || null,
        state.conversationId || null,
        state.metadata ? safeStringify(state.metadata) : null,
        state.createdAt.toISOString(),
        state.updatedAt.toISOString(),
      ],
    });
  }

  /**
   * Update workflow state
   */
  async updateWorkflowState(
    executionId: string,
    updates: Partial<WorkflowStateEntry>,
  ): Promise<void> {
    await this.initialize();

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
    await this.initialize();

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
    const result = await this.client.execute({
      sql: `SELECT * FROM ${workflowStatesTable} WHERE workflow_id = ? AND status = 'suspended' ORDER BY created_at DESC`,
      args: [workflowId],
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      workflowId: row.workflow_id as string,
      workflowName: row.workflow_name as string,
      status: "suspended" as const,
      suspension: row.suspension ? JSON.parse(row.suspension as string) : undefined,
      userId: row.user_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    // LibSQL client doesn't have explicit close method
    // Connection is managed automatically
    this.logger.debug("Closing LibSQL Memory adapter");
  }
}
