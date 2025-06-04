import { VoltAgentCoreAPI } from "../client";
import type {
  VoltAgentClientOptions,
  CreateHistoryRequest,
  UpdateHistoryRequest,
  UpdateEventRequest,
  History,
  TimelineEventCore,
  TimelineEventInput,
  Event,
  TraceOptions,
  TraceEndOptions,
  TraceContext,
  AgentOptions,
  AgentContext,
  AgentSuccessOptions,
  AgentErrorOptions,
  ToolOptions,
  ToolContext,
  ToolSuccessOptions,
  ToolErrorOptions,
  MemoryOptions,
  MemoryContext,
  MemorySuccessOptions,
  MemoryErrorOptions,
  RetrieverOptions,
  RetrieverContext,
  RetrieverSuccessOptions,
  RetrieverErrorOptions,
  EventContext,
} from "../types";
import { randomUUID } from "node:crypto";

class TraceContextImpl implements TraceContext {
  readonly id: string;
  readonly agentId: string;

  // @ts-expect-error - history is not used in this class
  private history: History;
  private sdk: VoltAgentObservabilitySDK;

  constructor(history: History, sdk: VoltAgentObservabilitySDK) {
    this.id = history.id;
    this.agentId = (history.metadata?.agentId as string) || "unknown";
    this.history = history;
    this.sdk = sdk;
  }

  async update(data: Partial<UpdateHistoryRequest>): Promise<TraceContext> {
    this.history = await this.sdk.updateTrace(this.id, data);
    return this;
  }

  async end(options?: TraceEndOptions): Promise<void> {
    await this.sdk.endTrace(this.id, {
      output: options?.output ? { output: options.output } : undefined,
      status: options?.status || "completed",
      metadata: options?.metadata,
      usage: options?.usage,
    });
  }

  async addAgent(options: AgentOptions): Promise<AgentContext> {
    const agentEvent = await this.sdk.addEventToTrace(this.id, {
      name: "agent:start",
      type: "agent",
      input: options.input ? { input: options.input } : { input: "" },
      status: "running",
      metadata: {
        displayName: options.name,
        id: options.name,
        agentId: this.agentId,
        instructions: options.instructions,
        ...options.metadata,
      },
    });

    return new AgentContextImpl(agentEvent, this.id, this.sdk);
  }

  async addEvent(event: TimelineEventInput): Promise<EventContext> {
    const createdEvent = await this.sdk.addEventToTrace(this.id, event);
    return new EventContextImpl(createdEvent, this.id, this.sdk);
  }
}

class AgentContextImpl implements AgentContext {
  readonly id: string;
  readonly traceId: string;
  readonly parentId?: string;

  private event: Event;
  private sdk: VoltAgentObservabilitySDK;
  // @ts-expect-error - originalMetadata is not used in this class
  private originalMetadata: Record<string, any>;

  constructor(event: Event, traceId: string, sdk: VoltAgentObservabilitySDK, parentId?: string) {
    this.id = event.id;
    this.traceId = traceId;
    this.parentId = parentId;
    this.event = event;
    this.sdk = sdk;
    this.originalMetadata = event.metadata || {};
  }

  async addAgent(options: AgentOptions): Promise<AgentContext> {
    const subAgentEvent = await this.sdk.addEventToTrace(this.traceId, {
      name: "agent:start",
      type: "agent",
      status: "running",
      input: options.input ? { input: options.input } : { input: "" },
      metadata: {
        displayName: options.name,
        id: options.name,
        agentId: (this.event.metadata?.id as string) || this.id,
        instructions: options.instructions,
        ...options.metadata,
      },
      parentEventId: this.id,
    });

    return new AgentContextImpl(subAgentEvent, this.traceId, this.sdk, this.id);
  }

  async addTool(options: ToolOptions): Promise<ToolContext> {
    const toolEvent = await this.sdk.addEventToTrace(this.traceId, {
      name: "tool:start",
      type: "tool",
      input: options.input || {},
      status: "running",
      metadata: {
        displayName: options.name,
        id: options.name,
        agentId: (this.event.metadata?.id as string) || this.id,
        ...options.metadata,
      },
      parentEventId: this.id,
    });

    return new ToolContextImpl(toolEvent, this.traceId, this.id, this.sdk);
  }

  async addMemory(options: MemoryOptions): Promise<MemoryContext> {
    const memoryEvent = await this.sdk.addEventToTrace(this.traceId, {
      name: "memory:write_start",
      type: "memory",
      input: options.input || {},
      status: "running",
      metadata: {
        displayName: options.name,
        id: options.name,
        agentId: (this.event.metadata?.id as string) || this.id,
        ...options.metadata,
      },
      parentEventId: this.id,
    });

    return new MemoryContextImpl(memoryEvent, this.traceId, this.id, this.sdk);
  }

