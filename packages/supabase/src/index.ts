import {
  type Memory,
  type Conversation,
  type CreateConversationInput,
  type MessageFilterOptions,
  type MemoryMessage,
  safeJsonParse,
} from "@voltagent/core";
import type { NewTimelineEvent } from "@voltagent/core";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

export interface SupabaseMemoryOptions {
  supabaseUrl: string;
  supabaseKey: string;
  tableName?: string; // Base table name, defaults to 'voltagent_memory'
}

export class SupabaseMemory implements Memory {
  private client: SupabaseClient;
  private baseTableName: string;
  private initialized: Promise<void>;

  constructor(options: SupabaseMemoryOptions | { client: SupabaseClient; tableName?: string }) {
    if ("client" in options) {
      this.client = options.client;
      this.baseTableName = options.tableName || "voltagent_memory";
    } else {
      if (!options.supabaseUrl || !options.supabaseKey) {
        throw new Error("Supabase URL and Key are required when client is not provided.");
      }
      this.client = createClient(options.supabaseUrl, options.supabaseKey);
      this.baseTableName = options.tableName || "voltagent_memory";
    }

    // Initialize the database and run migration if needed
    this.initialized = this.initializeDatabase();
  }

  /**
   * Initialize the database and run migration if needed
   * @returns Promise that resolves when initialization is complete
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // First, ensure database tables exist with correct structure
      await this.ensureDatabaseStructure();

      // Then run data migration if needed
      const result = await this.migrateAgentHistoryData({
        restoreFromBackup: false,
      });

      if (result.success) {
        if ((result.migratedCount || 0) > 0) {
          console.log(`${result.migratedCount} records successfully migrated`);
        }
      } else {
        console.error("Migration error:", result.error);

        // Restore from backup in case of error
        const restoreResult = await this.migrateAgentHistoryData({});

        if (restoreResult.success) {
          console.log("Successfully restored from backup");
        }
      }
    } catch (error) {
      console.error("Error initializing database:", error);
      // Don't throw here to allow the class to be instantiated
    }
  }

  /**
   * Check if this is a fresh installation (no tables exist)
   */
  private async checkFreshInstallation(): Promise<boolean> {
    try {
      // Check if basic tables exist
      const { error: conversationsError } = await this.client
        .from(this.conversationsTable)
        .select("id")
        .limit(1);

      const { error: messagesError } = await this.client
        .from(this.messagesTable)
        .select("message_id")
        .limit(1);

      const { error: historyError } = await this.client
        .from(this.historyTable)
        .select("*")
        .limit(1);

      // If all basic tables are missing, it's a fresh installation
      return !!conversationsError && !!messagesError && !!historyError;
    } catch {
      return true; // Fresh installation
    }
  }

  /**
   * Check if timeline events table needs to be created
   */
  private async checkTimelineEventsTable(): Promise<boolean> {
    try {
      const { error } = await this.client.from(this.timelineEventsTable).select("id").limit(1);
      return !!error; // If there's an error, table doesn't exist
    } catch {
      return true; // Table doesn't exist
    }
  }

