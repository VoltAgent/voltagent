import type { StepWithContent } from "../../agent/providers";
import type { BaseMessage } from "../../agent/providers/base/types";
import { AgentEventEmitter } from "../../events";
import { LibSQLStorage } from "../index";
import type { Memory, MemoryMessage, MemoryOptions } from "../types";
import { NodeType, createNodeId } from "../../utils/node-utils";
import type { OperationContext } from "../../agent/types";
import type {
  NewTimelineEvent,
  MemoryReadStartEvent,
  MemoryReadSuccessEvent,
  MemoryWriteStartEvent,
  MemoryWriteSuccessEvent,
  MemoryWriteErrorEvent,
} from "../../events/types";

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
   * Create and publish a timeline event for memory operations
   *
   * @param context - Operation context with history entry info
   * @param event - Timeline event to publish
   * @returns A promise that resolves when the event is published
   */
  private async publishTimelineEvent(
    context: OperationContext,
    event: NewTimelineEvent,
  ): Promise<void> {
    const historyId = context.historyEntry.id;
    if (!historyId) return;

    try {
      await AgentEventEmitter.getInstance().publishTimelineEvent({
        agentId: this.resourceId,
        historyId: historyId,
        event: event,
      });
    } catch (error) {
      console.error("[Memory] Failed to publish timeline event:", error);
    }
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

    // Create memory write start event for new timeline
    const memoryWriteStartEvent: MemoryWriteStartEvent = {
      id: crypto.randomUUID(),
      name: "memory:write_start",
      type: "memory",
      startTime: new Date().toISOString(),
      status: "running",
      input: {
        message,
        userId,
        conversationId,
        type,
      },
      output: null,
      metadata: {
        displayName: "Memory",
        id: "memory",
        agentId: this.resourceId,
      },
      traceId: context.historyEntry.id,
    };

    // Publish the memory write start event
    await this.publishTimelineEvent(context, memoryWriteStartEvent);

    try {
      // Perform the operation
      const memoryMessage = convertToMemoryMessage(message, type);
      await this.memory.addMessage(memoryMessage, userId, conversationId);

      // Create memory write success event for new timeline
      const memoryWriteSuccessEvent: MemoryWriteSuccessEvent = {
        id: crypto.randomUUID(),
        name: "memory:write_success",
        type: "memory",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: "completed",
        input: null,
        output: {
          success: true,
          messageId: memoryMessage.id,
          timestamp: memoryMessage.createdAt,
        },
        metadata: {
          displayName: "Memory",
          id: "memory",
          agentId: this.resourceId,
        },
        traceId: context.historyEntry.id,
        parentEventId: memoryWriteStartEvent.id,
      };

      // Publish the memory write success event
      await this.publishTimelineEvent(context, memoryWriteSuccessEvent);
    } catch (error) {
      // Create memory write error event for new timeline
      const memoryWriteErrorEvent: MemoryWriteErrorEvent = {
        id: crypto.randomUUID(),
        name: "memory:write_error",
        type: "memory",
        startTime: memoryWriteStartEvent.startTime,
        endTime: new Date().toISOString(),
        status: "error",
        level: "ERROR",
        input: null,
        output: null,
        statusMessage: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        metadata: {
          displayName: "Memory",
          id: "memory",
          agentId: this.resourceId,
        },
        traceId: context.historyEntry.id,
        parentEventId: memoryWriteStartEvent.id,
      };

      // Publish the memory write error event
      await this.publishTimelineEvent(context, memoryWriteErrorEvent);

      console.error("[Memory] Failed to save message:", error);
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
        // TODO: add new event for createConversation
        await this.memory.createConversation({
          id: conversationId,
          resourceId: this.resourceId,
          title: `New Chat ${new Date().toISOString()}`,
          metadata: {},
        });
      } else {
        // Update conversation's updatedAt
        await this.memory.updateConversation(conversationId, {});
      }

      // TODO: add new event for getMessages
      try {
        const memoryReadStartEvent: MemoryReadStartEvent = {
          id: crypto.randomUUID(),
          name: "memory:read_start",
          type: "memory",
          startTime: new Date().toISOString(),
          status: "running",
          input: {
            userId,
            conversationId,
          },
          output: null,
          metadata: {
            displayName: "Memory",
            id: "memory",
            agentId: this.resourceId,
          },
          traceId: context.historyEntry.id,
        };

        // Publish the memory read start event
        await this.publishTimelineEvent(context, memoryReadStartEvent);

        const memoryMessages = await this.memory.getMessages({
          userId,
          conversationId,
          limit: contextLimit,
        });

        messages = memoryMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const memoryReadSuccessEvent: MemoryReadSuccessEvent = {
          id: crypto.randomUUID(),
          name: "memory:read_success",
          type: "memory",
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          status: "completed",
          input: {
            userId,
            conversationId,
          },
          output: {
            messages,
          },
          metadata: {
            displayName: "Memory",
            id: "memory",
            agentId: this.resourceId,
          },
          traceId: context.historyEntry.id,
        };

        await this.publishTimelineEvent(context, memoryReadSuccessEvent);
      } catch (error) {
        // TODO: add new event for getMessages
        console.error("[Memory] Failed to get messages:", error);
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
        metadata: entry.metadata,
      };

      // Save the main record (using addHistoryEntry and passing agentId)
      await this.memory.addHistoryEntry(entry.id, mainEntry, agentId);

      // Add steps if they exist
      if (entry.steps && entry.steps.length > 0) {
        await this.addStepsToHistoryEntry(agentId, entry.id, entry.steps);
      }
    } catch (error) {
      console.error("[Memory] Failed to store history entry:", error);
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
      console.error("[Memory] Failed to get history entry:", error);
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
      console.error("[Memory] Failed to get all history entries:", error);
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
        events: updates.events !== undefined ? updates.events : entry.events,
        metadata: updates.metadata !== undefined ? updates.metadata : entry.metadata,
        _agentId: agentId, // Always preserve the agentId
      };

      // Save the main record to the database and pass agentId
      await this.memory.updateHistoryEntry(entryId, updatedMainEntry, agentId);

      // If there are step updates
      if (updates.steps) {
        // Update with all steps
        await this.addStepsToHistoryEntry(agentId, entryId, updates.steps);
      }

      // Return the updated record with all relationships
      return await this.getHistoryEntryById(agentId, entryId);
    } catch (error) {
      console.error("[Memory] Failed to update history entry:", error);
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
      console.error("[Memory] Failed to add steps to history entry:", error);
      return undefined;
    }
  }

  /**
   * Add a timeline event to a history entry
   * This method is part of the new immutable event system
   *
   * @param agentId - The ID of the agent
   * @param historyId - The ID of the history entry
   * @param eventId - The ID of the timeline event
   * @param event - The NewTimelineEvent object
   * @returns A promise that resolves to the updated entry or undefined
   */
  async addTimelineEvent(
    agentId: string,
    historyId: string,
    eventId: string,
    event: NewTimelineEvent,
  ): Promise<any | undefined> {
    if (!this.memory) return undefined;

    try {
      const entry = await this.memory.getHistoryEntry(historyId);
      if (!entry || entry._agentId !== agentId) return undefined;

      // Save the timeline event directly to the new table
      await this.memory.addTimelineEvent(eventId, event, historyId, agentId);

      return await this.getHistoryEntryById(agentId, historyId);
    } catch (error) {
      console.error("Memory: Failed to add timeline event to history entry:", error);
      return undefined;
    }
  }
}
