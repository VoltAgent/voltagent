import { VoltAgentCoreAPI } from "./client";
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
} from "./types";
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
    this.history = await this.sdk.updateHistory(this.id, data);
    return this;
  }

  async end(options?: TraceEndOptions): Promise<void> {
    await this.sdk.endHistory(this.id, {
      output: options?.output ? { output: options.output } : undefined,
      status: options?.status || "completed",
      metadata: options?.metadata,
      usage: options?.usage,
    });
  }

  async addAgent(options: AgentOptions): Promise<AgentContext> {
    const agentEvent = await this.sdk.addEventToHistory(this.id, {
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
    const createdEvent = await this.sdk.addEventToHistory(this.id, event);
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
    const subAgentEvent = await this.sdk.addEventToHistory(this.traceId, {
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
    const toolEvent = await this.sdk.addEventToHistory(this.traceId, {
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
    const memoryEvent = await this.sdk.addEventToHistory(this.traceId, {
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
    const retrieverEvent = await this.sdk.addEventToHistory(this.traceId, {
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
    await this.sdk.addEventToHistory(this.traceId, {
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

    await this.sdk.addEventToHistory(this.traceId, {
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
    await this.sdk.addEventToHistory(this.traceId, {
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

    await this.sdk.addEventToHistory(this.traceId, {
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
    await this.sdk.addEventToHistory(this.traceId, {
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

    await this.sdk.addEventToHistory(this.traceId, {
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
    await this.sdk.addEventToHistory(this.traceId, {
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

    await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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
      await this.sdk.addEventToHistory(this.traceId, {
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

    // Auto flush özelliği
    if (options.autoFlush !== false) {
      const interval = options.flushInterval || 5000; // 5 saniye default
      this.autoFlushInterval = setInterval(() => {
        this.flush();
      }, interval);
    }
  }

  /**
   * Yeni bir trace oluşturur (History yaratır)
   */
  async trace(options: TraceOptions): Promise<TraceContext> {
    const historyData: CreateHistoryRequest = {
      agent_id: options.agentId,
      input: options.input,
      userId: options.userId,
      conversationId: options.conversationId,
      metadata: {
        name: options.name,
        agentId: options.agentId,
        ...options.metadata,
      },
      tags: options.tags,
      status: "working",
      startTime: new Date().toISOString(),
    };

    const history = await this.coreClient.addHistory(historyData);

    // Trace'i internal state'e kaydet
    this.traces.set(history.id, history);

    return new TraceContextImpl(history, this);
  }

  /**
   * Mevcut trace verisini döndürür
   */
  getTrace(traceId: string): History | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Internal method for updating history (used by context classes)
   */
  async updateHistory(historyId: string, data: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    const updatedHistory = await this.coreClient.updateHistory({
      id: historyId,
      ...data,
    });

    this.traces.set(historyId, updatedHistory);
    return updatedHistory;
  }

  /**
   * Internal method for ending history (used by context classes)
   */
  async endHistory(historyId: string, data?: Omit<UpdateHistoryRequest, "id">): Promise<History> {
    return this.updateHistory(historyId, {
      status: "completed",
      endTime: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Internal method for adding events to history (used by context classes)
   */
  async addEventToHistory(historyId: string, event: TimelineEventInput): Promise<Event> {
    const eventWithTraceId: TimelineEventCore = {
      id: randomUUID(),
      startTime: new Date().toISOString(),
      ...event,
      traceId: historyId,
    } as unknown as TimelineEventCore;

    return this.coreClient.addEvent({
      historyId,
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
   * Kuyrukta bekleyen tüm event'leri gönderir
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
   * SDK'yı kapat ve bekleyen event'leri gönder
   */
  async shutdown(): Promise<void> {
    if (this.autoFlushInterval) {
      clearInterval(this.autoFlushInterval);
    }

    await this.flush();
  }

  /**
   * Core client'a direkt erişim (advanced kullanım için)
   */
  get client(): VoltAgentCoreAPI {
    return this.coreClient;
  }
}
