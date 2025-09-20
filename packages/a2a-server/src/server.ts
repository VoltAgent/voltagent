import { randomUUID } from "node:crypto";
import { type Agent, convertUsage } from "@voltagent/core";
import { buildAgentCard } from "./adapters/agent";
import { fromVoltAgentMessage, toVoltAgentMessage } from "./adapters/message";
import { createSuccessResponse, normalizeError } from "./protocol";
import { InMemoryTaskStore } from "./store";
import {
  appendMessage,
  createTaskRecord,
  ensureCancelable,
  transitionStatus,
  updateLastMessage,
} from "./tasks";
import type {
  A2AFilterFunction,
  A2AMessage,
  A2ARequestContext,
  A2AServerConfig,
  A2AServerDeps,
  AgentCard,
  JsonRpcHandlerResult,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcStream,
  MessageSendParams,
  MessageSendResult,
  TaskCancelResult,
  TaskIdParams,
  TaskQueryParams,
  TaskRecord,
} from "./types";
import { VoltA2AError } from "./types";

export class A2AServer {
  private deps?: Required<A2AServerDeps>;
  private readonly config: A2AServerConfig;
  private readonly activeOperations = new Map<string, AbortController>();
  private readonly configuredAgents = new Map<string, Agent>();
  private readonly agentFilter: A2AFilterFunction<Agent> | undefined;

  constructor(config: A2AServerConfig) {
    this.config = config;
    this.agentFilter = config.filterAgents;

    if (config.agents) {
      for (const [key, agent] of Object.entries(config.agents)) {
        const identifier = agent.id?.trim() || key;
        if (identifier.length > 0 && !this.configuredAgents.has(identifier)) {
          this.configuredAgents.set(identifier, agent);
        }
      }
    }
  }

  initialize(deps: A2AServerDeps): void {
    this.deps = {
      ...deps,
      taskStore: deps.taskStore ?? new InMemoryTaskStore(),
    } as Required<A2AServerDeps>;
  }

  getMetadata() {
    return {
      id: this.config.id,
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      provider: this.config.provider,
    };
  }

  getAgentCard(agentId: string, _context: A2ARequestContext = {}): AgentCard {
    const agent = this.resolveAgent(agentId, _context);
    const url = `/.well-known/${agentId}/agent-card.json`;

    return buildAgentCard(agent, {
      url,
      provider: this.config.provider,
      version: this.config.version,
      description: agent.purpose,
      capabilities: {
        streaming: true,
      },
    });
  }