  async addRetriever(options: RetrieverOptions): Promise<RetrieverContext> {
    const retrieverEvent = await this.sdk.addEventToTrace(this.traceId, {
      name: "retriever:start",
      type: "retriever",
      input: options.input || {},
      status: "running",
      metadata: {
        displayName: options.name,
        id: options.name,
        agentId: (this.event.metadata?.id as string) || this.id,
        ...options.metadata,
      },
      parentEventId: this.id,
    });

    return new RetrieverContextImpl(retrieverEvent, this.traceId, this.id, this.sdk);
  }

  async update(data: Omit<UpdateEventRequest, "id">): Promise<void> {
    await this.sdk.updateEvent(this.id, data);
  }

  async success(options?: AgentSuccessOptions): Promise<void> {
    await this.sdk.addEventToTrace(this.traceId, {
      name: "agent:success",
      type: "agent",
      status: "completed",
      output: options?.output || {},
      parentEventId: this.id,
      metadata: {
        ...(this.event.metadata || {}),
        ...options?.metadata,
        usage: options?.usage,
      } as any,
    });
  }

  async error(options: { statusMessage: Error | any } & AgentErrorOptions): Promise<void> {
    // Smart handling for Error objects vs other types
    let statusMessage = options.statusMessage;

    // If statusMessage is an Error object, convert to structured format
    if (options.statusMessage instanceof Error) {
      statusMessage = {
        message: options.statusMessage.message,
        stack: options.statusMessage.stack,
        name: options.statusMessage.name,
      };
    }

    await this.sdk.addEventToTrace(this.traceId, {
      name: "agent:error",
      type: "agent",
      status: "error",
      level: "ERROR",
      statusMessage: statusMessage,
      parentEventId: this.id,
      metadata: {
        ...(this.event.metadata || {}),
        ...options?.metadata,
      } as any,
    });
  }
}

class ToolContextImpl implements ToolContext {
  readonly id: string;
  readonly parentId: string;
  readonly traceId: string;

  private event: Event;
  private sdk: VoltAgentObservabilitySDK;
  private originalMetadata: Record<string, any>;

  constructor(event: Event, traceId: string, parentId: string, sdk: VoltAgentObservabilitySDK) {
    this.id = event.id;
    this.traceId = traceId;
    this.parentId = parentId;
    this.event = event;
    this.sdk = sdk;
    this.originalMetadata = event.metadata || {};
  }

  async update(data: Omit<UpdateEventRequest, "id">): Promise<void> {
    await this.sdk.updateEvent(this.id, data);
  }

  async success(options?: ToolSuccessOptions): Promise<void> {
    await this.sdk.addEventToTrace(this.traceId, {
      name: "tool:success",
      type: "tool",
      status: "completed",
      output: options?.output || {},
      parentEventId: this.id,
      metadata: {
        ...(this.event.metadata || {}),
        ...options?.metadata,
      } as any,
    });
  }

  async error(options: { statusMessage: Error | any } & ToolErrorOptions): Promise<void> {
    // Smart handling for Error objects vs other types
    let statusMessage = options.statusMessage;

    // If statusMessage is an Error object, convert to structured format
    if (options.statusMessage instanceof Error) {
      statusMessage = {
        message: options.statusMessage.message,
        stack: options.statusMessage.stack,
        name: options.statusMessage.name,
      };
    }

    await this.sdk.addEventToTrace(this.traceId, {
      name: "tool:error",
      type: "tool",
      status: "error",
      level: "ERROR",
      statusMessage: statusMessage,
      parentEventId: this.id,
      metadata: {
        ...this.originalMetadata,
        ...options?.metadata,
      } as any,
    });
  }
}

class MemoryContextImpl implements MemoryContext {
  readonly id: string;
  readonly parentId: string;
  readonly traceId: string;

  private event: Event;
  private sdk: VoltAgentObservabilitySDK;
  private originalMetadata: Record<string, any>;

  constructor(event: Event, traceId: string, parentId: string, sdk: VoltAgentObservabilitySDK) {
    this.id = event.id;
    this.traceId = traceId;
    this.parentId = parentId;
    this.event = event;
    this.sdk = sdk;
    this.originalMetadata = event.metadata || {};
  }

  async update(data: Omit<UpdateEventRequest, "id">): Promise<void> {
    await this.sdk.updateEvent(this.id, data);
  }

  async success(options?: MemorySuccessOptions): Promise<void> {
    await this.sdk.addEventToTrace(this.traceId, {
      name: "memory:write_success",
      type: "memory",
      status: "completed",
      output: options?.output || {},
      parentEventId: this.id,
      metadata: {
        ...(this.event.metadata || {}),
        ...options?.metadata,
      } as any,
    });
  }

