import type {
  Memory,
  Conversation,
  CreateConversationInput,
  MessageFilterOptions,
  MemoryMessage,
} from "@voltagent/core";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

export interface SupabaseMemoryOptions {
  supabaseUrl: string;
  supabaseKey: string;
  tableName?: string; // Base table name, defaults to 'voltagent_memory'
}

export class SupabaseMemory implements Memory {
  private client: SupabaseClient;
  private baseTableName: string;

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
    // TODO: Consider adding an initializeDatabase method similar to LibSQLStorage
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

  async clearMessages(options: { userId: string; conversationId?: string }): Promise<void> {
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
    const record = {
      key: key,
      value: value, // Supabase handles JSONB
      agent_id: agentId,
    };

    const { error } = await this.client.from(this.historyTable).upsert(record, {
      onConflict: "key", // Specify the conflict target column
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
    // 1. Get the main history entry
    const { data: entryData, error: entryError } = await this.client
      .from(this.historyTable)
      .select("value, agent_id") // Need agent_id to fetch related items
      .eq("key", key)
      .maybeSingle();

    if (entryError) {
      console.error(`Error getting history entry ${key}:`, entryError);
      // Decide if null or error is better. Returning undefined for not found.
      return undefined;
    }

    if (!entryData) {
      return undefined;
    }

    const entry = entryData.value; // The main JSON value
    const agentId = entryData.agent_id;

    // Add agentId to the entry object if it's not already there from the stored value
    if (!entry._agentId) {
      entry._agentId = agentId;
    }

    // 2. Get related history events
    const { data: eventsData, error: eventsError } = await this.client
      .from(this.historyEventsTable)
      .select("value")
      .eq("history_id", key)
      .eq("agent_id", agentId);

    if (eventsError) {
      console.error(`Error getting history events for entry ${key}:`, eventsError);
      // Continue without events, or throw? Let's continue but log.
      entry.events = [];
    } else {
      // Transform events similar to LibSQLStorage
      entry.events = (eventsData || [])
        .map((row) => {
          const event = row.value;
          return {
            id: event.id,
            timestamp: event.timestamp,
            name: event.name,
            type: event.type,
            data: {
              ...event.metadata,
              _trackedEventId: event._trackedEventId,
            },
            updatedAt: event.updated_at,
          };
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
    // 1. Get all history entries for the agent
    const { data: entriesData, error: entriesError } = await this.client
      .from(this.historyTable)
      .select("key, value") // Select key and value
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
        const entry = entryRow.value;
        const key = entryRow.key;

        // Add agentId if missing
        if (!entry._agentId) {
          entry._agentId = agentId;
        }

        // 2. Get related history events for this entry
        const { data: eventsData, error: eventsError } = await this.client
          .from(this.historyEventsTable)
          .select("value")
          .eq("history_id", key)
          .eq("agent_id", agentId);

        if (eventsError) {
          console.error(`Error getting history events for entry ${key}:`, eventsError);
          entry.events = [];
        } else {
          entry.events = (eventsData || [])
            .map((row) => {
              const event = row.value;
              return {
                id: event.id,
                timestamp: event.timestamp,
                name: event.name,
                type: event.type,
                data: {
                  ...event.metadata,
                  _trackedEventId: event._trackedEventId,
                },
                updatedAt: event.updated_at,
              };
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
}