  async handleRequest(
    agentId: string,
    request: JsonRpcRequest,
    context: A2ARequestContext = {},
  ): Promise<JsonRpcHandlerResult> {
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case "message/send":
          return createSuccessResponse(
            id,
            await this.handleMessageSend(agentId, request.params, context),
          );
        case "tasks/get":
          return createSuccessResponse(id, await this.handleTaskGet(agentId, request.params));
        case "tasks/cancel":
          return createSuccessResponse(id, await this.handleTaskCancel(agentId, request.params));
        case "message/stream":
          if (id === null) {
            throw VoltA2AError.invalidRequest(
              "JSON-RPC request 'id' must be provided for streaming calls",
            );
          }
          return this.handleMessageStream(agentId, id, request.params, context);
        default:
          throw VoltA2AError.methodNotFound(request.method);
      }
    } catch (error) {
      return normalizeError(id, error);
    }
  }

  private resolveAgent(agentId: string, context: A2ARequestContext = {}) {
    const agents = this.collectAgents(context);
    const agent = agents.get(agentId);
    if (!agent) {
      throw VoltA2AError.invalidRequest(`Agent '${agentId}' not found`);
    }
    return agent;
  }

  private collectAgents(context: A2ARequestContext = {}): Map<string, Agent> {
    const combined = new Map<string, Agent>();

    for (const [id, agent] of this.configuredAgents) {
      combined.set(id, agent);
    }

    const deps = this.ensureDeps();
    for (const agent of deps.agentRegistry.getAllAgents()) {
      const identifier = agent.id?.trim();
      if (!identifier) {
        continue;
      }
      if (!combined.has(identifier)) {
        combined.set(identifier, agent);
      }
    }

    const filteredAgents = this.agentFilter
      ? this.agentFilter({ items: Array.from(combined.values()), context })
      : Array.from(combined.values());

    const result = new Map<string, Agent>();
    for (const agent of filteredAgents) {
      const identifier = agent.id?.trim();
      if (!identifier) {
        continue;
      }
      if (!result.has(identifier)) {
        result.set(identifier, agent);
      }
    }

    return result;
  }

  private ensureDeps(): Required<A2AServerDeps> {
    if (!this.deps) {
      throw VoltA2AError.internal("A2AServer must be initialized before handling requests");
    }
    return this.deps;
  }

  private getTaskStore() {
    return this.ensureDeps().taskStore;
  }

  private makeOperationKey(agentId: string, taskId: string): string {
    return `${agentId}::${taskId}`;
  }

  private registerActiveOperation(
    agentId: string,
    taskId: string,
    controller: AbortController,
  ): void {
    this.activeOperations.set(this.makeOperationKey(agentId, taskId), controller);
  }

  private clearActiveOperation(agentId: string, taskId: string): void {
    this.activeOperations.delete(this.makeOperationKey(agentId, taskId));
  }

  private abortActiveOperation(agentId: string, taskId: string): void {
    const controller = this.activeOperations.get(this.makeOperationKey(agentId, taskId));
    controller?.abort();
  }

  private async handleMessageSend(
    agentId: string,
    rawParams: unknown,
    context: A2ARequestContext,
  ): Promise<MessageSendResult> {
    const params = this.validateMessageSendParams(rawParams);
    const agent = this.resolveAgent(agentId, context);
    const taskStore = this.getTaskStore();

    const message = params.message;
    const taskId = params.id ?? message.taskId ?? randomUUID();
    const contextId = message.contextId ?? params.sessionId ?? randomUUID();

    const normalizedMessage = {
      ...message,
      taskId,
      contextId,
    };

    let record =
      (await taskStore.load({ agentId, taskId })) ??
      createTaskRecord({
        message: normalizedMessage,
        metadata: params.metadata,
      });

    if (
      record.status.state === "completed" ||
      record.status.state === "failed" ||
      record.status.state === "canceled"
    ) {
      record = createTaskRecord({ message: normalizedMessage, metadata: params.metadata });
    } else {
      record = appendMessage(record, normalizedMessage);
      record = transitionStatus(record, { state: "working" });
    }

    await taskStore.save({ agentId, data: record });

    const voltMessage = toVoltAgentMessage(normalizedMessage);
    const abortController = new AbortController();
    this.registerActiveOperation(agentId, record.id, abortController);

    try {
      const agentOptions = this.buildAgentCallOptions({
        record,
        context,
        abortSignal: abortController.signal,
        metadata: params.metadata,
        messageMetadata: normalizedMessage.metadata,
      });

      const generation = await agent.generateText(voltMessage.content, agentOptions);

      if (abortController.signal.aborted) {
        return await this.ensureCanceledRecord(agentId, record);
      }

      const responseMessage = fromVoltAgentMessage({
        role: "assistant",
        content: generation.text ?? "",
      });
      responseMessage.taskId = record.id;
      responseMessage.contextId = record.contextId;

      record = appendMessage(record, responseMessage);
      record = transitionStatus(record, { state: "completed", message: responseMessage });

      if (generation.finishReason || generation.usage) {
        record = {
          ...record,
          metadata: {
            ...(record.metadata ?? {}),
            ...(generation.finishReason ? { finishReason: generation.finishReason } : {}),
            ...(generation.usage ? { usage: convertUsage(generation.usage) } : {}),
          },
        };
      }

      await taskStore.save({ agentId, data: record });

      return record;
    } catch (error) {
      if (abortController.signal.aborted) {
        return await this.ensureCanceledRecord(agentId, record);
      }
      throw error;
    } finally {
      this.clearActiveOperation(agentId, record.id);
    }
  }

  private async handleMessageStream(
    agentId: string,
    requestId: string | number,
    rawParams: unknown,
    context: A2ARequestContext,
  ): Promise<JsonRpcStream<TaskRecord>> {
    const params = this.validateMessageSendParams(rawParams);
    const agent = this.resolveAgent(agentId, context);
    const taskStore = this.getTaskStore();

    const message = params.message;
    const taskId = params.id ?? message.taskId ?? randomUUID();
    const contextId = message.contextId ?? params.sessionId ?? randomUUID();

    const normalizedMessage = {
      ...message,
      taskId,
      contextId,
    };

    let record =
      (await taskStore.load({ agentId, taskId })) ??
      createTaskRecord({
        message: normalizedMessage,
        metadata: params.metadata,
      });

    if (
      record.status.state === "completed" ||
      record.status.state === "failed" ||
      record.status.state === "canceled"
    ) {
      record = createTaskRecord({ message: normalizedMessage, metadata: params.metadata });
    } else {
      record = appendMessage(record, normalizedMessage);
    }

    record = transitionStatus(record, { state: "working" });
    await taskStore.save({ agentId, data: record });

    const abortController = new AbortController();
    this.registerActiveOperation(agentId, record.id, abortController);

    const stream = this.createMessageStreamGenerator({
      agentId,
      agent,
      context,
      initialRecord: record,
      normalizedMessage,
      abortController,
      requestId,
      metadata: params.metadata,
    });

    return {
      kind: "stream",
      id: requestId,
      stream,
    };
  }

  private createMessageStreamGenerator(params: {
    agent: Agent;
    agentId: string;
    context: A2ARequestContext;
    initialRecord: TaskRecord;
    normalizedMessage: A2AMessage;
    abortController: AbortController;
    requestId: string | number;
    metadata?: Record<string, unknown>;
  }): AsyncGenerator<JsonRpcResponse<TaskRecord>> {
    const {
      agent,
      agentId,
      context,
      initialRecord,
      normalizedMessage,
      requestId,
      abortController,
      metadata,
    } = params;
    const taskStore = this.getTaskStore();
    const server = this;

    return (async function* (): AsyncGenerator<JsonRpcResponse<TaskRecord>> {
      let record = initialRecord;
      yield createSuccessResponse(requestId, record);

      let responseMessage: A2AMessage | null = null;
      let aggregatedText = "";

      try {
        const voltMessage = toVoltAgentMessage(normalizedMessage);
        const agentOptions = server.buildAgentCallOptions({
          record,
          context,
          abortSignal: abortController.signal,
          metadata,
          messageMetadata: normalizedMessage.metadata,
        });

        const streamResult = await agent.streamText(voltMessage.content, agentOptions);

        responseMessage = fromVoltAgentMessage({
          role: "assistant",
          content: "",
        });
        responseMessage.taskId = record.id;
        responseMessage.contextId = record.contextId;

        record = appendMessage(record, responseMessage);
        record = transitionStatus(record, { state: "working", message: responseMessage });
        await taskStore.save({ agentId, data: record });
        yield createSuccessResponse(requestId, record);

        for await (const chunk of streamResult.textStream) {
          if (!chunk) {
            continue;
          }

          aggregatedText += chunk;
          responseMessage = {
            ...responseMessage,
            parts: [{ kind: "text", text: aggregatedText }],
          };
          record = updateLastMessage(record, responseMessage);
          record = transitionStatus(record, { state: "working", message: responseMessage });
          await taskStore.save({ agentId, data: record });
          yield createSuccessResponse(requestId, record);
        }

        let finalText = aggregatedText;
        if (!finalText) {
          try {
            finalText = await streamResult.text;
          } catch {
            finalText = "";
          }
        }

        if (!responseMessage) {
          responseMessage = fromVoltAgentMessage({
            role: "assistant",
            content: finalText,
          });
          responseMessage.taskId = record.id;
          responseMessage.contextId = record.contextId;
          record = appendMessage(record, responseMessage);
        }

        responseMessage = {
          ...responseMessage,
          parts: [{ kind: "text", text: finalText }],
        };
        record = updateLastMessage(record, responseMessage);
        record = transitionStatus(record, { state: "completed", message: responseMessage });

        const finishReason = await Promise.resolve(streamResult.finishReason).catch(
          () => undefined,
        );
        const usage = streamResult.usage
          ? await Promise.resolve(streamResult.usage).catch(() => undefined)
          : undefined;

        if (finishReason !== undefined || usage !== undefined) {
          record = {
            ...record,
            metadata: {
              ...(record.metadata ?? {}),
              ...(finishReason !== undefined ? { finishReason } : {}),
              ...(usage ? { usage: convertUsage(usage) } : {}),
            },
          };
        }

        await taskStore.save({ agentId, data: record });
        yield createSuccessResponse(requestId, record);
      } catch (error) {
        if (abortController.signal.aborted) {
          const canceledRecord = await server.ensureCanceledRecord(agentId, record);
          yield createSuccessResponse(requestId, canceledRecord);
          return;
        }

        const failureMessageText =
          error instanceof Error ? error.message : "Streaming failed with an unknown error";

        const failureMessage: A2AMessage = {
          kind: "message",
          role: "agent",
          messageId: randomUUID(),
          taskId: record.id,
          contextId: record.contextId,
          parts: [{ kind: "text", text: failureMessageText }],
        };

        if (responseMessage) {
          record = updateLastMessage(record, failureMessage);
        } else {
          record = appendMessage(record, failureMessage);
        }

        record = transitionStatus(record, { state: "failed", message: failureMessage });
        await taskStore.save({ agentId, data: record });

        yield normalizeError(requestId, error);
      } finally {
        // Ensure we remove any lingering cancellation markers for this task if they exist
        const cancellationSet = (taskStore as { activeCancellations?: Set<string> })
          .activeCancellations;
        cancellationSet?.delete(record.id);
        server.clearActiveOperation(agentId, record.id);
      }
    })();
  }

  private async handleTaskGet(agentId: string, rawParams: unknown): Promise<TaskRecord> {
    const params = this.validateTaskQueryParams(rawParams);
    const taskStore = this.getTaskStore();
    const record = await taskStore.load({ agentId, taskId: params.id });
    if (!record) {
      throw VoltA2AError.taskNotFound(params.id);
    }
    return record;
  }

  private async handleTaskCancel(agentId: string, rawParams: unknown): Promise<TaskCancelResult> {
    const params = this.validateTaskIdParams(rawParams);
    const taskStore = this.getTaskStore();
    const record = await taskStore.load({ agentId, taskId: params.id });

    if (!record) {
      throw VoltA2AError.taskNotFound(params.id);
    }

    ensureCancelable(record);

    const cancellationSet = (taskStore as { activeCancellations?: Set<string> })
      .activeCancellations;
    cancellationSet?.add(record.id);

    this.abortActiveOperation(agentId, record.id);

    const canceled = transitionStatus(record, {
      state: "canceled",
      message: {
        kind: "message",
        role: "agent",
        messageId: randomUUID(),
        taskId: record.id,
        contextId: record.contextId,
        parts: [{ kind: "text", text: "Task canceled" }],
      },
    });

    await taskStore.save({ agentId, data: canceled });
    cancellationSet?.delete(record.id);

    return canceled;
  }

  private async ensureCanceledRecord(agentId: string, seed: TaskRecord): Promise<TaskRecord> {
    const taskStore = this.getTaskStore();
    const existing = await taskStore.load({ agentId, taskId: seed.id });
    if (existing?.status.state === "canceled") {
      return existing;
    }

    const base = existing ?? seed;
    const lastMessage = base.history[base.history.length - 1];
    const hasCancellationMessage =
      lastMessage?.role === "agent" &&
      lastMessage.parts.length === 1 &&
      lastMessage.parts[0]?.kind === "text" &&
      lastMessage.parts[0]?.text === "Task canceled";

    const cancellationMessage: A2AMessage = hasCancellationMessage
      ? lastMessage
      : {
          kind: "message",
          role: "agent",
          messageId: randomUUID(),
          taskId: base.id,
          contextId: base.contextId,
          parts: [{ kind: "text", text: "Task canceled" }],
        };

    let nextRecord = base;
    if (!hasCancellationMessage) {
      nextRecord = appendMessage(nextRecord, cancellationMessage);
    }

    nextRecord = transitionStatus(nextRecord, {
      state: "canceled",
      message: cancellationMessage,
    });

    await taskStore.save({ agentId, data: nextRecord });
    return nextRecord;
  }

  private buildAgentCallOptions(params: {
    record: TaskRecord;
    context: A2ARequestContext;
    abortSignal: AbortSignal;
    metadata?: Record<string, unknown>;
    messageMetadata?: Record<string, unknown>;
  }) {
    const { record, context, abortSignal, metadata, messageMetadata } = params;

    const options: {
      conversationId: string;
      abortSignal: AbortSignal;
      userId?: string;
      context?: Map<string | symbol, unknown>;
    } = {
      conversationId: record.contextId,
      abortSignal,
    };

    if (context.userId) {
      options.userId = context.userId;
    }

    const contextEntries = new Map<string | symbol, unknown>();

    if (context.sessionId) {
      contextEntries.set("sessionId", context.sessionId);
    }

    const mergeMetadata = (source?: Record<string, unknown>) => {
      if (!source) {
        return;
      }
      for (const [key, value] of Object.entries(source)) {
        contextEntries.set(key, value);
      }
    };

    mergeMetadata(context.metadata);
    mergeMetadata(metadata);
    mergeMetadata(messageMetadata);

    if (contextEntries.size > 0) {
      options.context = contextEntries;
    }

    return options;
  }

  private validateMessageSendParams(payload: unknown): MessageSendParams {
    if (!payload || typeof payload !== "object") {
      throw VoltA2AError.invalidParams("Params must be an object");
    }
    const candidate = payload as Partial<MessageSendParams>;

    if (!candidate.message || typeof candidate.message !== "object") {
      throw VoltA2AError.invalidParams("'message' must be provided");
    }

    if (!Array.isArray(candidate.message.parts) || candidate.message.parts.length === 0) {
      throw VoltA2AError.invalidParams("Message must include at least one part");
    }

    const hasInvalidPart = candidate.message.parts.some(
      (part) => part.kind !== "text" || typeof part.text !== "string",
    );
    if (hasInvalidPart) {
      throw VoltA2AError.invalidParams("Only plain text message parts are supported");
    }

    return candidate as MessageSendParams;
  }

  private validateTaskQueryParams(payload: unknown): TaskQueryParams {
    if (!payload || typeof payload !== "object") {
      throw VoltA2AError.invalidParams("Params must be an object");
    }
    const candidate = payload as Partial<TaskQueryParams>;
    if (!candidate.id || typeof candidate.id !== "string") {
      throw VoltA2AError.invalidParams("Task id must be provided");
    }
    return candidate as TaskQueryParams;
  }

  private validateTaskIdParams(payload: unknown): TaskIdParams {
    if (!payload || typeof payload !== "object") {
      throw VoltA2AError.invalidParams("Params must be an object");
    }
    const candidate = payload as Partial<TaskIdParams>;
    if (!candidate.id || typeof candidate.id !== "string") {
      throw VoltA2AError.invalidParams("Task id must be provided");
    }
    return candidate as TaskIdParams;
  }
}
