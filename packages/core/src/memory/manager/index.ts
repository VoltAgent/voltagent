import type { StepWithContent } from "../../agent/providers";
import type { BaseMessage } from "../../agent/providers/base/types";
import { AgentEventEmitter } from "../../events";
import type { EventStatus, EventUpdater } from "../../events";
import { LibSQLStorage } from "../index";
import type { Memory, MemoryMessage, MemoryOptions } from "../types";
import { NodeType, createNodeId } from "../../utils/node-utils";
import type { OperationContext } from "../../agent/types";
import { StandardEventData } from "../../events/types";

/**
 * Convert BaseMessage to MemoryMessage for memory storage
 */
const convertToMemoryMessage = (
  message: BaseMessage,
  type: "text" | "tool-call" | "tool-result" = "text",
): MemoryMessage => {
  return {
    id: crypto.randomUUID(),
    role: message.role,
    content: message.content,
    type,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Manager class to handle all memory-related operations
 */
export class MemoryManager {
  /**
   * The memory storage instance
   */
  private memory: Memory;

  /**
   * Memory configuration options
   */
  private options: MemoryOptions;

  /**
   * The ID of the resource (agent) that owns this memory manager
   */
  private resourceId: string;

  /**
   * Creates a new MemoryManager
   */
  constructor(resourceId: string, memory?: Memory | false, options: MemoryOptions = {}) {
    this.resourceId = resourceId;

    // Use provided memory, disable memory if false, or create default
    if (memory === false) {
      // Memory explicitly disabled, leave it undefined
      this.memory = undefined as any;
    } else if (memory) {
      // Use provided memory instance
      this.memory = memory;
    } else {
      // Create default memory if not provided or disabled
      this.memory = new LibSQLStorage({
        url: "file:memory.db",
        ...options,
      });
    }

    this.options = options;
  }

  /**
   * Create a tracked event for a memory operation
   *
   * @param context - Operation context with history entry info
   * @param operationName - Name of the memory operation
   * @param status - Current status of the memory operation
   * @param initialData - Initial data for the event
   * @returns An event updater function
   */
  private async createMemoryEvent(
    context: OperationContext,
    operationName: string,
    status: EventStatus,
    initialData: Record<string, any> = {},
  ): Promise<EventUpdater | undefined> {
    const historyId = context.historyEntry.id;
    if (!historyId) return undefined;

    // Create a standard node ID
    const memoryNodeId = createNodeId(NodeType.MEMORY, this.resourceId);

    const eventData: Partial<StandardEventData> = {
      affectedNodeId: memoryNodeId,
      timestamp: new Date().toISOString(),
      status: status as any,
      input: initialData,
    };

    const eventEmitter = AgentEventEmitter.getInstance();
    const eventUpdater = await eventEmitter.createTrackedEvent({
      agentId: this.resourceId,
      historyId: historyId,
      name: `memory:${operationName}`,
      status: status,
      data: eventData,
      type: "memory",
    });

    // Store event updater in the context
    const trackerId = `memory-${operationName}-${Date.now()}`;
    context.eventUpdaters.set(trackerId, eventUpdater);

    return eventUpdater;
  }

  /**
   * Save a message to memory
   */
  async saveMessage(
    context: OperationContext,
    message: BaseMessage,
    userId?: string,
    conversationId?: string,
    type: "text" | "tool-call" | "tool-result" = "text",
  ): Promise<void> {
    if (!this.memory || !userId) return;

    // Create a tracked event for this operation
    const eventUpdater = await this.createMemoryEvent(context, "saveMessage", "working", {
      messageType: type,
      userId,
      conversationId,
      messageRole: message.role,
      messageContent: message.content ?? "No content",
    });

    if (!eventUpdater) return;

    try {
      // Perform the operation
      const memoryMessage = convertToMemoryMessage(message, type);
      await this.memory.addMessage(memoryMessage, userId, conversationId);

      // Update event with success
      eventUpdater({
        data: {
          status: "completed" as EventStatus,
          updatedAt: new Date().toISOString(),
          output: {
            success: true,
            messageId: memoryMessage.id,
            timestamp: memoryMessage.createdAt,
          },
        },
      });
    } catch (error) {
      // Update event with error
      eventUpdater({
        status: "error" as EventStatus,
        data: {
          status: "error" as EventStatus,
          updatedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
          errorMessage: error instanceof Error ? error.message : String(error),
          output: {
            success: false,
          },
        },
      });

      console.error(`[Memory] Failed to save message:`, error);
    }
  }

  /**
   * Get messages from memory
   */
  async getMessages(
    context: OperationContext,
    userId?: string,
    conversationId?: string,
    limit = 10,
  ): Promise<BaseMessage[]> {
    if (!this.memory || !userId || !conversationId) return [];

    // Create a tracked event for this operation
    const eventUpdater = await this.createMemoryEvent(context, "getMessages", "working", {
      userId,
      conversationId,
      limit,
    });

    if (!eventUpdater) return [];

    try {
      const memoryMessages = await this.memory.getMessages({
        userId,
        conversationId,
        limit,
      });

      // Let's properly define message IDs with type safety
      const firstId = memoryMessages.length > 0 ? (memoryMessages[0] as MemoryMessage).id : null;
      const lastId =
        memoryMessages.length > 0
          ? (memoryMessages[memoryMessages.length - 1] as MemoryMessage).id
          : null;

      // Update event with success
      eventUpdater({
        data: {
          status: "completed" as EventStatus,
          updatedAt: new Date().toISOString(),
          output: {
            count: memoryMessages.length,
            firstMessageId: firstId,
            lastMessageId: lastId,
          },
        },
      });

      return memoryMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    } catch (error) {
      // Update event with error
      eventUpdater({
        status: "error" as EventStatus,
        data: {
          status: "error" as EventStatus,
          updatedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
          errorMessage: error instanceof Error ? error.message : String(error),
          output: {
            success: false,
          },
        },
      });

      console.error(`[Memory] Failed to get messages:`, error);
      return [];
    }
  }

  /**
   * Create a step finish handler to save messages during generation
   */
  createStepFinishHandler(context: OperationContext, userId?: string, conversationId?: string) {
    // If there's no memory or userId, return an empty handler
    if (!this.memory || !userId) {
      return () => {};
    }

    return async (step: StepWithContent): Promise<void> => {
      // Directly save the step message as received from the provider
      const role = step.role || "assistant";
      const content =
        typeof step.content === "string" ? step.content : JSON.stringify(step.content);

      // Map step type to memory message type
      let messageType: "text" | "tool-call" | "tool-result" = "text";
      if (step.type === "tool_call") {
        messageType = "tool-call";
      } else if (step.type === "tool_result") {
        messageType = "tool-result";
      }

      await this.saveMessage(
        context,
        {
          role: role as "user" | "assistant" | "system" | "tool",
          content,
        },
        userId,
        conversationId,
        messageType,
      );
    };
  }

  /**
   * Prepare conversation context for message generation
   */
  async prepareConversationContext(
    context: OperationContext,
    input: string | BaseMessage[],
    userId?: string,
    conversationIdParam?: string,
    contextLimit = 10,
  ): Promise<{ messages: BaseMessage[]; conversationId: string }> {
    // Use the provided conversationId or generate a new one
    const conversationId = conversationIdParam || crypto.randomUUID();

    // Get history from memory if available
    let messages: BaseMessage[] = [];
    if (this.memory && userId) {
      // Check if conversation exists, if not create it
      const existingConversation = await this.memory.getConversation(conversationId);
      if (!existingConversation) {
        const eventUpdater = await this.createMemoryEvent(
          context,
          "createConversation",
          "working",
          {
            userId,
            conversationId,
          },
        );

        try {
          const conversation = await this.memory.createConversation({
            id: conversationId,
            resourceId: this.resourceId,
            title: `New Chat ${new Date().toISOString()}`,
            metadata: {},
          });

          eventUpdater?.({
            data: {
              status: "completed" as EventStatus,
              updatedAt: new Date().toISOString(),
              output: {
                title: conversation.title,
                id: conversation.id,
                metadata: conversation.metadata,
                createdAt: conversation.createdAt,
              },
            },
          });
        } catch (error) {
          eventUpdater?.({
            data: {
              status: "error" as EventStatus,
              updatedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
              errorMessage: error instanceof Error ? error.message : String(error),
              output: {
                success: false,
              },
            },
          });
        }
      } else {
        // Update conversation's updatedAt
        await this.memory.updateConversation(conversationId, {});
      }

      const eventUpdater = await this.createMemoryEvent(context, "getMessages", "working", {
        userId,
        conversationId,
      });

      try {
        const memoryMessages = await this.memory.getMessages({
          userId,
          conversationId,
          limit: contextLimit,
        });

        messages = memoryMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        eventUpdater?.({
          data: {
            status: "completed" as EventStatus,
            updatedAt: new Date().toISOString(),
            output: {
              messages,
            },
          },
        });
      } catch (error) {
        eventUpdater?.({
          data: {
            status: "error" as EventStatus,
            updatedAt: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
            errorMessage: error instanceof Error ? error.message : String(error),
            output: {
              success: false,
            },
          },
        });
      }
    }

    // Handle input based on type
    if (typeof input === "string") {
      // The user message with content
      const userMessage: BaseMessage = {
        role: "user",
        content: input,
      };

      // Save the user message to memory if available
      if (this.memory && userId) {
        await this.saveMessage(context, userMessage, userId, conversationId, "text");
      }

      // Don't add the user message here, it will be handled by the agent
    } else if (Array.isArray(input)) {
      // If input is BaseMessage[], save all to memory
      if (this.memory && userId) {
        for (const message of input) {
          await this.saveMessage(context, message, userId, conversationId, "text");
        }
      }
    }

    return { messages, conversationId };
  }

  /**
   * Get the memory instance
   */
  getMemory(): Memory | undefined {
    return this.memory;
  }

  /**
   * Get the memory options
   */
  getOptions(): MemoryOptions {
    return { ...this.options };
  }

  /**
   * Get memory state for display in UI
   */
  getMemoryState(): Record<string, any> {
    // Create a standard node ID
    const memoryNodeId = createNodeId(NodeType.MEMORY, this.resourceId);

    if (!this.memory) {
      return {
        type: "NoMemory",
        resourceId: this.resourceId,
        options: this.options || {},
        available: false,
        status: "idle",
        node_id: memoryNodeId,
      };
    }

    const memoryObject = {
      type: this.memory?.constructor.name || "NoMemory",
      resourceId: this.resourceId,
      options: this.getOptions(),
      available: !!this.memory,
      status: "idle", // Default to idle since we're only updating status during operations
      node_id: memoryNodeId,
    };

    return memoryObject;
  }

  /**
   * Store a history entry in memory storage
   *
   * @param agentId - The ID of the agent
   * @param entry - The history entry to store
   * @returns A promise that resolves when the entry is stored
   */
  async storeHistoryEntry(agentId: string, entry: any): Promise<void> {
    if (!this.memory) return;

    try {
      // Create the main history record (without events and steps)
      const mainEntry = {
        id: entry.id,
        _agentId: agentId,
        timestamp: entry.timestamp,
        status: entry.status,
        input: entry.input,
        output: entry.output,
        usage: entry.usage,
      };

      // Save the main record (using addHistoryEntry and passing agentId)
      await this.memory.addHistoryEntry(entry.id, mainEntry, agentId);

      // Add events if they exist
      if (entry.events && entry.events.length > 0) {
        for (const event of entry.events) {
          await this.addEventToHistoryEntry(agentId, entry.id, event);
        }
      }

      // Add steps if they exist
      if (entry.steps && entry.steps.length > 0) {
        await this.addStepsToHistoryEntry(agentId, entry.id, entry.steps);
      }
    } catch (error) {
      console.error(`[Memory] Failed to store history entry:`, error);
    }
  }

  /**
   * Get a history entry by ID with related events and steps
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to retrieve
   * @returns A promise that resolves to the entry or undefined
   */
  async getHistoryEntryById(agentId: string, entryId: string): Promise<any | undefined> {
    if (!this.memory) return undefined;

    try {
      // Get the main record
      const entry = await this.memory.getHistoryEntry(entryId);

      // Only return if it belongs to this agent
      if (entry && entry._agentId === agentId) {
        return entry;
      }
      return undefined;
    } catch (error) {
      console.error(`[Memory] Failed to get history entry:`, error);
      return undefined;
    }
  }

  /**
   * Get all history entries for an agent
   *
   * @param agentId - The ID of the agent
   * @returns A promise that resolves to an array of entries
   */
  async getAllHistoryEntries(agentId: string): Promise<any[]> {
    if (!this.memory) return [];

    try {
      // Get history records directly by agent ID (now includes events and steps)
      const agentEntries = await this.memory.getAllHistoryEntriesByAgent(agentId);
      return agentEntries;
    } catch (error) {
      console.error(`[Memory] Failed to get all history entries:`, error);
      return [];
    }
  }

  /**
   * Update a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to update
   * @param updates - Partial entry with fields to update
   * @returns A promise that resolves to the updated entry or undefined
   */
  async updateHistoryEntry(
    agentId: string,
    entryId: string,
    updates: any,
  ): Promise<any | undefined> {
    if (!this.memory) return undefined;

    try {
      // Get the main record
      const entry = await this.memory.getHistoryEntry(entryId);
      if (!entry || entry._agentId !== agentId) return undefined;

      // Update the main record (only update the main fields)
      const updatedMainEntry = {
        ...entry,
        status: updates.status !== undefined ? updates.status : entry.status,
        output: updates.output !== undefined ? updates.output : entry.output,
        usage: updates.usage !== undefined ? updates.usage : entry.usage,
        _agentId: agentId, // Always preserve the agentId
      };

      // Save the main record to the database and pass agentId
      await this.memory.updateHistoryEntry(entryId, updatedMainEntry, agentId);

      // If there are event updates
      if (updates.events && Array.isArray(updates.events)) {
        for (const event of updates.events) {
          if (event.id) {
            // If it has an ID, update it
            const existingEvent = entry.events.find((e: any) => e.id === event.id);
            if (existingEvent) {
              // Update the event
              await this.updateEventInHistoryEntry(agentId, entryId, event.id, event);
            } else {
              // Event not found, create a new one
              await this.addEventToHistoryEntry(agentId, entryId, event);
            }
          } else {
            // If it doesn't have an ID, create a new event
            await this.addEventToHistoryEntry(agentId, entryId, event);
          }
        }
      }

      // If there are step updates
      if (updates.steps) {
        // Update with all steps
        await this.addStepsToHistoryEntry(agentId, entryId, updates.steps);
      }

      // Return the updated record with all relationships
      return await this.getHistoryEntryById(agentId, entryId);
    } catch (error) {
      console.error(`[Memory] Failed to update history entry:`, error);
      return undefined;
    }
  }

  /**
   * Update an existing event in a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the history entry
   * @param eventId - The ID of the event to update
   * @param event - Updated event data
   * @returns A promise that resolves when the update is complete
   */
  async updateEventInHistoryEntry(
    agentId: string,
    entryId: string,
    eventId: string,
    event: any,
  ): Promise<any | undefined> {
    if (!this.memory) return undefined;

    try {
      // Get the event record
      const existingEvent = await this.memory.getHistoryEvent(eventId);
      if (
        !existingEvent ||
        existingEvent._agentId !== agentId ||
        existingEvent.history_id !== entryId
      ) {
        return undefined;
      }

      // Prepare the updated event data - use camelCase
      const updatedEvent = {
        ...existingEvent,
        name: event.name || existingEvent.name,
        type: event.type || existingEvent.type,
        affectedNodeId: event.affectedNodeId || existingEvent.affectedNodeId, // use camelCase
        _trackedEventId: event.data?._trackedEventId || existingEvent._trackedEventId,
        metadata: {
          ...(existingEvent.metadata || {}),
          ...(event.data || {}),
        },
        updated_at: new Date(),
      };

      // Save the updated event (using updateHistoryEvent and passing agentId)
      await this.memory.updateHistoryEvent(eventId, updatedEvent, entryId, agentId);

      return updatedEvent;
    } catch (error) {
      console.error(`[Memory] Failed to update event in history entry:`, error);
      return undefined;
    }
  }

  /**
   * Add steps to a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to update
   * @param steps - Steps to add
   * @returns A promise that resolves to the updated entry or undefined
   */
  async addStepsToHistoryEntry(
    agentId: string,
    entryId: string,
    steps: any[],
  ): Promise<any | undefined> {
    if (!this.memory) return undefined;

    try {
      // Check the main record
      const entry = await this.memory.getHistoryEntry(entryId);
      if (!entry || entry._agentId !== agentId) return undefined;

      // Add each step as a separate record
      for (const step of steps) {
        const stepId = crypto.randomUUID
          ? crypto.randomUUID()
          : (Math.random() * 10000000000).toString();

        // Prepare the step data
        const stepData = {
          id: stepId,
          history_id: entryId,
          _agentId: agentId,
          type: step.type,
          name: step.name,
          content: step.content,
          arguments: step.arguments,
        };

        // Save with addHistoryStep and pass agentId
        await this.memory.addHistoryStep(stepId, stepData, entryId, agentId);
      }

      // Return the updated record with all relationships
      return await this.getHistoryEntryById(agentId, entryId);
    } catch (error) {
      console.error(`[Memory] Failed to add steps to history entry:`, error);
      return undefined;
    }
  }

  /**
   * Add an event to a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to update
   * @param event - Timeline event to add
   * @returns A promise that resolves to the updated entry or undefined
   */
  async addEventToHistoryEntry(
    agentId: string,
    entryId: string,
    event: any,
  ): Promise<any | undefined> {
    if (!this.memory) return undefined;

    try {
      const entry = await this.memory.getHistoryEntry(entryId);
      if (!entry || entry._agentId !== agentId) return undefined;

      // Prepare the event data - use camelCase
      const eventData = {
        id: event.id,
        history_id: entryId,
        _agentId: agentId,
        timestamp: event.timestamp || new Date(),
        name: event.name,
        type: event.type,
        affectedNodeId: event.data.affectedNodeId,
        _trackedEventId: event.data?._trackedEventId,
        metadata: event.data || {},
        updated_at: event.updatedAt || new Date(),
      };

      // Save the event and pass agentId
      await this.memory.addHistoryEvent(event.id, eventData, entryId, agentId);

      return await this.getHistoryEntryById(agentId, entryId);
    } catch (error) {
      console.error(`[Memory] Failed to add event to history entry:`, error);
      return undefined;
    }
  }
}