  async error(options: { statusMessage: Error | any } & MemoryErrorOptions): Promise<void> {
    // Smart handling for Error objects vs other types
    let statusMessage = options.statusMessage;

    // If statusMessage is an Error object, convert to structured format
    if (options.statusMessage instanceof Error) {
      statusMessage = {
        message: options.statusMessage.message,
        stack: options.statusMessage.stack,
        name: options.statusMessage.name,
      };
    }

    await this.sdk.addEventToTrace(this.traceId, {
      name: "memory:write_error",
      type: "memory",
      status: "error",
      level: "ERROR",
      statusMessage: statusMessage,
      parentEventId: this.id,
      metadata: {
        ...this.originalMetadata,
        ...options?.metadata,
      } as any,
    });
  }
}

class RetrieverContextImpl implements RetrieverContext {
  readonly id: string;
  readonly parentId: string;
  readonly traceId: string;

  private event: Event;
  private sdk: VoltAgentObservabilitySDK;
  private originalMetadata: Record<string, any>;

  constructor(event: Event, traceId: string, parentId: string, sdk: VoltAgentObservabilitySDK) {
    this.id = event.id;
    this.traceId = traceId;
    this.parentId = parentId;
    this.event = event;
    this.sdk = sdk;
    this.originalMetadata = event.metadata || {};
  }

  async update(data: Omit<UpdateEventRequest, "id">): Promise<void> {
    await this.sdk.updateEvent(this.id, data);
  }

  async success(options?: RetrieverSuccessOptions): Promise<void> {
    await this.sdk.addEventToTrace(this.traceId, {
      name: "retriever:success",
      type: "retriever",
      status: "completed",
      output: options?.output || {},
      parentEventId: this.id,
      metadata: {
        ...(this.event.metadata || {}),
        ...options?.metadata,
      } as any,
    });
  }

  async error(options: { statusMessage: Error | any } & RetrieverErrorOptions): Promise<void> {
    // Smart handling for Error objects vs other types
    let statusMessage = options.statusMessage;

    // If statusMessage is an Error object, convert to structured format
    if (options.statusMessage instanceof Error) {
      statusMessage = {
        message: options.statusMessage.message,
        stack: options.statusMessage.stack,
        name: options.statusMessage.name,
      };
    }

    await this.sdk.addEventToTrace(this.traceId, {
      name: "retriever:error",
      type: "retriever",
      status: "error",
      level: "ERROR",
      statusMessage: statusMessage,
      parentEventId: this.id,
      metadata: {
        ...this.originalMetadata,
        ...options?.metadata,
      } as any,
    });
  }
}

class EventContextImpl implements EventContext {
  readonly id: string;
  readonly parentId?: string;
  readonly traceId: string;

  private event: Event;
  private sdk: VoltAgentObservabilitySDK;

  constructor(event: Event, traceId: string, sdk: VoltAgentObservabilitySDK, parentId?: string) {
    this.id = event.id;
    this.traceId = traceId;
    this.parentId = parentId;
    this.event = event;
    this.sdk = sdk;
  }

  async update(data: Omit<UpdateEventRequest, "id">): Promise<void> {
    await this.sdk.updateEvent(this.id, data);
  }

  async success(output?: any, metadata?: Record<string, any>): Promise<void> {
    // Type-safe success event creation based on event type
    const eventType = this.event.type;

    if (eventType === "agent") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "agent:success",
        type: "agent",
        status: "completed",
        output: output || {},
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...metadata,
        } as any,
      });
    } else if (eventType === "tool") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "tool:success",
        type: "tool",
        status: "completed",
        output: output || {},
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...metadata,
        } as any,
      });
    } else if (eventType === "memory") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "memory:write_success",
        type: "memory",
        status: "completed",
        output: output || {},
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...metadata,
        } as any,
      });
    } else if (eventType === "retriever") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "retriever:success",
        type: "retriever",
        status: "completed",
        output: output || {},
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...metadata,
        } as any,
      });
    }
  }

  async error(
    options: { statusMessage: Error | any } & (
      | AgentErrorOptions
      | ToolErrorOptions
      | MemoryErrorOptions
      | RetrieverErrorOptions
    ),
  ): Promise<void> {
    // Smart handling for Error objects vs other types
    let statusMessage = options.statusMessage;

    // If statusMessage is an Error object, convert to structured format
    if (options.statusMessage instanceof Error) {
      statusMessage = {
        message: options.statusMessage.message,
        stack: options.statusMessage.stack,
        name: options.statusMessage.name,
      };
    }

    // Type-safe error event creation based on event type
    const eventType = this.event.type;

    if (eventType === "agent") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "agent:error",
        type: "agent",
        status: "error",
        level: "ERROR",
        statusMessage: statusMessage,
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...options?.metadata,
        } as any,
      });
    } else if (eventType === "tool") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "tool:error",
        type: "tool",
        status: "error",
        level: "ERROR",
        statusMessage: statusMessage,
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...options?.metadata,
        } as any,
      });
    } else if (eventType === "memory") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "memory:write_error",
        type: "memory",
        status: "error",
        level: "ERROR",
        statusMessage: statusMessage,
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...options?.metadata,
        } as any,
      });
    } else if (eventType === "retriever") {
      await this.sdk.addEventToTrace(this.traceId, {
        name: "retriever:error",
        type: "retriever",
        status: "error",
        level: "ERROR",
        statusMessage: statusMessage,
        parentEventId: this.id,
        metadata: {
          ...(this.event.metadata || {}),
          ...options?.metadata,
        } as any,
      });
    }
  }
}

