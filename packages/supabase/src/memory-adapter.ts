/**
 * Supabase Storage Adapter for Memory
 * Stores conversations and messages in Supabase database
 * Compatible with Supabase's PostgreSQL structure
 */

import { type SupabaseClient, createClient } from "@supabase/supabase-js";
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
import { type Logger, createPinoLogger } from "@voltagent/logger";
import type { UIMessage } from "ai";
import { P, match } from "ts-pattern";

/**
 * Supabase configuration options for Memory
 */
export type SupabaseMemoryOptions =
  | SupabaseMemoryOptionsWithUrlAndKey
  | SupabaseMemoryOptionsWithClient;

interface BaseSupabaseMemoryOptions {
  /**
   * The base table name for the memory, use to customize the prefix appended to all the tables
   *
   * @example
   *  'my_app_memory' => 'my_app_memory_conversations', 'my_app_memory_messages', 'my_app_memory_steps', 'my_app_memory_events'
   *
   * @default "voltagent_memory"
   */
  tableName?: string;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * The logger to use for the SupabaseMemoryAdapter
   */
  logger?: Logger;
}

interface SupabaseMemoryOptionsWithUrlAndKey extends BaseSupabaseMemoryOptions {
  /**
   * not used when using supabaseUrl and supabaseKey
   */
  client?: never;
  /**
   * The URL of the Supabase instance
   */
  supabaseUrl: string;
  /**
   * The API key for the Supabase instance
   */
  supabaseKey: string;
}

interface SupabaseMemoryOptionsWithClient extends BaseSupabaseMemoryOptions {
  /**
   * A instantiated Supabase client
   */
  client: SupabaseClient;
  /**
   * not used when using client
   */
  supabaseUrl?: never;
  /**
   * not used when using client
   */
  supabaseKey?: never;
}

/**
 * Supabase Storage Adapter for Memory
 * Production-ready storage for conversations and messages
 * Compatible with Supabase's PostgreSQL structure
 */
export class SupabaseMemoryAdapter implements StorageAdapter {
  private client: SupabaseClient;
  private baseTableName: string;
  private initialized = false;
  private debug: boolean;
  private logger: Logger;

  constructor(options: SupabaseMemoryOptions) {
    if (!options.client && (!options.supabaseUrl || !options.supabaseKey)) {
      throw new Error("Either provide a 'client' or both 'supabaseUrl' and 'supabaseKey'");
    }

    if (options.client && (options.supabaseUrl || options.supabaseKey)) {
      throw new Error(
        "Cannot provide both 'client' and 'supabaseUrl/supabaseKey'. Choose one approach.",
      );
    }

    this.client = match(options)
      .returnType<SupabaseClient>()
      .with({ client: P.not(P.nullish) }, (o) => o.client as SupabaseClient)
      .with({ supabaseUrl: P.string, supabaseKey: P.string }, (options) =>
        createClient(options.supabaseUrl, options.supabaseKey),
      )
      .otherwise(() => {
        throw new Error("Invalid configuration");
      });

    this.baseTableName = options.tableName ?? "voltagent_memory";
    this.debug = options.debug ?? false;

    // Initialize the logger
    this.logger = match(options.logger)
      .with(P.nullish, () => createPinoLogger({ name: "supabase-memory-v2" }))
      .otherwise((logger) => logger);

    this.log("Supabase Memory V2 adapter initialized");

    // Initialize tables
    this.initialize().catch((error) => {
      this.logger.error("Failed to initialize Supabase Memory V2:", error);
    });
  }

