/**
 * LibSQL Memory Adapter Core
 * Contains shared logic for both Node.js and Edge environments
 * Environment-specific adapters extend this class
 */

import type { Client } from "@libsql/client";
import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type {
  Conversation,
  ConversationQueryOptions,
  ConversationStepRecord,
  CreateConversationInput,
  GetConversationStepsOptions,
  GetMessagesOptions,
  StorageAdapter,
  WorkflowRunQuery,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { Logger } from "@voltagent/logger";
import type { UIMessage } from "ai";

/**
 * Core configuration options for LibSQL Memory adapter
 */
export interface LibSQLMemoryCoreOptions {
  /**
   * Prefix for table names
   * @default "voltagent_memory"
   */
  tablePrefix?: string;

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
 * LibSQL Memory Adapter Core
 * Implements all storage operations, receives client via dependency injection
 */
export class LibSQLMemoryCore implements StorageAdapter {
  protected client: Client;
  protected tablePrefix: string;
  protected initialized = false;
  protected logger: Logger;
  protected maxRetries: number;
  protected retryDelayMs: number;
  protected url: string;

  constructor(client: Client, url: string, options: LibSQLMemoryCoreOptions, logger: Logger) {
    this.client = client;
    this.url = url;
    this.tablePrefix = options.tablePrefix ?? "voltagent_memory";
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 100;
    this.logger = logger;

    this.logger.debug("LibSQL Memory adapter core initialized", { url: this.url });
  }

  /**
   * Execute a database operation with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        if (
          error?.code === "SQLITE_BUSY" ||
          error?.message?.includes("SQLITE_BUSY") ||
          error?.message?.includes("database is locked")
        ) {
          const delay = this.retryDelayMs * 2 ** attempt;
          this.logger.debug(
            `Database busy, retrying ${operationName} (attempt ${attempt + 1}/${this.maxRetries}) after ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    this.logger.error(
      `Failed to execute ${operationName} after ${this.maxRetries} attempts`,
      lastError,
    );
    throw lastError;
  }

  /**
   * Initialize database schema
   */
  protected async initialize(): Promise<void> {
    if (this.initialized) return;

    const conversationsTable = `${this.tablePrefix}_conversations`;
    const messagesTable = `${this.tablePrefix}_messages`;
    const usersTable = `${this.tablePrefix}_users`;
    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
    const stepsTable = `${this.tablePrefix}_steps`;

    const isMemoryDb = this.url === ":memory:" || this.url.includes("mode=memory");

    if (!isMemoryDb && (this.url.startsWith("file:") || this.url.startsWith("libsql:"))) {
      try {
        await this.client.execute("PRAGMA journal_mode=WAL");
        this.logger.debug("Set PRAGMA journal_mode=WAL");
      } catch (err) {
        this.logger.debug("Failed to set PRAGMA journal_mode=WAL (non-critical)", { err });
      }
    }

    try {
      await this.client.execute("PRAGMA busy_timeout=5000");
      this.logger.debug("Set PRAGMA busy_timeout=5000");
    } catch (err) {
      this.logger.debug("Failed to set PRAGMA busy_timeout (non-critical)", { err });
    }

    try {
      await this.client.execute("PRAGMA foreign_keys=ON");
      this.logger.debug("Set PRAGMA foreign_keys=ON");
    } catch (err) {
      this.logger.debug("Failed to set PRAGMA foreign_keys (non-critical)", { err });
    }

    this.logger.debug("Applied PRAGMA settings for better concurrency");

    await this.executeWithRetry(async () => {
      await this.client.batch([
        `CREATE TABLE IF NOT EXISTS ${usersTable} (
        id TEXT PRIMARY KEY,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

        `CREATE TABLE IF NOT EXISTS ${conversationsTable} (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

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

        `CREATE TABLE IF NOT EXISTS ${workflowStatesTable} (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        status TEXT NOT NULL,
        suspension TEXT,
        events TEXT,
        output TEXT,
        cancellation TEXT,
        user_id TEXT,
        conversation_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

        `CREATE TABLE IF NOT EXISTS ${stepsTable} (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        agent_name TEXT,
        operation_id TEXT,
        step_index INTEGER NOT NULL,
        type TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT,
        arguments TEXT,
        result TEXT,
        usage TEXT,
        sub_agent_id TEXT,
        sub_agent_name TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES ${conversationsTable}(id) ON DELETE CASCADE
      )`,

        `CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_user_id ON ${conversationsTable}(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_resource_id ON ${conversationsTable}(resource_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${messagesTable}_conversation_id ON ${messagesTable}(conversation_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${messagesTable}_created_at ON ${messagesTable}(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_workflow_id ON ${workflowStatesTable}(workflow_id)`,
        `CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_status ON ${workflowStatesTable}(status)`,
        `CREATE INDEX IF NOT EXISTS idx_${stepsTable}_conversation ON ${stepsTable}(conversation_id, step_index)`,
        `CREATE INDEX IF NOT EXISTS idx_${stepsTable}_operation ON ${stepsTable}(conversation_id, operation_id)`,
      ]);
    }, "initialize database schema");

    await this.addV2ColumnsToMessagesTable();
    await this.migrateDefaultUserIds();
    await this.addWorkflowStateColumns();

    this.initialized = true;
    this.logger.debug("Database schema initialized");
  }

  private async addV2ColumnsToMessagesTable(): Promise<void> {
    const messagesTableName = `${this.tablePrefix}_messages`;

    try {
      const tableInfo = await this.client.execute(`PRAGMA table_info(${messagesTableName})`);
      const columns = tableInfo.rows.map((row) => row.name as string);

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

      const contentInfo = tableInfo.rows.find((row) => row.name === "content");
      if (contentInfo && contentInfo.notnull === 1) {
        try {
          await this.client.execute(
            `ALTER TABLE ${messagesTableName} ADD COLUMN content_temp TEXT`,
          );
          await this.client.execute(
            `UPDATE ${messagesTableName} SET content_temp = content WHERE content IS NOT NULL`,
          );
          try {
            await this.client.execute(`ALTER TABLE ${messagesTableName} DROP COLUMN content`);
            await this.client.execute(
              `ALTER TABLE ${messagesTableName} RENAME COLUMN content_temp TO content`,
            );
          } catch (_) {
            // If DROP not supported, keep both columns
          }
        } catch (_) {
          // Content migration error - not critical
        }
      }

      const typeInfo = tableInfo.rows.find((row) => row.name === "type");
      if (typeInfo && typeInfo.notnull === 1) {
        try {
          await this.client.execute(`ALTER TABLE ${messagesTableName} ADD COLUMN type_temp TEXT`);
          await this.client.execute(
            `UPDATE ${messagesTableName} SET type_temp = type WHERE type IS NOT NULL`,
          );
          try {
            await this.client.execute(`ALTER TABLE ${messagesTableName} DROP COLUMN type`);
            await this.client.execute(
              `ALTER TABLE ${messagesTableName} RENAME COLUMN type_temp TO type`,
            );
          } catch (_) {
            // If DROP not supported, keep both columns
          }
        } catch (_) {
          // Type migration error - not critical
        }
      }
    } catch (_) {
      // Don't throw - this is not critical for new installations
    }
  }

  private async migrateDefaultUserIds(): Promise<void> {
    const messagesTableName = `${this.tablePrefix}_messages`;
    const conversationsTableName = `${this.tablePrefix}_conversations`;

    try {
      const checkResult = await this.client.execute({
        sql: `SELECT COUNT(*) as count FROM ${messagesTableName} WHERE user_id = 'default'`,
        args: [],
      });

      const defaultCount = (checkResult.rows[0]?.count as number) || 0;

      if (defaultCount === 0) {
        return;
      }

      this.logger.debug(`Found ${defaultCount} messages with default user_id, starting migration`);

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
      this.logger.error("Failed to migrate default user_ids", error as Error);
    }
  }

  private async addWorkflowStateColumns(): Promise<void> {
    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;

    try {
      const tableInfo = await this.client.execute(`PRAGMA table_info(${workflowStatesTable})`);
      const columns = tableInfo.rows.map((row) => row.name as string);

      if (!columns.includes("events")) {
        try {
          await this.client.execute(`ALTER TABLE ${workflowStatesTable} ADD COLUMN events TEXT`);
          this.logger.debug("Added 'events' column to workflow_states table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!columns.includes("output")) {
        try {
          await this.client.execute(`ALTER TABLE ${workflowStatesTable} ADD COLUMN output TEXT`);
          this.logger.debug("Added 'output' column to workflow_states table");
        } catch (_e) {
          // Column might already exist
        }
      }

      if (!columns.includes("cancellation")) {
        try {
          await this.client.execute(
            `ALTER TABLE ${workflowStatesTable} ADD COLUMN cancellation TEXT`,
          );
          this.logger.debug("Added 'cancellation' column to workflow_states table");
        } catch (_e) {
          // Column might already exist
        }
      }
    } catch (error) {
      this.logger.warn("Failed to add workflow state columns (non-critical)", error as Error);
    }
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    await this.executeWithRetry(async () => {
      await this.client.execute({
        sql: `INSERT INTO ${messagesTable} (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(conversation_id, message_id) DO UPDATE SET
              user_id = excluded.user_id,
              role = excluded.role,
              parts = excluded.parts,
              metadata = excluded.metadata,
              format_version = excluded.format_version`,
        args: [
          conversationId,
          message.id,
          userId,
          message.role,
          safeStringify(message.parts),
          message.metadata ? safeStringify(message.metadata) : null,
          2,
          new Date().toISOString(),
        ],
      });
    }, "add message");
  }

  async addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const now = new Date().toISOString();

    await this.executeWithRetry(async () => {
      await this.client.batch(
        messages.map((message) => ({
          sql: `INSERT INTO ${messagesTable} (conversation_id, message_id, user_id, role, parts, metadata, format_version, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(conversation_id, message_id) DO UPDATE SET
                user_id = excluded.user_id,
                role = excluded.role,
                parts = excluded.parts,
                metadata = excluded.metadata,
                format_version = excluded.format_version`,
          args: [
            conversationId,
            message.id,
            userId,
            message.role,
            safeStringify(message.parts),
            message.metadata ? safeStringify(message.metadata) : null,
            2,
            now,
          ],
        })),
      );
    }, "add batch messages");
  }

  async saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    if (steps.length === 0) return;

    await this.initialize();
    const stepsTable = `${this.tablePrefix}_steps`;

    await this.executeWithRetry(async () => {
      await this.client.batch(
        steps.map((step) => {
          const createdAt = step.createdAt ?? new Date().toISOString();
          return {
            sql: `INSERT INTO ${stepsTable} (
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              conversation_id = excluded.conversation_id,
              user_id = excluded.user_id,
              agent_id = excluded.agent_id,
              agent_name = excluded.agent_name,
              operation_id = excluded.operation_id,
              step_index = excluded.step_index,
              type = excluded.type,
              role = excluded.role,
              content = excluded.content,
              arguments = excluded.arguments,
              result = excluded.result,
              usage = excluded.usage,
              sub_agent_id = excluded.sub_agent_id,
              sub_agent_name = excluded.sub_agent_name,
              created_at = excluded.created_at`,
            args: [
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
              createdAt,
            ],
          };
        }),
      );
    }, "save conversation steps");
  }

  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
  ): Promise<UIMessage<{ createdAt: Date }>[]> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;
    const { limit, before, after, roles } = options || {};

    let sql = `
      SELECT * FROM (
        SELECT *
        FROM ${messagesTable}
        WHERE conversation_id = ? AND user_id = ?
    `;
    const args: any[] = [conversationId, userId];

    if (roles && roles.length > 0) {
      const placeholders = roles.map(() => "?").join(",");
      sql += ` AND role IN (${placeholders})`;
      args.push(...roles);
    }

    if (before) {
      sql += " AND created_at < ?";
      args.push(before.toISOString());
    }

    if (after) {
      sql += " AND created_at > ?";
      args.push(after.toISOString());
    }

    sql += " ORDER BY created_at DESC";
    if (limit && limit > 0) {
      sql += " LIMIT ?";
      args.push(limit);
    }

    sql += " ) AS subq ORDER BY created_at ASC";

    const result = await this.client.execute({ sql, args });

    return result.rows.map((row) => {
      let parts: any;

      if (row.parts !== undefined && row.parts !== null) {
        try {
          parts = JSON.parse(row.parts as string);
        } catch {
          parts = [];
        }
      } else if (row.content !== undefined && row.content !== null) {
        try {
          const content = JSON.parse(row.content as string);

          if (typeof content === "string") {
            parts = [{ type: "text", text: content }];
          } else if (Array.isArray(content)) {
            parts = content;
          } else {
            parts = [];
          }
        } catch {
          parts = [{ type: "text", text: row.content as string }];
        }
      } else {
        parts = [];
      }

      const metadata = row.metadata ? JSON.parse(row.metadata as string) : {};
      return {
        id: row.message_id as string,
        role: row.role as "system" | "user" | "assistant",
        parts,
        metadata: {
          ...metadata,
          createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
        },
      };
    });
  }

  async getConversationSteps(
    userId: string,
    conversationId: string,
    options?: GetConversationStepsOptions,
  ): Promise<ConversationStepRecord[]> {
    await this.initialize();

    const stepsTable = `${this.tablePrefix}_steps`;
    const limit = options?.limit && options.limit > 0 ? options.limit : undefined;

    let sql = `SELECT * FROM ${stepsTable} WHERE conversation_id = ? AND user_id = ?`;
    const args: any[] = [conversationId, userId];

    if (options?.operationId) {
      sql += " AND operation_id = ?";
      args.push(options.operationId);
    }

    sql += " ORDER BY step_index ASC";
    if (limit !== undefined) {
      sql += " LIMIT ?";
      args.push(limit);
    }

    const result = await this.client.execute({ sql, args });

    const parseJsonField = (value: unknown) => {
      if (typeof value !== "string" || value.length === 0) {
        return undefined;
      }
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    };

    return result.rows.map((row) => ({
      id: row.id as string,
      conversationId: row.conversation_id as string,
      userId: row.user_id as string,
      agentId: row.agent_id as string,
      agentName: (row.agent_name as string) ?? undefined,
      operationId: (row.operation_id as string) ?? undefined,
      stepIndex:
        typeof row.step_index === "number"
          ? (row.step_index as number)
          : Number(row.step_index ?? 0),
      type: row.type as ConversationStepRecord["type"],
      role: row.role as ConversationStepRecord["role"],
      content: (row.content as string) ?? undefined,
      arguments: parseJsonField(row.arguments),
      result: parseJsonField(row.result),
      usage: parseJsonField(row.usage),
      subAgentId: (row.sub_agent_id as string) ?? undefined,
      subAgentName: (row.sub_agent_name as string) ?? undefined,
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
    }));
  }

  async clearMessages(userId: string, conversationId?: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.tablePrefix}_messages`;
    const conversationsTable = `${this.tablePrefix}_conversations`;
    const stepsTable = `${this.tablePrefix}_steps`;

    if (conversationId) {
      await this.client.execute({
        sql: `DELETE FROM ${messagesTable} WHERE conversation_id = ? AND user_id = ?`,
        args: [conversationId, userId],
      });
      await this.client.execute({
        sql: `DELETE FROM ${stepsTable} WHERE conversation_id = ? AND user_id = ?`,
        args: [conversationId, userId],
      });
    } else {
      await this.client.execute({
        sql: `DELETE FROM ${messagesTable}
              WHERE conversation_id IN (
                SELECT id FROM ${conversationsTable} WHERE user_id = ?
              )`,
        args: [userId],
      });
      await this.client.execute({
        sql: `DELETE FROM ${stepsTable}
              WHERE conversation_id IN (
                SELECT id FROM ${conversationsTable} WHERE user_id = ?
              )`,
        args: [userId],
      });
    }
  }

  async deleteMessages(
    messageIds: string[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.initialize();

    if (messageIds.length === 0) {
      return;
    }

    const messagesTable = `${this.tablePrefix}_messages`;
    const placeholders = messageIds.map(() => "?").join(",");
    const sql = `DELETE FROM ${messagesTable} WHERE conversation_id = ? AND user_id = ? AND message_id IN (${placeholders})`;
    await this.client.execute({
      sql,
      args: [conversationId, userId, ...messageIds],
    });
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;

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

  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">,
  ): Promise<Conversation[]> {
    return this.queryConversations({ ...options, userId });
  }

  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;
    let sql = `SELECT * FROM ${conversationsTable} WHERE 1=1`;
    const args: any[] = [];

    if (options.userId) {
      sql += " AND user_id = ?";
      args.push(options.userId);
    }

    if (options.resourceId) {
      sql += " AND resource_id = ?";
      args.push(options.resourceId);
    }

    const orderBy = options.orderBy || "updated_at";
    const orderDirection = options.orderDirection || "DESC";
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

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

  async countConversations(options: ConversationQueryOptions): Promise<number> {
    await this.initialize();

    const conversationsTable = `${this.tablePrefix}_conversations`;
    let sql = `SELECT COUNT(*) as count FROM ${conversationsTable} WHERE 1=1`;
    const args: any[] = [];

    if (options.userId) {
      sql += " AND user_id = ?";
      args.push(options.userId);
    }

    if (options.resourceId) {
      sql += " AND resource_id = ?";
      args.push(options.resourceId);
    }

    const result = await this.client.execute({ sql, args });
    const count = Number(result.rows[0]?.count ?? 0);
    return Number.isNaN(count) ? 0 : count;
  }

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

    args.push(id);

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

      const result = await this.client.execute({
        sql: `SELECT metadata FROM ${usersTable} WHERE id = ?`,
        args: [params.userId],
      });

      if (result.rows.length > 0) {
        const metadata = result.rows[0].metadata
          ? JSON.parse(result.rows[0].metadata as string)
          : {};
        metadata.workingMemory = params.content;

        await this.client.execute({
          sql: `UPDATE ${usersTable} SET metadata = ?, updated_at = ? WHERE id = ?`,
          args: [safeStringify(metadata), now, params.userId],
        });
      } else {
        await this.client.execute({
          sql: `INSERT INTO ${usersTable} (id, metadata, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          args: [params.userId, safeStringify({ workingMemory: params.content }), now, now],
        });
      }
    }
  }

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
      events: row.events ? JSON.parse(row.events as string) : undefined,
      output: row.output ? JSON.parse(row.output as string) : undefined,
      cancellation: row.cancellation ? JSON.parse(row.cancellation as string) : undefined,
      userId: row.user_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  async queryWorkflowRuns(query: WorkflowRunQuery): Promise<WorkflowStateEntry[]> {
    await this.initialize();

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
    const conditions: string[] = [];
    const args: any[] = [];

    if (query.workflowId) {
      conditions.push("workflow_id = ?");
      args.push(query.workflowId);
    }

    if (query.status) {
      conditions.push("status = ?");
      args.push(query.status);
    }

    if (query.from) {
      conditions.push("created_at >= ?");
      args.push(query.from.toISOString());
    }

    if (query.to) {
      conditions.push("created_at <= ?");
      args.push(query.to.toISOString());
    }

    if (query.userId) {
      conditions.push("user_id = ?");
      args.push(query.userId);
    }

    if (query.metadata && Object.keys(query.metadata).length > 0) {
      for (const [key, value] of Object.entries(query.metadata)) {
        const escapedKey = key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const metadataPath = `$."${escapedKey}"`;
        if (value === null) {
          // Explicitly require key presence with null value
          conditions.push("json_type(metadata, ?) = 'null'");
          args.push(metadataPath);
          continue;
        }

        conditions.push("json_extract(metadata, ?) = json(?)");
        args.push(metadataPath, safeStringify(value));
      }
    }

    let sql = `SELECT * FROM ${workflowStatesTable}`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY created_at DESC";

    if (query.limit !== undefined) {
      sql += " LIMIT ?";
      args.push(query.limit);
    }

    if (query.offset !== undefined) {
      sql += " OFFSET ?";
      args.push(query.offset);
    }

    const result = await this.client.execute({
      sql,
      args,
    });

    return result.rows.map((row) => ({
      id: row.id as string,
      workflowId: row.workflow_id as string,
      workflowName: row.workflow_name as string,
      status: row.status as WorkflowStateEntry["status"],
      suspension: row.suspension ? JSON.parse(row.suspension as string) : undefined,
      events: row.events ? JSON.parse(row.events as string) : undefined,
      output: row.output ? JSON.parse(row.output as string) : undefined,
      cancellation: row.cancellation ? JSON.parse(row.cancellation as string) : undefined,
      userId: row.user_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    await this.initialize();

    const workflowStatesTable = `${this.tablePrefix}_workflow_states`;
    await this.client.execute({
      sql: `INSERT OR REPLACE INTO ${workflowStatesTable}
            (id, workflow_id, workflow_name, status, suspension, events, output, cancellation, user_id, conversation_id, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
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
        state.createdAt.toISOString(),
        state.updatedAt.toISOString(),
      ],
    });
  }

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
      events: row.events ? JSON.parse(row.events as string) : undefined,
      output: row.output ? JSON.parse(row.output as string) : undefined,
      cancellation: row.cancellation ? JSON.parse(row.cancellation as string) : undefined,
      userId: row.user_id as string | undefined,
      conversationId: row.conversation_id as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async close(): Promise<void> {
    this.logger.debug("Closing LibSQL Memory adapter");
  }
}