export class VoltAgentObservabilitySDK {
  private coreClient: VoltAgentCoreAPI;
  private eventQueue: Array<{ historyId: string; event: TimelineEventCore }> = [];
  private autoFlushInterval?: NodeJS.Timeout;
  private traces = new Map<string, History>(); // Trace state tracking

  constructor(
    options: VoltAgentClientOptions & {
      autoFlush?: boolean;
      flushInterval?: number;
    },
  ) {
    this.coreClient = new VoltAgentCoreAPI(options);

    // Auto flush feature
    if (options.autoFlush !== false) {
      const interval = options.flushInterval || 5000; // 5 seconds default
      this.autoFlushInterval = setInterval(() => {
        this.flush();
      }, interval);
    }
  }

  /**
   * Creates a new trace (creates History)
   */
  async trace(options: TraceOptions): Promise<TraceContext> {
    const historyData: CreateHistoryRequest = {
      id: options.id,
      agent_id: options.agentId,
      input: options.input,
      userId: options.userId,
      conversationId: options.conversationId,
      metadata: {
        agentId: options.agentId,
        ...options.metadata,
      },
      tags: options.tags,
      status: "working",
      startTime: options.startTime || new Date().toISOString(),
      completionStartTime: options.completionStartTime,
      version: options.version,
      level: options.level,
    };

    const history = await this.coreClient.addHistory(historyData);

    // Save trace to internal state
    this.traces.set(history.id, history);

    return new TraceContextImpl(history, this);
  }

  /**
   * Returns existing trace data
   */
  getTrace(traceId: string): History | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Internal method for updating trace (used by context classes)
   */
  async updateTrace(traceId: string, data: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    const updatedHistory = await this.coreClient.updateHistory({
      id: traceId,
      ...data,
    });

    this.traces.set(traceId, updatedHistory);
    return updatedHistory;
  }

  /**
   * Internal method for ending trace (used by context classes)
   */
  async endTrace(traceId: string, data?: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    return this.updateTrace(traceId, {
      status: "completed",
      endTime: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Internal method for adding events to trace (used by context classes)
   */
  async addEventToTrace(traceId: string, event: TimelineEventInput): Promise<Event> {
    const eventWithTraceId: TimelineEventCore = {
      id: randomUUID(),
      startTime: new Date().toISOString(),
      ...event,
      traceId: traceId,
    } as unknown as TimelineEventCore;

    return this.coreClient.addEvent({
      historyId: traceId,
      event: eventWithTraceId,
    });
  }

  /**
   * Internal method for updating events (used by context classes)
   */
  async updateEvent(eventId: string, data: Omit<UpdateEventRequest, "id">): Promise<Event> {
    return this.coreClient.updateEvent({
      id: eventId,
      ...data,
    });
  }

  /**
   * Sends all queued events
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const groupedEvents = this.eventQueue.reduce(
      (acc, item) => {
        if (!acc[item.historyId]) {
          acc[item.historyId] = [];
        }
        acc[item.historyId].push(item.event);
        return acc;
      },
      {} as Record<string, TimelineEventCore[]>,
    );

    const promises = Object.entries(groupedEvents).map(async ([historyId, events]) => {
      return Promise.all(events.map((event) => this.coreClient.addEvent({ historyId, event })));
    });

    await Promise.all(promises);
    this.eventQueue = [];
  }

  /**
   * Shuts down the SDK and sends pending events
   */
  async shutdown(): Promise<void> {
    if (this.autoFlushInterval) {
      clearInterval(this.autoFlushInterval);
    }

    await this.flush();
  }

  /**
   * Direct access to core client (for advanced usage)
   */
  get client(): VoltAgentCoreAPI {
    return this.coreClient;
  }
}