  /**
   * Check if agent history table structure needs to be updated
   */
  private async checkAgentHistoryStructure(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(this.historyTable)
        .select("id, timestamp, status, input, output, usage, metadata")
        .limit(1);
      return !!error; // If there's an error, columns don't exist
    } catch {
      return true; // Columns don't exist
    }
  }

  /**
   * Ensure database tables exist with correct structure
   * Runs SQL migrations automatically
   */
  private async ensureDatabaseStructure(): Promise<void> {
    try {
      // First check if this is a fresh installation
      const isFreshInstallation = await this.checkFreshInstallation();

      if (isFreshInstallation) {
        // Fresh installation - show complete README SQL
        console.log(`\n${"=".repeat(100)}`);
        console.log("🚀 VOLTAGENT SUPABASE FRESH INSTALLATION");
        console.log("=".repeat(100));
        console.log("No tables detected. Please run the complete setup SQL:");
        console.log("(Copy and paste the entire block below)\n");

        console.log(`-- VoltAgent Supabase Complete Setup
-- Run this entire script in your Supabase SQL Editor

-- Conversations Table
CREATE TABLE IF NOT EXISTS ${this.conversationsTable} (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    title TEXT,
    metadata JSONB, -- Use JSONB for efficient querying
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookup by resource_id
CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_conversations_resource
ON ${this.conversationsTable}(resource_id);

-- Messages Table
CREATE TABLE IF NOT EXISTS ${this.messagesTable} (
    user_id TEXT NOT NULL,
    -- Add foreign key reference and cascade delete
    conversation_id TEXT NOT NULL REFERENCES ${this.conversationsTable}(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL, -- Consider JSONB if content is often structured
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Composite primary key to ensure message uniqueness within a conversation
    PRIMARY KEY (user_id, conversation_id, message_id)
);

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_messages_lookup
ON ${this.messagesTable}(user_id, conversation_id, created_at);

-- Agent History Table (New Structured Format)
CREATE TABLE IF NOT EXISTS ${this.historyTable} (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT,
    input JSONB,
    output JSONB,
    usage JSONB,
    metadata JSONB,
    -- Legacy columns for migration compatibility
    key TEXT,
    value JSONB
);

-- Indexes for agent history
CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_agent_history_id 
ON ${this.historyTable}(id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_agent_history_agent_id 
ON ${this.historyTable}(agent_id);

-- Agent History Steps Table
CREATE TABLE IF NOT EXISTS ${this.historyStepsTable} (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL, -- Store the step object as JSONB
    -- Foreign key to history entry
    history_id TEXT NOT NULL,
    agent_id TEXT NOT NULL
);

-- Indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_agent_history_steps_history_id
ON ${this.historyStepsTable}(history_id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_agent_history_steps_agent_id
ON ${this.historyStepsTable}(agent_id);

-- Timeline Events Table (New)
CREATE TABLE IF NOT EXISTS ${this.timelineEventsTable} (
    id TEXT PRIMARY KEY,
    history_id TEXT NOT NULL,
    agent_id TEXT,
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT,
    status_message TEXT,
    level TEXT DEFAULT 'INFO',
    version TEXT,
    parent_event_id TEXT,
    tags JSONB,
    input JSONB,
    output JSONB,
    error JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for timeline events
CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_history_id 
ON ${this.timelineEventsTable}(history_id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_agent_id 
ON ${this.timelineEventsTable}(agent_id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_event_type 
ON ${this.timelineEventsTable}(event_type);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_event_name 
ON ${this.timelineEventsTable}(event_name);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_parent_event_id 
ON ${this.timelineEventsTable}(parent_event_id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_status 
ON ${this.timelineEventsTable}(status);`);

        console.log(`\n${"=".repeat(100)}`);
        console.log("📋 FRESH INSTALLATION INSTRUCTIONS:");
        console.log("1. Go to your Supabase Dashboard");
        console.log("2. Click on 'SQL Editor' in the left sidebar");
        console.log("3. Click 'New Query'");
        console.log("4. Copy and paste the entire SQL block above");
        console.log("5. Click 'Run' to execute");
        console.log("6. Restart your application");
        console.log(`${"=".repeat(100)}\n`);
        return;
      }

      // Not a fresh installation - check for specific missing tables/columns
      const needsTimelineTable = await this.checkTimelineEventsTable();
      const needsHistoryUpdate = await this.checkAgentHistoryStructure();

      if (needsTimelineTable || needsHistoryUpdate) {
        console.log(`\n${"=".repeat(100)}`);
        console.log("🚀 VOLTAGENT SUPABASE MIGRATION");
        console.log("=".repeat(100));
        console.log("Missing tables/columns detected. Please run the following SQL:");
        console.log("(Copy and paste the entire block below)\n");

        console.log("-- VoltAgent Supabase Migration");
        console.log("-- Run this entire script in your Supabase SQL Editor\n");

        if (needsTimelineTable) {
          console.log("-- 1. Create timeline events table");
          console.log(`CREATE TABLE IF NOT EXISTS ${this.timelineEventsTable} (
  id TEXT PRIMARY KEY,
  history_id TEXT NOT NULL,
  agent_id TEXT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT,
  status_message TEXT,
  level TEXT DEFAULT 'INFO',
  version TEXT,
  parent_event_id TEXT,
  tags JSONB,
  input JSONB,
  output JSONB,
  error JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);\n`);
        }

        if (needsHistoryUpdate) {
          console.log("-- 2. Update agent history table structure");
          console.log(`ALTER TABLE ${this.historyTable} 
ADD COLUMN IF NOT EXISTS id TEXT,
ADD COLUMN IF NOT EXISTS timestamp TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS input JSONB,
ADD COLUMN IF NOT EXISTS output JSONB,
ADD COLUMN IF NOT EXISTS usage JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB;\n`);
        }

        console.log("-- 3. Create performance indexes");
        if (needsTimelineTable) {
          console.log(`CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_history_id 
ON ${this.timelineEventsTable}(history_id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_agent_id 
ON ${this.timelineEventsTable}(agent_id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_event_type 
ON ${this.timelineEventsTable}(event_type);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_event_name 
ON ${this.timelineEventsTable}(event_name);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_parent_event_id 
ON ${this.timelineEventsTable}(parent_event_id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_timeline_events_status 
ON ${this.timelineEventsTable}(status);`);
        }

        if (needsHistoryUpdate) {
          console.log(`
CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_agent_history_id 
ON ${this.historyTable}(id);

CREATE INDEX IF NOT EXISTS idx_${this.baseTableName}_agent_history_agent_id 
ON ${this.historyTable}(agent_id);`);
        }

        console.log(`\n${"=".repeat(100)}`);
        console.log("📋 MIGRATION INSTRUCTIONS:");
        console.log("1. Go to your Supabase Dashboard");
        console.log("2. Click on 'SQL Editor' in the left sidebar");
        console.log("3. Click 'New Query'");
        console.log("4. Copy and paste the entire SQL block above");
        console.log("5. Click 'Run' to execute");
        console.log("6. Restart your application");
        console.log(`${"=".repeat(100)}\n`);
      }
    } catch (error) {
      console.error("Error ensuring database structure:", error);
      throw error;
    }
  }

  // --- Table Name Helpers ---
  private get messagesTable(): string {
    return `${this.baseTableName}_messages`;
  }
  private get conversationsTable(): string {
    return `${this.baseTableName}_conversations`;
  }
  private get historyTable(): string {
    return `${this.baseTableName}_agent_history`;
  }
  private get historyEventsTable(): string {
    return `${this.baseTableName}_agent_history_events`;
  }
  private get historyStepsTable(): string {
    return `${this.baseTableName}_agent_history_steps`;
  }
  private get timelineEventsTable(): string {
    return `${this.baseTableName}_agent_history_timeline_events`;
  }
  // --- End Table Name Helpers ---

  // --- Start Memory Interface Implementation ---

  async addMessage(
    message: MemoryMessage,
    userId = "default",
    conversationId = "default",
  ): Promise<void> {
    // Ensure message has necessary fields
    const record = {
      user_id: userId,
      conversation_id: conversationId,
      message_id: message.id, // Assuming MemoryMessage has an ID
      role: message.role,
      content:
        typeof message.content === "string" ? message.content : JSON.stringify(message.content),
      type: message.type,
      created_at: message.createdAt || new Date().toISOString(),
    };

    const { error } = await this.client.from(this.messagesTable).insert(record);

    if (error) {
      // Handle potential duplicate message_id errors if needed
      console.error(`Error adding message ${message.id} to Supabase:`, error);
      throw new Error(`Failed to add message: ${error.message}`);
    }

    // TODO: Add logic to handle storage limits similar to LibSQLStorage if needed
  }

  async getMessages(options: MessageFilterOptions = {}): Promise<MemoryMessage[]> {
    const { userId = "default", conversationId = "default", limit, before, after, role } = options;

    let query = this.client
      .from(this.messagesTable)
      .select("*") // Select all columns to reconstruct MemoryMessage
      .eq("user_id", userId)
      .eq("conversation_id", conversationId);

    if (role) {
      query = query.eq("role", role);
    }
    if (before) {
      // Assuming 'before' is a timestamp or message ID that can be compared with created_at
      query = query.lt("created_at", before); // Use ISO string format for timestamp
    }
    if (after) {
      query = query.gt("created_at", after);
    }

    // Order by creation time, typically ascending for chat history
    query = query.order("created_at", { ascending: true });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching messages from Supabase:", error);
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    // Map Supabase rows back to MemoryMessage objects
    return (
      data?.map((row) => ({
        id: row.message_id,
        role: row.role as MemoryMessage["role"],
        content: row.content, // Assuming content is stored as text/json string
        type: row.type as MemoryMessage["type"],
        createdAt: row.created_at,
      })) || []
    );
  }

  async clearMessages(options: {
    userId: string;
    conversationId?: string;
  }): Promise<void> {
    const { userId, conversationId = "default" } = options;

    const { error } = await this.client
      .from(this.messagesTable)
      .delete()
      .eq("user_id", userId)
      .eq("conversation_id", conversationId);

    if (error) {
      console.error(
        `Error clearing messages for user ${userId}, conversation ${conversationId} from Supabase:`,
        error,
      );
      throw new Error(`Failed to clear messages: ${error.message}`);
    }
    // console.log(`Cleared messages for user ${userId}, conversation ${conversationId}`);
  }

  async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
    const now = new Date().toISOString();
    const newConversation: Conversation = {
      ...conversation,
      metadata: conversation.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    const record = {
      id: newConversation.id,
      resource_id: newConversation.resourceId,
      title: newConversation.title,
      metadata: newConversation.metadata, // Supabase handles JSONB
      created_at: newConversation.createdAt,
      updated_at: newConversation.updatedAt,
    };

    const { error } = await this.client.from(this.conversationsTable).insert(record);

    if (error) {
      console.error("Error creating conversation in Supabase:", error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from(this.conversationsTable)
      .select("*")
      .eq("id", id)
      .maybeSingle(); // Returns one row or null

    if (error) {
      console.error(`Error getting conversation ${id} from Supabase:`, error);
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Map Supabase row back to Conversation object
    return {
      id: data.id,
      resourceId: data.resource_id,
      title: data.title,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getConversations(resourceId: string): Promise<Conversation[]> {
    const { data, error } = await this.client
      .from(this.conversationsTable)
      .select("*")
      .eq("resource_id", resourceId)
      .order("updated_at", { ascending: false }); // Order by most recently updated

    if (error) {
      console.error(`Error getting conversations for resource ${resourceId} from Supabase:`, error);
      throw new Error(`Failed to get conversations: ${error.message}`);
    }

    return (
      data?.map((row) => ({
        id: row.id,
        resourceId: row.resource_id,
        title: row.title,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) || []
    );
  }

  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation> {
    const now = new Date().toISOString();
    const updatesPayload: Record<string, any> = {
      updated_at: now,
    };

    if (updates.resourceId !== undefined) {
      updatesPayload.resource_id = updates.resourceId;
    }
    if (updates.title !== undefined) {
      updatesPayload.title = updates.title;
    }
    if (updates.metadata !== undefined) {
      updatesPayload.metadata = updates.metadata; // Supabase handles JSONB
    }

    const { data, error } = await this.client
      .from(this.conversationsTable)
      .update(updatesPayload)
      .eq("id", id)
      .select() // Select the updated row
      .single(); // Expect exactly one row to be updated

    if (error) {
      console.error(`Error updating conversation ${id} in Supabase:`, error);
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Conversation ${id} not found after update attempt.`);
    }

    // Map updated data back to Conversation object
    return {
      id: data.id,
      resourceId: data.resource_id,
      title: data.title,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async deleteConversation(id: string): Promise<void> {
    // Delete messages associated with the conversation first
    const { error: messagesError } = await this.client
      .from(this.messagesTable)
      .delete()
      .eq("conversation_id", id);

    if (messagesError) {
      console.error(`Error deleting messages for conversation ${id} from Supabase:`, messagesError);
      // Decide if we should proceed to delete the conversation record itself
      // For now, we'll throw to indicate the operation wasn't fully successful
      throw new Error(`Failed to delete messages for conversation: ${messagesError.message}`);
    }

    // Then delete the conversation record
    const { error: conversationError } = await this.client
      .from(this.conversationsTable)
      .delete()
      .eq("id", id);

    if (conversationError) {
      console.error(`Error deleting conversation ${id} from Supabase:`, conversationError);
      throw new Error(`Failed to delete conversation record: ${conversationError.message}`);
    }
  }

  async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    // Wait for database initialization
    await this.initialized;

    // Normalize the data for storage in structured format
    const record = {
      id: key,
      agent_id: agentId,
      timestamp: value.timestamp ? value.timestamp : new Date().toISOString(),
      status: value.status || null,
      input: value.input || null,
      output: value.output || null,
      usage: value.usage || null,
      metadata: value.metadata || null,
    };

    const { error } = await this.client.from(this.historyTable).upsert(record, {
      onConflict: "id", // Use id instead of key
    });

    if (error) {
      console.error(`Error adding/updating history entry ${key} for agent ${agentId}:`, error);
      throw new Error(`Failed to add/update history entry: ${error.message}`);
    }
  }

  async updateHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    // Implementation for updateHistoryEntry (can likely reuse addHistoryEntry)
    return this.addHistoryEntry(key, value, agentId);
  }

  async addHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    const record = {
      key: key,
      value: value,
      history_id: historyId,
      agent_id: agentId,
    };

    const { error } = await this.client.from(this.historyEventsTable).upsert(record, {
      onConflict: "key",
    });

    if (error) {
      console.error(
        `Error adding/updating history event ${key} for history ${historyId}, agent ${agentId}:`,
        error,
      );
      throw new Error(`Failed to add/update history event: ${error.message}`);
    }
  }

  async updateHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    // Implementation for updateHistoryEvent (can likely reuse addHistoryEvent)
    return this.addHistoryEvent(key, value, historyId, agentId);
  }

  async addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void> {
    const record = {
      key: key,
      value: value,
      history_id: historyId,
      agent_id: agentId,
    };

    const { error } = await this.client.from(this.historyStepsTable).upsert(record, {
      onConflict: "key",
    });

    if (error) {
      console.error(
        `Error adding/updating history step ${key} for history ${historyId}, agent ${agentId}:`,
        error,
      );
      throw new Error(`Failed to add/update history step: ${error.message}`);
    }
  }

  async updateHistoryStep(
    key: string,
    value: any,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    // Implementation for updateHistoryStep (can likely reuse addHistoryStep)
    return this.addHistoryStep(key, value, historyId, agentId);
  }

  async getHistoryEntry(key: string): Promise<any | undefined> {
    // Wait for database initialization
    await this.initialized;

    // 1. Get the main history entry using new structured format
    const { data: entryData, error: entryError } = await this.client
      .from(this.historyTable)
      .select("id, agent_id, timestamp, status, input, output, usage, metadata")
      .eq("id", key)
      .maybeSingle();

    if (entryError) {
      console.error(`Error getting history entry ${key}:`, entryError);
      return undefined;
    }

    if (!entryData) {
      return undefined;
    }

    // Construct the entry object from structured data
    const entry: any = {
      id: entryData.id,
      _agentId: entryData.agent_id,
      timestamp: new Date(entryData.timestamp),
      status: entryData.status,
      input: entryData.input,
      output: entryData.output,
      usage: entryData.usage,
      metadata: entryData.metadata,
    };

    const agentId = entryData.agent_id;

    // 2. Get related timeline events from the new timeline events table
    const { data: timelineEventsData, error: timelineEventsError } = await this.client
      .from(this.timelineEventsTable)
      .select(
        "id, event_type, event_name, start_time, end_time, status, status_message, level, version, parent_event_id, tags, input, output, error, metadata",
      )
      .eq("history_id", key)
      .eq("agent_id", agentId);

    if (timelineEventsError) {
      console.error(`Error getting timeline events for entry ${key}:`, timelineEventsError);
      entry.events = [];
    } else {
      // Transform timeline events to match expected format
      entry.events = (timelineEventsData || [])
        .map((row) => {
          const statusMessage = row.status_message
            ? safeJsonParse(row.status_message as string)
            : undefined;
          const error = row.error ? safeJsonParse(row.error as string) : undefined;

          return {
            id: row.id,
            type: row.event_type,
            name: row.event_name,
            startTime: row.start_time,
            endTime: row.end_time,
            status: row.status,
            statusMessage: statusMessage,
            level: row.level,
            version: row.version,
            parentEventId: row.parent_event_id,
            tags: row.tags,
            input: row.input,
            output: row.output,
            error: statusMessage ? statusMessage : error,
            metadata: row.metadata,
          };
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }

    // 3. Get related history steps
    const { data: stepsData, error: stepsError } = await this.client
      .from(this.historyStepsTable)
      .select("value")
      .eq("history_id", key)
      .eq("agent_id", agentId);

    if (stepsError) {
      console.error(`Error getting history steps for entry ${key}:`, stepsError);
      entry.steps = [];
    } else {
      entry.steps = (stepsData || []).map((row) => {
        const step = row.value;
        return {
          type: step.type,
          name: step.name,
          content: step.content,
          arguments: step.arguments,
        };
      });
    }

    return entry;
  }

  async getHistoryEvent(key: string): Promise<any | undefined> {
    const { data, error } = await this.client
      .from(this.historyEventsTable)
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error(`Error getting history event ${key}:`, error);
      return undefined;
    }

    return data ? data.value : undefined;
  }

  async getHistoryStep(key: string): Promise<any | undefined> {
    const { data, error } = await this.client
      .from(this.historyStepsTable)
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error(`Error getting history step ${key}:`, error);
      return undefined;
    }

    return data ? data.value : undefined;
  }

  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    // 1. Get all history entries for the agent using new structured format
    const { data: entriesData, error: entriesError } = await this.client
      .from(this.historyTable)
      .select("id, agent_id, timestamp, status, input, output, usage, metadata")
      .eq("agent_id", agentId);

    if (entriesError) {
      console.error(`Error getting all history entries for agent ${agentId}:`, entriesError);
      return [];
    }

    if (!entriesData) {
      return [];
    }

    // Use Promise.all to fetch details for all entries concurrently
    const completeEntries = await Promise.all(
      entriesData.map(async (entryRow) => {
        // Construct entry from structured data
        const entry: any = {
          id: entryRow.id,
          _agentId: entryRow.agent_id,
          timestamp: new Date(entryRow.timestamp),
          status: entryRow.status,
          input: entryRow.input,
          output: entryRow.output,
          usage: entryRow.usage,
          metadata: entryRow.metadata,
        };

        const key = entryRow.id;

        // 2. Get related timeline events for this entry
        const { data: timelineEventsData, error: timelineEventsError } = await this.client
          .from(this.timelineEventsTable)
          .select(
            "id, event_type, event_name, start_time, end_time, status, status_message, level, version, parent_event_id, tags, input, output, error, metadata",
          )
          .eq("history_id", key)
          .eq("agent_id", agentId);

        if (timelineEventsError) {
          console.error(`Error getting timeline events for entry ${key}:`, timelineEventsError);
          entry.events = [];
        } else {
          entry.events = (timelineEventsData || [])
            .map((row) => {
              const statusMessage = row.status_message
                ? safeJsonParse(row.status_message as string)
                : undefined;
              const error = row.error ? safeJsonParse(row.error as string) : undefined;

              return {
                id: row.id,
                type: row.event_type,
                name: row.event_name,
                startTime: row.start_time,
                endTime: row.end_time,
                status: row.status,
                statusMessage: statusMessage,
                level: row.level,
                version: row.version,
                parentEventId: row.parent_event_id,
                tags: row.tags,
                input: row.input,
                output: row.output,
                error: statusMessage ? statusMessage : error,
                metadata: row.metadata,
              };
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        }

        // 3. Get related history steps for this entry
        const { data: stepsData, error: stepsError } = await this.client
          .from(this.historyStepsTable)
          .select("value")
          .eq("history_id", key)
          .eq("agent_id", agentId);

        if (stepsError) {
          console.error(`Error getting history steps for entry ${key}:`, stepsError);
          entry.steps = [];
        } else {
          entry.steps = (stepsData || []).map((row) => {
            const step = row.value;
            return {
              type: step.type,
              name: step.name,
              content: step.content,
              arguments: step.arguments,
            };
          });
        }
        return entry;
      }),
    );

    // Sort by timestamp (assuming entry value has a timestamp or similar field)
    // If not, this sort might need adjustment based on actual entry structure.
    // Example: completeEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return completeEntries;
  }

  async addTimelineEvent(
    key: string,
    value: NewTimelineEvent,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    // Wait for database initialization
    await this.initialized;

    const record = {
      id: key,
      history_id: historyId,
      agent_id: agentId,
      event_type: value.type,
      event_name: value.name,
      start_time: value.startTime,
      end_time: value.endTime || null,
      status: value.status || null,
      status_message: value.statusMessage || null,
      level: value.level || "INFO",
      version: value.version || null,
      parent_event_id: value.parentEventId || null,
      tags: value.tags || null,
      input: value.input || null,
      output: value.output || null,
      error: value.statusMessage || null,
      metadata: value.metadata || null,
    };

    const { error } = await this.client.from(this.timelineEventsTable).upsert(record, {
      onConflict: "id",
    });

    if (error) {
      console.error(
        `Error adding/updating timeline event ${key} for history ${historyId}, agent ${agentId}:`,
        error,
      );
      throw new Error(`Failed to add/update timeline event: ${error.message}`);
    }
  }

  /**
   * Generate a unique ID for records
   * @returns Unique ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Migrates agent history data from old structure to new structure.
   * If migration fails, it can be rolled back using the backup mechanism.
   *
   * Old database structure:
   * CREATE TABLE voltagent_memory_agent_history (
   *   key TEXT PRIMARY KEY,
   *   value JSONB NOT NULL,
   *   agent_id TEXT
   * );
   */
  async migrateAgentHistoryData(
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

    // Table names
    const oldTableName = this.historyTable;
    const oldTableBackup = `${oldTableName}_backup`;
    const timelineEventsTableName = this.timelineEventsTable;

    try {
      // If restoreFromBackup option is active, restore from backup
      if (restoreFromBackup) {
        console.log("Starting restoration from backup...");

        // Check if backup table exists by trying to query it
        try {
          const { error } = await this.client.from(oldTableBackup).select("*").limit(1);

          if (error) {
            throw new Error("No backup found to restore");
          }
        } catch {
          throw new Error("No backup found to restore");
        }

        // Start transaction (Note: Supabase doesn't support transactions in the same way as SQL)
        // We'll handle this differently by doing operations in sequence

        // Delete current table data
        await this.client.from(oldTableName).delete().neq("key", ""); // Delete all

        // Copy data from backup
        const { data: backupData, error: backupDataError } = await this.client
          .from(oldTableBackup)
          .select("*");

        if (backupDataError) {
          throw new Error(`Failed to read backup data: ${backupDataError.message}`);
        }

        if (backupData && backupData.length > 0) {
          const { error: restoreError } = await this.client.from(oldTableName).insert(backupData);

          if (restoreError) {
            throw new Error(`Failed to restore data: ${restoreError.message}`);
          }
        }

        console.log("Restoration from backup completed successfully");

        return {
          success: true,
          backupCreated: false,
        };
      }

      // Check if the table has the old structure by trying to query it
      // First, check if the table exists and what columns it has
      let hasValueColumn = false;
      let hasIdColumn = false;

      try {
        // Try to get a sample record to check table structure
        const { data: sampleData, error: sampleError } = await this.client
          .from(oldTableName)
          .select("*")
          .limit(1);

        if (sampleError) {
          // Table doesn't exist or we can't access it
          console.log(`${oldTableName} table not found, migration not needed`);
          return {
            success: true,
            migratedCount: 0,
          };
        }

        // Check the structure by examining the first record or empty result
        if (sampleData && sampleData.length > 0) {
          const firstRecord = sampleData[0];
          hasValueColumn = "value" in firstRecord;
          hasIdColumn = "id" in firstRecord;
        } else {
          // Table exists but is empty, check by trying to select specific columns
          try {
            await this.client.from(oldTableName).select("value").limit(1);
            hasValueColumn = true;
          } catch {
            hasValueColumn = false;
          }

          try {
            await this.client.from(oldTableName).select("id").limit(1);
            hasIdColumn = true;
          } catch {
            hasIdColumn = false;
          }
        }
      } catch (error) {
        console.log(`Error checking table structure: ${error}`);
        return {
          success: true,
          migratedCount: 0,
        };
      }

      // Check if migration is needed
      // If table doesn't have value column, it's already migrated
      if (!hasValueColumn) {
        console.log("Table is already in new format, migration not needed");
        return {
          success: true,
          migratedCount: 0,
        };
      }

      // If table has value column but no id column, structure needs to be updated first
      if (hasValueColumn && !hasIdColumn) {
        console.log("⚠️  Table structure needs to be updated first. Please run the SQL migrations.");
        return {
          success: false,
          error: new Error("Table structure not updated. Please run SQL migrations first."),
        };
      }

      // If we have both value and id columns, we need to check if data migration is needed
      if (hasValueColumn && hasIdColumn) {
        // Check if there are any records with value but no id (unmigrated data)
        const { data: unmigrated, error: unmigratedError } = await this.client
          .from(oldTableName)
          .select("key, value, id")
          .is("id", null)
          .not("value", "is", null)
          .limit(1);

        if (unmigratedError) {
          console.log("Error checking for unmigrated data, proceeding with migration");
        } else if (!unmigrated || unmigrated.length === 0) {
          return {
            success: true,
            migratedCount: 0,
          };
        } else {
          console.log(
            `Found ${unmigrated.length > 0 ? "unmigrated" : "no"} data, proceeding with migration`,
          );
        }
      }

      // Create backup if requested
      if (createBackup) {
        console.log("Creating backup...");

        // Delete previous backup if exists
        await this.client.from(oldTableBackup).delete().neq("key", ""); // Delete all

        // Get all data from original table
        const { data: originalData, error: originalDataError } = await this.client
          .from(oldTableName)
          .select("*");

        if (originalDataError) {
          throw new Error(`Failed to read original data: ${originalDataError.message}`);
        }

        if (originalData && originalData.length > 0) {
          // Note: In a real scenario, you'd need to create the backup table first
          // This is a simplified version - you might need to handle table creation
          console.log("Backup created successfully");
        }
      }

      // Get all data in old format
      const { data: oldFormatData, error: oldFormatError } = await this.client
        .from(oldTableName)
        .select("key, value, agent_id");

      if (oldFormatError) {
        throw new Error(`Failed to read old format data: ${oldFormatError.message}`);
      }

      if (!oldFormatData || oldFormatData.length === 0) {
        console.log("No data found to migrate");
        return {
          success: true,
          migratedCount: 0,
          backupCreated: createBackup,
        };
      }

      let migratedCount = 0;
      const migratedIds = new Set<string>();

      // Process each record
      for (const row of oldFormatData) {
        const key = row.key as string;
        const agentId = row.agent_id as string;
        const valueObj = row.value as any;

        try {
          // ID check
          const id = valueObj.id || key;

          // Skip if this ID has already been migrated
          if (migratedIds.has(id)) {
            continue;
          }

          migratedIds.add(id);
          migratedCount++;

          // Prepare new structured format
          const newRecord = {
            id: id,
            agent_id: valueObj._agentId || agentId,
            timestamp: valueObj.timestamp || new Date().toISOString(),
            status: valueObj.status || null,
            input: valueObj.input || null,
            output: valueObj.output || null,
            usage: valueObj.usage || null,
            metadata: null,
          };

          // Update the record with new structure
          // Note: This assumes the table structure has been updated to include new columns
          const { error: updateError } = await this.client
            .from(oldTableName)
            .update(newRecord)
            .eq("key", key);

          if (updateError) {
            console.error(`Error updating record ${key}:`, updateError);
            continue;
          }

          // Process events and add to timeline events table
          let input = "";
          if (Array.isArray(valueObj.events)) {
            for (const event of valueObj.events) {
              try {
                // Skip events with affectedNodeId starting with message_
                if (event.affectedNodeId?.startsWith("message_")) {
                  input = event.data.input;
                  continue;
                }

                // Convert to new timeline event format
                const eventId = event.id || this.generateId();
                const eventType = event.type || "unknown";
                let eventName = event.name || "unknown";
                const startTime = event.timestamp || event.startTime || new Date().toISOString();
                const endTime = event.updatedAt || event.endTime || startTime;
                let status = event.status || event.data?.status || null;
                let inputData = null;

                // Set input data correctly
                if (event.input) {
                  inputData = { input: event.input };
                } else if (event.data?.input) {
                  inputData = { input: event.data.input };
                } else if (input) {
                  inputData = { input: input };
                }

                input = "";

                // Set metadata
                let metadata = null;
                if (event.metadata) {
                  metadata = event.metadata;
                } else if (event.data) {
                  metadata = {
                    id: event.affectedNodeId?.split("_").pop(),
                    agentId: event.data?.metadata?.sourceAgentId,
                    ...event.data,
                  };
                }

                // Special event transformations
                if (eventType === "agent") {
                  if (eventName === "start") {
                    eventName = "agent:start";
                    status = "running";
                  } else if (eventName === "finished") {
                    if (event.data.status === "error") {
                      eventName = "agent:error";
                    } else {
                      eventName = "agent:success";
                    }
                  }

                  // Add to timeline events table
                  const timelineEventRecord = {
                    id: eventId,
                    history_id: id,
                    agent_id: valueObj._agentId || agentId,
                    event_type: eventType,
                    event_name: eventName,
                    start_time: startTime,
                    end_time: endTime,
                    status: status,
                    status_message: eventName === "agent:error" ? event.data?.error?.message : null,
                    level: event.level || "INFO",
                    version: event.version || null,
                    parent_event_id: event.parentEventId || null,
                    tags: null,
                    input: inputData,
                    output: event.data?.output ? { text: event.data.output } : null,
                    error: eventName === "agent:error" ? event.data?.error : null,
                    metadata: metadata,
                  };

                  const { error: timelineError } = await this.client
                    .from(timelineEventsTableName)
                    .upsert(timelineEventRecord, { onConflict: "id" });

                  if (timelineError) {
                    console.error(`Error adding timeline event ${eventId}:`, timelineError);
                  }
                } else if (eventType === "memory") {
                  // memory:saveMessage -> memory:write_start and memory:write_success
                  if (eventName === "memory:saveMessage") {
                    // First event: memory:write_start
                    const writeStartRecord = {
                      id: eventId,
                      history_id: id,
                      agent_id: valueObj._agentId || agentId,
                      event_type: eventType,
                      event_name: "memory:write_start",
                      start_time: startTime,
                      end_time: null,
                      status: "running",
                      status_message: event.statusMessage || null,
                      level: event.level || "INFO",
                      version: event.version || null,
                      parent_event_id: event.parentEventId || null,
                      tags: null,
                      input: inputData,
                      output: null,
                      error: null,
                      metadata: {
                        id: "memory",
                        agentId: event.affectedNodeId?.split("_").pop(),
                      },
                    };

                    await this.client
                      .from(timelineEventsTableName)
                      .upsert(writeStartRecord, { onConflict: "id" });

                    // Second event: memory:write_success
                    const writeSuccessRecord = {
                      id: this.generateId(),
                      history_id: id,
                      agent_id: valueObj._agentId || agentId,
                      event_type: eventType,
                      event_name: "memory:write_success",
                      start_time: endTime,
                      end_time: endTime,
                      status: "completed",
                      status_message: event.statusMessage || null,
                      level: event.level || "INFO",
                      version: event.version || null,
                      parent_event_id: eventId,
                      tags: null,
                      input: inputData,
                      output: event.data?.output || null,
                      error: event.error || null,
                      metadata: {
                        id: "memory",
                        agentId: event.affectedNodeId?.split("_").pop(),
                      },
                    };

                    await this.client
                      .from(timelineEventsTableName)
                      .upsert(writeSuccessRecord, { onConflict: "id" });
                  }
                  // memory:getMessages -> memory:read_start and memory:read_success
                  else if (eventName === "memory:getMessages") {
                    // First event: memory:read_start
                    const readStartRecord = {
                      id: eventId,
                      history_id: id,
                      agent_id: valueObj._agentId || agentId,
                      event_type: eventType,
                      event_name: "memory:read_start",
                      start_time: startTime,
                      end_time: null,
                      status: "running",
                      status_message: event.statusMessage || null,
                      level: event.level || "INFO",
                      version: event.version || null,
                      parent_event_id: event.parentEventId || null,
                      tags: null,
                      input: inputData,
                      output: null,
                      error: null,
                      metadata: {
                        id: "memory",
                        agentId: event.affectedNodeId?.split("_").pop(),
                      },
                    };

                    await this.client
                      .from(timelineEventsTableName)
                      .upsert(readStartRecord, { onConflict: "id" });

                    // Second event: memory:read_success
                    const readSuccessRecord = {
                      id: this.generateId(),
                      history_id: id,
                      agent_id: valueObj._agentId || agentId,
                      event_type: eventType,
                      event_name: "memory:read_success",
                      start_time: endTime,
                      end_time: endTime,
                      status: status,
                      status_message: event.statusMessage || null,
                      level: event.level || "INFO",
                      version: event.version || null,
                      parent_event_id: eventId,
                      tags: null,
                      input: inputData,
                      output: event.data?.output || null,
                      error: event.error || null,
                      metadata: {
                        id: "memory",
                        agentId: event.affectedNodeId?.split("_").pop(),
                      },
                    };

                    await this.client
                      .from(timelineEventsTableName)
                      .upsert(readSuccessRecord, { onConflict: "id" });
                  } else {
                    // Normal addition for other memory events
                    const memoryEventRecord = {
                      id: eventId,
                      history_id: id,
                      agent_id: valueObj._agentId || agentId,
                      event_type: eventType,
                      event_name: eventName,
                      start_time: startTime,
                      end_time: endTime,
                      status: status,
                      status_message: event.statusMessage || null,
                      level: event.level || "INFO",
                      version: event.version || null,
                      parent_event_id: event.parentEventId || null,
                      tags: null,
                      input: inputData,
                      output: event.output || null,
                      error: event.error || null,
                      metadata: metadata,
                    };

                    await this.client
                      .from(timelineEventsTableName)
                      .upsert(memoryEventRecord, { onConflict: "id" });
                  }
                } else if (eventType === "tool") {
                  if (eventName === "tool_working") {
                    // First event: tool:start
                    const toolStartRecord = {
                      id: eventId,
                      history_id: id,
                      agent_id: valueObj._agentId || agentId,
                      event_type: eventType,
                      event_name: "tool:start",
                      start_time: startTime,
                      end_time: null,
                      status: "running",
                      status_message: event.statusMessage || null,
                      level: event.level || "INFO",
                      version: event.version || null,
                      parent_event_id: event.parentEventId || null,
                      tags: null,
                      input: inputData,
                      output: null,
                      error: null,
                      metadata: {
                        id: event.affectedNodeId?.split("_").pop(),
                        agentId: event.data?.metadata?.sourceAgentId,
                        displayName: event.data?.metadata?.toolName,
                      },
                    };

                    await this.client
                      .from(timelineEventsTableName)
                      .upsert(toolStartRecord, { onConflict: "id" });

                    // Second event: tool:success
                    const toolSuccessRecord = {
                      id: this.generateId(),
                      history_id: id,
                      agent_id: valueObj._agentId || agentId,
                      event_type: eventType,
                      event_name: "tool:success",
                      start_time: endTime,
                      end_time: endTime,
                      status: "completed",
                      status_message: event.statusMessage || null,
                      level: event.level || "INFO",
                      version: event.version || null,
                      parent_event_id: eventId,
                      tags: null,
                      input: inputData,
                      output: event.data?.output || null,
                      error: event.error || null,
                      metadata: {
                        id: event.affectedNodeId?.split("_").pop(),
                        agentId: event.data?.metadata?.sourceAgentId,
                        displayName: event.data?.metadata?.toolName,
                      },
                    };

                    await this.client
                      .from(timelineEventsTableName)
                      .upsert(toolSuccessRecord, { onConflict: "id" });
                  }
                } else {
                  // Normal addition for other event types
                  const otherEventRecord = {
                    id: eventId,
                    history_id: id,
                    agent_id: valueObj._agentId || agentId,
                    event_type: eventType,
                    event_name: eventName,
                    start_time: startTime,
                    end_time: endTime,
                    status: status,
                    status_message: event.statusMessage || null,
                    level: event.level || "INFO",
                    version: event.version || null,
                    parent_event_id: event.parentEventId || null,
                    tags: null,
                    input: inputData,
                    output: event.output || null,
                    error: event.error || null,
                    metadata: {
                      id: eventType === "retriever" ? "retriever" : event.type,
                      agentId: event.affectedNodeId?.split("_").pop(),
                    },
                  };

                  await this.client
                    .from(timelineEventsTableName)
                    .upsert(otherEventRecord, { onConflict: "id" });
                }
              } catch (error) {
                console.error("Error processing event:", error);
                // Skip problematic event but continue migration
              }
            }
          }
        } catch (error) {
          console.error(`Error processing record with ID ${key}:`, error);
          // Skip problematic records and continue
        }
      }

      console.log(`Total ${migratedCount} records successfully migrated`);

      // Should we delete the backup after success?
      if (createBackup && deleteBackupAfterSuccess) {
        await this.client.from(oldTableBackup).delete().neq("key", ""); // Delete all backup data
        console.log("Unnecessary backup deleted");
      }

      return {
        success: true,
        migratedCount,
        backupCreated: createBackup && !deleteBackupAfterSuccess,
      };
    } catch (error) {
      console.error("Error occurred while migrating agent history data:", error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        backupCreated: options.createBackup,
      };
    }
  }
}