  /**
   * Log debug messages
   */
  private log(message: string, ...args: any[]): void {
    if (this.debug) {
      this.logger.debug(message, ...args);
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
   * Check if this is a fresh installation (no tables exist)
   */
  private async checkFreshInstallation(): Promise<boolean> {
    try {
      // Check if basic tables exist by trying to select from them
      const { error: conversationsError } = await this.client
        .from(`${this.baseTableName}_conversations`)
        .select("id")
        .limit(1);

      const { error: messagesError } = await this.client
        .from(`${this.baseTableName}_messages`)
        .select("message_id")
        .limit(1);

      // If both tables are missing, it's a fresh installation
      return !!conversationsError && !!messagesError;
    } catch {
      return true;
    }
  }

  /**
   * Check if migration to V2 is needed (new columns are missing)
   */
  private async checkMigrationNeeded(): Promise<boolean> {
    try {
      // Try to select new V2 columns from messages table
      const { error: messagesError } = await this.client
        .from(`${this.baseTableName}_messages`)
        .select("parts, format_version")
        .limit(1);

      // Try to select new V2 columns from conversations table
      const { error: conversationsError } = await this.client
        .from(`${this.baseTableName}_conversations`)
        .select("user_id, resource_id")
        .limit(1);

      // Try to select workflow state event columns (for events persistence feature)
      const { error: workflowEventsError } = await this.client
        .from(`${this.baseTableName}_workflow_states`)
        .select("events, output, cancellation")
        .limit(1);

      // If any query fails, migration is needed
      return !!messagesError || !!conversationsError || !!workflowEventsError;
    } catch {
      return true;
    }
  }

  /**
   * Initialize database schema
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const conversationsTable = `${this.baseTableName}_conversations`;
    const messagesTable = `${this.baseTableName}_messages`;
    const usersTable = `${this.baseTableName}_users`;
    const workflowStatesTable = `${this.baseTableName}_workflow_states`;

    // Check if this is a fresh installation
    const isFreshInstall = await this.checkFreshInstallation();

    if (isFreshInstall) {
      // Fresh installation - show complete table creation SQL
      console.log(`
========================================
SUPABASE MEMORY V2 - TABLE CREATION SQL
========================================

Please run the following SQL in your Supabase SQL Editor:

-- Create users table (for user-level working memory)
CREATE TABLE IF NOT EXISTS ${usersTable} (
  id TEXT PRIMARY KEY,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS ${conversationsTable} (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create messages table
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
);

-- Create workflow states table
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
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_user_id 
ON ${conversationsTable}(user_id);

CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_resource_id 
ON ${conversationsTable}(resource_id);

CREATE INDEX IF NOT EXISTS idx_${messagesTable}_conversation_id 
ON ${messagesTable}(conversation_id);

CREATE INDEX IF NOT EXISTS idx_${messagesTable}_created_at 
ON ${messagesTable}(created_at);

CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_workflow_id 
ON ${workflowStatesTable}(workflow_id);

CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_status 
ON ${workflowStatesTable}(status);

========================================
END OF SQL
========================================
`);
    } else {
      // Tables exist - check if migration is needed
      const needsMigration = await this.checkMigrationNeeded();
      if (needsMigration) {
        // Migration needed - show migration SQL
        this.logMigrationSQL();
      } else {
        // V2 system already in place
        this.log("Tables already exist with V2 structure - no migration needed");
      }
    }

    this.initialized = true;
    this.log("Initialization complete");
  }

  /**
   * Log migration SQL for existing tables with old columns
   */
  private logMigrationSQL(): void {
    const messagesTable = `${this.baseTableName}_messages`;
    const conversationsTable = `${this.baseTableName}_conversations`;
    const usersTable = `${this.baseTableName}_users`;
    const workflowStatesTable = `${this.baseTableName}_workflow_states`;

    console.log(`
========================================
MIGRATION SQL FROM OLD SYSTEM TO V2
========================================

Your existing tables need to be migrated. Run this SQL in Supabase:

-- Step 1: Add new columns to conversations table (if missing)
ALTER TABLE ${conversationsTable}
ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default',
ADD COLUMN IF NOT EXISTS resource_id TEXT NOT NULL DEFAULT '';

-- Step 2: Add new columns to messages table
ALTER TABLE ${messagesTable} 
ADD COLUMN IF NOT EXISTS parts JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS format_version INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default';

-- Step 3: Make old columns nullable in messages table
ALTER TABLE ${messagesTable} 
ALTER COLUMN content DROP NOT NULL,
ALTER COLUMN type DROP NOT NULL;

-- Step 4: Create users table for working memory
CREATE TABLE IF NOT EXISTS ${usersTable} (
  id TEXT PRIMARY KEY,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Step 5: Create workflow states table
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
);

-- Step 5b: Add workflow state columns for existing tables (migration)
ALTER TABLE ${workflowStatesTable}
ADD COLUMN IF NOT EXISTS events JSONB;

ALTER TABLE ${workflowStatesTable}
ADD COLUMN IF NOT EXISTS output JSONB;

ALTER TABLE ${workflowStatesTable}
ADD COLUMN IF NOT EXISTS cancellation JSONB;

-- Step 6: Migrate null user IDs to actual user IDs
-- IMPORTANT: This updates messages with NULL user_id to use their conversation's user_id
UPDATE ${messagesTable} m
SET user_id = c.user_id
FROM ${conversationsTable} c
WHERE m.conversation_id = c.id
  AND m.user_id IS NULL
  AND c.user_id IS NOT NULL;


-- Step 6: Create indexes for all tables
CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_user_id 
ON ${conversationsTable}(user_id);

CREATE INDEX IF NOT EXISTS idx_${conversationsTable}_resource_id 
ON ${conversationsTable}(resource_id);

CREATE INDEX IF NOT EXISTS idx_${messagesTable}_conversation_id 
ON ${messagesTable}(conversation_id);

CREATE INDEX IF NOT EXISTS idx_${messagesTable}_created_at 
ON ${messagesTable}(created_at);

CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_workflow_id 
ON ${workflowStatesTable}(workflow_id);

CREATE INDEX IF NOT EXISTS idx_${workflowStatesTable}_status 
ON ${workflowStatesTable}(status);

========================================
END OF MIGRATION SQL
========================================
`);
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Add a single message
   */
  async addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.baseTableName}_messages`;

    // Ensure conversation exists
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Insert message
    const { error } = await this.client.from(messagesTable).insert({
      conversation_id: conversationId,
      message_id: message.id || this.generateId(),
      user_id: userId,
      role: message.role,
      parts: message.parts,
      metadata: message.metadata || null,
      format_version: 2,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }

    this.log(`Added message to conversation ${conversationId}`);
  }

  /**
   * Add multiple messages
   */
  async addMessages(messages: UIMessage[], userId: string, conversationId: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.baseTableName}_messages`;

    // Ensure conversation exists
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const now = new Date().toISOString();

    // Prepare messages for batch insert
    const messagesToInsert = messages.map((message) => ({
      conversation_id: conversationId,
      message_id: message.id || this.generateId(),
      user_id: userId,
      role: message.role,
      parts: message.parts,
      metadata: message.metadata || null,
      format_version: 2,
      created_at: now,
    }));

    // Insert all messages
    const { error } = await this.client.from(messagesTable).insert(messagesToInsert);

    if (error) {
      throw new Error(`Failed to add messages: ${error.message}`);
    }

    this.log(`Added ${messages.length} messages to conversation ${conversationId}`);
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

    const messagesTable = `${this.baseTableName}_messages`;
    const { limit, before, after, roles } = options || {};

    // Build query - use SELECT * to handle both old and new schemas safely
    let query = this.client
      .from(messagesTable)
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    // Add role filter
    if (roles && roles.length > 0) {
      query = query.in("role", roles);
    }

    // Add time filters
    if (before) {
      query = query.lt("created_at", before.toISOString());
    }

    if (after) {
      query = query.gt("created_at", after.toISOString());
    }

    // Order by creation time and apply limit
    query = query.order("created_at", { ascending: true });
    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    // Convert to UIMessages with on-the-fly migration for old format
    return (data || []).map((row) => {
      // Determine parts based on whether we have new format (parts) or old format (content)
      let parts: any;

      // Check for new format first (parts column exists and has value)
      if (row.parts !== undefined && row.parts !== null) {
        // New format - use parts directly
        parts = row.parts;
      }
      // Check for old format (content column exists and has value)
      else if (row.content !== undefined && row.content !== null) {
        // Old format - convert content to parts
        if (row.type === "image") {
          parts = [{ type: "image", image: row.content }];
        } else {
          parts = [{ type: "text", text: row.content }];
        }
      } else {
        // No content at all
        parts = [];
      }

      return {
        id: row.message_id,
        role: row.role as "system" | "user" | "assistant",
        parts,
        metadata: row.metadata || {},
      };
    });
  }

  /**
   * Clear messages for a user
   */
  async clearMessages(userId: string, conversationId?: string): Promise<void> {
    await this.initialize();

    const messagesTable = `${this.baseTableName}_messages`;

    if (conversationId) {
      // Clear messages for specific conversation
      const { error } = await this.client
        .from(messagesTable)
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to clear messages: ${error.message}`);
      }
    } else {
      // Clear all messages for the user
      const conversationsTable = `${this.baseTableName}_conversations`;

      // First get all conversation IDs for the user
      const { data: conversations, error: fetchError } = await this.client
        .from(conversationsTable)
        .select("id")
        .eq("user_id", userId);

      if (fetchError) {
        throw new Error(`Failed to fetch conversations: ${fetchError.message}`);
      }

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map((c) => c.id);

        const { error } = await this.client
          .from(messagesTable)
          .delete()
          .in("conversation_id", conversationIds);

        if (error) {
          throw new Error(`Failed to clear messages: ${error.message}`);
        }
      }
    }

    this.log(`Cleared messages for user ${userId}`);
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    await this.initialize();

    const conversationsTable = `${this.baseTableName}_conversations`;

    // Check if conversation already exists
    const existing = await this.getConversation(input.id);
    if (existing) {
      throw new ConversationAlreadyExistsError(input.id);
    }

    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from(conversationsTable)
      .insert({
        id: input.id,
        resource_id: input.resourceId,
        user_id: input.userId,
        title: input.title,
        metadata: input.metadata || {},
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      resourceId: data.resource_id,
      title: data.title,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    await this.initialize();

    const conversationsTable = `${this.baseTableName}_conversations`;

    const { data, error } = await this.client
      .from(conversationsTable)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      resourceId: data.resource_id,
      title: data.title,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get conversations by resource ID
   */
  async getConversations(resourceId: string): Promise<Conversation[]> {
    await this.initialize();

    const conversationsTable = `${this.baseTableName}_conversations`;

    const { data, error } = await this.client
      .from(conversationsTable)
      .select("*")
      .eq("resource_id", resourceId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get conversations: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      resourceId: row.resource_id,
      title: row.title,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

    const conversationsTable = `${this.baseTableName}_conversations`;
    let query = this.client.from(conversationsTable).select("*");

    // Add filters
    if (options.userId) {
      query = query.eq("user_id", options.userId);
    }

    if (options.resourceId) {
      query = query.eq("resource_id", options.resourceId);
    }

    // Add ordering
    const orderBy = options.orderBy || "updated_at";
    const orderDirection = options.orderDirection === "ASC";
    query = query.order(orderBy, { ascending: orderDirection });

    // Add pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query conversations: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      resourceId: row.resource_id,
      title: row.title,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

    const conversationsTable = `${this.baseTableName}_conversations`;
    const conversation = await this.getConversation(id);
    if (!conversation) {
      throw new ConversationNotFoundError(id);
    }

    const now = new Date().toISOString();
    const updateData: any = { updated_at: now };

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }

    if (updates.resourceId !== undefined) {
      updateData.resource_id = updates.resourceId;
    }

    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    const { data, error } = await this.client
      .from(conversationsTable)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      resourceId: data.resource_id,
      title: data.title,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    await this.initialize();

    const conversationsTable = `${this.baseTableName}_conversations`;

    const { error } = await this.client.from(conversationsTable).delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }

    this.log(`Deleted conversation ${id}`);
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
      const usersTable = `${this.baseTableName}_users`;
      const { data, error } = await this.client
        .from(usersTable)
        .select("metadata")
        .eq("id", params.userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No user found
          return null;
        }
        throw new Error(`Failed to get working memory: ${error.message}`);
      }

      return data?.metadata?.workingMemory || null;
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
      const usersTable = `${this.baseTableName}_users`;
      const now = new Date().toISOString();

      // Try to update existing user
      const { data: existingUser, error: fetchError } = await this.client
        .from(usersTable)
        .select("metadata")
        .eq("id", params.userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }

      if (existingUser) {
        // User exists, update metadata
        const metadata = existingUser.metadata || {};
        metadata.workingMemory = params.content;

        const { error } = await this.client
          .from(usersTable)
          .update({ metadata, updated_at: now })
          .eq("id", params.userId);

        if (error) {
          throw new Error(`Failed to update working memory: ${error.message}`);
        }
      } else {
        // User doesn't exist, create new record
        const { error } = await this.client.from(usersTable).insert({
          id: params.userId,
          metadata: { workingMemory: params.content },
          created_at: now,
          updated_at: now,
        });

        if (error) {
          throw new Error(`Failed to create user working memory: ${error.message}`);
        }
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
        (metadata as any).workingMemory = undefined;
        await this.updateConversation(params.conversationId, { metadata });
      }
    }

    if (params.scope === "user" && params.userId) {
      const usersTable = `${this.baseTableName}_users`;
      const { data, error: fetchError } = await this.client
        .from(usersTable)
        .select("metadata")
        .eq("id", params.userId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // No user found, nothing to delete
          return;
        }
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }

      if (data?.metadata?.workingMemory) {
        const metadata = { ...data.metadata };
        (metadata as any).workingMemory = undefined;

        const { error } = await this.client
          .from(usersTable)
          .update({ metadata, updated_at: new Date().toISOString() })
          .eq("id", params.userId);

        if (error) {
          throw new Error(`Failed to delete working memory: ${error.message}`);
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

    const workflowStatesTable = `${this.baseTableName}_workflow_states`;
    const { data, error } = await this.client
      .from(workflowStatesTable)
      .select("*")
      .eq("id", executionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      throw new Error(`Failed to get workflow state: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      workflowId: data.workflow_id,
      workflowName: data.workflow_name,
      status: data.status,
      suspension: data.suspension || undefined,
      events: data.events || undefined,
      output: data.output || undefined,
      cancellation: data.cancellation || undefined,
      userId: data.user_id || undefined,
      conversationId: data.conversation_id || undefined,
      metadata: data.metadata || undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Set workflow state
   */
  async setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void> {
    await this.initialize();

    const workflowStatesTable = `${this.baseTableName}_workflow_states`;

    const { error } = await this.client.from(workflowStatesTable).upsert({
      id: executionId,
      workflow_id: state.workflowId,
      workflow_name: state.workflowName,
      status: state.status,
      suspension: state.suspension || null,
      events: state.events || null,
      output: state.output || null,
      cancellation: state.cancellation || null,
      user_id: state.userId || null,
      conversation_id: state.conversationId || null,
      metadata: state.metadata || null,
      created_at: state.createdAt.toISOString(),
      updated_at: state.updatedAt.toISOString(),
    });

    if (error) {
      throw new Error(`Failed to set workflow state: ${error.message}`);
    }
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

    const workflowStatesTable = `${this.baseTableName}_workflow_states`;
    const { data, error } = await this.client
      .from(workflowStatesTable)
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("status", "suspended")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get suspended workflow states: ${error.message}`);
    }

    return (data || []).map((row) => ({
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
   * Close database connection (no-op for Supabase)
   */
  async close(): Promise<void> {
    this.log("Supabase client closed (no-op)");
  }
}
