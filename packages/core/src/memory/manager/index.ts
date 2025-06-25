import { devLogger } from "@voltagent/internal/dev";
import type { StepWithContent } from "../../agent/providers";
import type { BaseMessage } from "../../agent/providers/base/types";
import type { OperationContext } from "../../agent/types";
import { AgentEventEmitter } from "../../events";
import type {
  MemoryReadStartEvent,
  MemoryReadSuccessEvent,
  MemoryWriteErrorEvent,
  MemoryWriteStartEvent,
  MemoryWriteSuccessEvent,
  NewTimelineEvent,
} from "../../events/types";
import { NodeType, createNodeId } from "../../utils/node-utils";
import { BackgroundQueue } from "../../utils/queue/queue";
import { LibSQLStorage } from "../index";
import type { Memory, MemoryMessage, MemoryOptions } from "../types";

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
   * Background queue for memory operations
   */
  private backgroundQueue: BackgroundQueue;

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

    // Initialize background queue for memory operations
    this.backgroundQueue = new BackgroundQueue({
      maxConcurrency: 10,
      defaultTimeout: 30000, // 30 seconds timeout
      defaultRetries: 5, // 5 retries for memory operations
    });
  }

  /**
   * Create and publish a timeline event for memory operations using the queue
   *
   * @param context - Operation context with history entry info
   * @param event - Timeline event to publish
   */
  private publishTimelineEvent(context: OperationContext, event: NewTimelineEvent): void {
    const historyId = context.historyEntry.id;
    if (!historyId) return;

    // 🔴 FIX: Direct call to avoid double queueing - AgentEventEmitter has its own queue
    AgentEventEmitter.getInstance().publishTimelineEventAsync({
      agentId: this.resourceId,
      historyId: historyId,
      event: event,
    });
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

    // Publish the memory write start event (background)
    this.publishTimelineEvent(context, memoryWriteStartEvent);

    try {
      // Perform the operation
      const memoryMessage = convertToMemoryMessage(message, type);
      await this.memory.addMessage(memoryMessage, conversationId);

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

      // Publish the memory write success event (background)
      this.publishTimelineEvent(context, memoryWriteSuccessEvent);
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

      // Publish the memory write error event (background)
      this.publishTimelineEvent(context, memoryWriteErrorEvent);

      devLogger.error("Failed to save message:", error);
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
   * Prepare conversation context for message generation (CONTEXT-FIRST OPTIMIZED)
   * Ensures context is always loaded, optimizes non-critical operations in background
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

    if (contextLimit === 0) {
      return { messages: [], conversationId };
    }

    // Return empty context immediately if no memory/userId
    if (!this.memory || !userId) {
      return { messages: [], conversationId };
    }

    // 🎯 CRITICAL: Always load conversation context (conversation continuity is essential)
    let messages: BaseMessage[] = [];

    // Create memory read start event for new timeline
    const memoryReadStartEvent: MemoryReadStartEvent = {
      id: crypto.randomUUID(),
      name: "memory:read_start",
      type: "memory",
      startTime: new Date().toISOString(),
      status: "running",
      input: {
        userId,
        conversationId,
        contextLimit,
      },
      output: null,
      metadata: {
        displayName: "Memory",
        id: "memory",
        agentId: this.resourceId,
      },
      traceId: context.historyEntry.id,
    };

    // Publish the memory read start event (background)
    this.publishTimelineEvent(context, memoryReadStartEvent);

    try {
      // This MUST complete for proper conversation flow - no shortcuts
      const memoryMessages = await this.memory.getMessages({
        userId,
        conversationId,
        limit: contextLimit,
      });

      messages = memoryMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Create memory read success event for new timeline
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
          contextLimit,
        },
        output: {
          messagesCount: messages.length,
          contextLimit,
          conversationId,
        },
        metadata: {
          displayName: "Memory",
          id: "memory",
          agentId: this.resourceId,
        },
        traceId: context.historyEntry.id,
        parentEventId: memoryReadStartEvent.id,
      };

      // Publish the memory read success event (background)
      this.publishTimelineEvent(context, memoryReadSuccessEvent);

      devLogger.info("[Memory] Context loaded:", messages.length, "messages");
    } catch (error) {
      // Create memory read error event for new timeline
      const memoryReadErrorEvent = {
        id: crypto.randomUUID(),
        name: "memory:read_error",
        type: "memory",
        startTime: memoryReadStartEvent.startTime,
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
        parentEventId: memoryReadStartEvent.id,
      } as const;

      // Publish the memory read error event (background)
      this.publishTimelineEvent(context, memoryReadErrorEvent);

      devLogger.error("[Memory] Failed to load context:", error);
      // Continue with empty messages, but don't fail the operation
    }

    this.handleSequentialBackgroundOperations(context, input, userId, conversationId);

    return { messages, conversationId };
  }

  /**
   * Handle sequential background operations using the queue
   * Setup conversation and save input in a single atomic operation
   */
  private handleSequentialBackgroundOperations(
    context: OperationContext,
    input: string | BaseMessage[],
    userId: string,
    conversationId: string,
  ): void {
    if (!this.memory) return;

    // Single atomic operation combining conversation setup and input saving
    this.backgroundQueue.enqueue({
      id: `conversation-and-input-${conversationId}-${Date.now()}`,
      operation: async () => {
        try {
          // First ensure conversation exists
          await this.ensureConversationExists(userId, conversationId);

          // Then save current input
          await this.saveCurrentInput(context, input, userId, conversationId);
        } catch (error) {
          devLogger.error("Failed to setup conversation and save input:", error);
          throw error; // Re-throw to trigger retry mechanism
        }
      },
    });
  }

  /**
   * Ensure conversation exists (background task)
   */
  private async ensureConversationExists(userId: string, conversationId: string): Promise<void> {
    if (!this.memory) return;

    try {
      const existingConversation = await this.memory.getConversation(conversationId);
      if (!existingConversation) {
        await this.memory.createConversation({
          id: conversationId,
          resourceId: this.resourceId,
          userId: userId,
          title: `New Chat ${new Date().toISOString()}`,
          metadata: {},
        });
        devLogger.info("[Memory] Created new conversation", conversationId);
      } else {
        // Update conversation's updatedAt
        await this.memory.updateConversation(conversationId, {});
        devLogger.info(`[Memory] Updated conversation ${conversationId}`);
      }
    } catch (error) {
      devLogger.error("[Memory] Failed to ensure conversation exists:", error);
    }
  }

  /**
   * Save current input (background task)
   */
  private async saveCurrentInput(
    context: OperationContext,
    input: string | BaseMessage[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (!this.memory) return;

    try {
      // Handle input based on type
      if (typeof input === "string") {
        // The user message with content
        const userMessage: BaseMessage = {
          role: "user",
          content: input,
        };

        await this.saveMessage(context, userMessage, userId, conversationId, "text");
        devLogger.info("[Memory] Saved user message to conversation");
      } else if (Array.isArray(input)) {
        // If input is BaseMessage[], save all to memory
        for (const message of input) {
          await this.saveMessage(context, message, userId, conversationId, "text");
        }
        devLogger.info(`[Memory] Saved ${input.length} messages to conversation`);
      }
    } catch (error) {
      devLogger.error("[Memory] Failed to save current input:", error);
    }
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
        userId: entry.userId,
        conversationId: entry.conversationId,
      };

      // Save the main record (using addHistoryEntry and passing agentId)
      await this.memory.addHistoryEntry(entry.id, mainEntry, agentId);

      // Add steps if they exist
      if (entry.steps && entry.steps.length > 0) {
        await this.addStepsToHistoryEntry(agentId, entry.id, entry.steps);
      }
    } catch (error) {
      devLogger.error("Failed to store history entry:", error);
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
      devLogger.error("Failed to get history entry:", error);
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
      devLogger.error("Failed to get all history entries:", error);
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
      devLogger.error("Failed to update history entry:", error);
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
      devLogger.error("Failed to add steps to history entry:", error);
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
      devLogger.error("Failed to add timeline event to history entry:", error);
      return undefined;
    }
  }
}
