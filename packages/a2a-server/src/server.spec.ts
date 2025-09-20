import { describe, expect, it, vi } from "vitest";

import type { Agent } from "@voltagent/core";
import { A2AServer } from "./server";
import { InMemoryTaskStore } from "./store";
import type {
  A2AServerConfig,
  JsonRpcRequest,
  JsonRpcResponse,
  MessageSendParams,
  TaskRecord,
} from "./types";

interface StubAgent {
  id?: string;
  name?: string;
  purpose: string;
  generateText: ReturnType<typeof vi.fn>;
  streamText: ReturnType<typeof vi.fn>;
}

function createMessage(params?: Partial<MessageSendParams["message"]>) {
  return {
    kind: "message" as const,
    role: "user" as const,
    messageId: params?.messageId ?? "msg-1",
    parts: params?.parts ?? [{ kind: "text" as const, text: "Hello" }],
    contextId: params?.contextId,
    taskId: params?.taskId,
    referenceTaskIds: params?.referenceTaskIds,
    extensions: params?.extensions,
    metadata: params?.metadata,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createServer(
  agent: StubAgent,
  taskStore: InMemoryTaskStore = new InMemoryTaskStore(),
  overrides: Partial<A2AServerConfig> = {},
) {
  const server = new A2AServer({
    name: overrides.name ?? "support-agent",
    version: overrides.version ?? "0.1.0",
    description: overrides.description,
    provider: overrides.provider,
    agents: overrides.agents,
    filterAgents: overrides.filterAgents,
    id: overrides.id,
  });
  server.initialize({
    agentRegistry: {
      getAgent(id: string) {
        return id === "support-agent" ? (agent as unknown as any) : undefined;
      },
      getAllAgents() {
        return [agent as unknown as any];
      },
    },
    taskStore,
  });
  return server;
}

function createSendRequest(messageOverrides?: Partial<MessageSendParams["message"]>) {
  const message = createMessage(messageOverrides);
  return {
    jsonrpc: "2.0" as const,
    id: "req-1",
    method: "message/send",
    params: {
      message,
    },
  } satisfies JsonRpcRequest<MessageSendParams>;
}

describe("A2AServer", () => {
  it("completes message/send requests and stores task history", async () => {
    const generateText = vi.fn().mockResolvedValue({
      text: "Hello back",
      finishReason: "stop",
      usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
    });
    const streamText = vi.fn();
    const agent: StubAgent = {
      id: "support-agent",
      purpose: "Answer support questions",
      generateText,
      streamText,
    };

    const taskStore = new InMemoryTaskStore();
    const server = createServer(agent, taskStore);

    const request = createSendRequest();
    const response = (await server.handleRequest(
      "support-agent",
      request,
    )) as JsonRpcResponse<TaskRecord>;

    expect(response.error).toBeUndefined();
    expect(response.result?.status.state).toBe("completed");
    expect(response.result?.history).toHaveLength(3);
    expect(response.result?.history?.filter((entry) => entry.role === "user")).toHaveLength(2);
    expect(response.result?.history?.at(-1)?.role).toBe("agent");
    expect(response.result?.metadata?.finishReason).toBe("stop");
    expect(response.result?.metadata?.usage).toEqual({
      promptTokens: 5,
      completionTokens: 3,
      totalTokens: 8,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    });
    expect(generateText).toHaveBeenCalledWith(
      "Hello",
      expect.objectContaining({
        conversationId: response.result?.contextId,
      }),
    );

    const task = await taskStore.load({
      agentId: "support-agent",
      taskId: response.result.id,
    });
    expect(task?.status.state).toBe("completed");
  });

  it("forwards A2A context and metadata into agent options", async () => {
    const generateText = vi
      .fn()
      .mockResolvedValue({ text: "Acknowledged", finishReason: "stop", usage: undefined });

    const agent: StubAgent = {
      id: "support-agent",
      purpose: "Answer support questions",
      generateText,
      streamText: vi.fn(),
    };

    const server = createServer(agent);

    const request = {
      jsonrpc: "2.0" as const,
      id: "ctx-req-1",
      method: "message/send",
      params: {
        metadata: { channel: "whatsapp" },
        message: createMessage({
          messageId: "msg-with-context",
          contextId: "conversation-123",
          metadata: { priority: "high" },
        }),
      },
    } satisfies JsonRpcRequest<MessageSendParams>;

    await server.handleRequest("support-agent", request, {
      userId: "user-777",
      sessionId: "session-abc",
      metadata: { tenant: "acme" },
    });

    expect(generateText).toHaveBeenCalledTimes(1);
    const [, options] = generateText.mock.calls[0];
    expect(options?.conversationId).toBe("conversation-123");
    expect(options?.userId).toBe("user-777");
    expect(options?.abortSignal).toBeInstanceOf(AbortSignal);
    expect(options?.context).toBeInstanceOf(Map);
    expect(Object.fromEntries(options?.context ?? [])).toEqual({
      sessionId: "session-abc",
      tenant: "acme",
      channel: "whatsapp",
      priority: "high",
    });
  });

  it("streams incremental updates and completes the task", async () => {
    const streamText = vi.fn().mockImplementation(async () => ({
      text: Promise.resolve("Final response"),
      finishReason: "stop",
      usage: { inputTokens: 2, outputTokens: 4, totalTokens: 6 },
      textStream: (async function* () {
        yield "Partial";
        yield " response";
      })(),
    }));

    const agent: StubAgent = {
      id: "support-agent",
      purpose: "Answer support questions",
      generateText: vi.fn(),
      streamText,
    };

    const server = createServer(agent);

    const request = {
      jsonrpc: "2.0" as const,
      id: "stream-1",
      method: "message/stream",
      params: {
        message: createMessage({ messageId: "msg-stream-1" }),
      },
    } satisfies JsonRpcRequest<MessageSendParams>;

    const response = await server.handleRequest("support-agent", request);
    expect("kind" in response && response.kind === "stream").toBe(true);

    const chunks: JsonRpcResponse<TaskRecord>[] = [];
    for await (const event of response.stream) {
      chunks.push(clone(event));
    }
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.map((entry) => entry.result?.status.state)).toContain("working");
    expect(chunks.at(-1)?.result?.status.state).toBe("completed");
    expect(chunks.at(-1)?.result?.history.at(-1)?.parts[0]?.text).toBe("Partial response");
    expect(chunks.at(-1)?.result?.metadata?.finishReason).toBe("stop");
    expect(chunks.at(-1)?.result?.metadata?.usage).toEqual({
      promptTokens: 2,
      completionTokens: 4,
      totalTokens: 6,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    });
  });

  it("propagates cancellation to streaming agents and returns a canceled task", async () => {
    const cancellationObserver = vi.fn();

    const streamText = vi
      .fn()
      .mockImplementation(async (_input: string, options?: { abortSignal?: AbortSignal }) => {
        const abortSignal = options?.abortSignal;

        const textPromise = new Promise<string>((resolve) => {
          if (!abortSignal) {
            resolve("final");
            return;
          }
          abortSignal.addEventListener(
            "abort",
            () => {
              cancellationObserver();
              resolve("");
            },
            { once: true },
          );
        });

        async function* textStream() {
          yield "Chunk";
          await new Promise((_, reject) => {
            if (!abortSignal) {
              reject(new Error("unexpected"));
              return;
            }
            if (abortSignal.aborted) {
              cancellationObserver();
              reject(new Error("aborted"));
              return;
            }
            const handler = () => {
              abortSignal.removeEventListener("abort", handler);
              cancellationObserver();
              reject(new Error("aborted"));
            };
            abortSignal.addEventListener("abort", handler, { once: true });
          });
          yield "Should not reach";
        }

        return {
          text: textPromise,
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          textStream: textStream(),
        };
      });

    const agent: StubAgent = {
      id: "support-agent",
      purpose: "Handle streamed cancellations",
      generateText: vi.fn(),
      streamText,
    };

    const taskStore = new InMemoryTaskStore();
    const server = createServer(agent, taskStore);

    const streamRequest = {
      jsonrpc: "2.0" as const,
      id: "stream-cancel",
      method: "message/stream",
      params: {
        message: createMessage({ messageId: "msg-cancel-1" }),
      },
    } satisfies JsonRpcRequest<MessageSendParams>;

    const streamResponse = await server.handleRequest("support-agent", streamRequest);
    expect("kind" in streamResponse && streamResponse.kind === "stream").toBe(true);

    const collected: JsonRpcResponse<TaskRecord>[] = [];
    let cancelled = false;

    for await (const event of streamResponse.stream) {
      const snapshot = clone(event);
      collected.push(snapshot);

      if (!cancelled) {
        const taskId = snapshot.result?.id;
        expect(taskId).toBeDefined();
        expect(snapshot.result?.status.state).toBe("working");

        const cancelResponse = (await server.handleRequest("support-agent", {
          jsonrpc: "2.0",
          id: "cancel-1",
          method: "tasks/cancel",
          params: { id: taskId },
        })) as JsonRpcResponse<TaskRecord>;

        expect(cancelResponse.error).toBeUndefined();
        expect(cancelResponse.result?.status.state).toBe("canceled");
        cancelled = true;
      }
    }

    expect(cancellationObserver).toHaveBeenCalled();
    const finalSnapshot = collected.at(-1);
    expect(finalSnapshot?.result?.status.state).toBe("canceled");

    const lastTaskId = finalSnapshot?.result?.id;
    const stored = lastTaskId
      ? await taskStore.load({ agentId: "support-agent", taskId: lastTaskId })
      : null;
    expect(stored?.status.state).toBe("canceled");
  });

  it("returns method not found for unknown requests", async () => {
    const agent: StubAgent = {
      id: "support-agent",
      purpose: "Fallback",
      generateText: vi.fn(),
      streamText: vi.fn(),
    };
    const server = createServer(agent);

    const response = await server.handleRequest("support-agent", {
      jsonrpc: "2.0",
      id: "unknown",
      method: "does/not/exist",
    });

    expect(response.error?.code).toBe(-32601);
  });

  it("allows exposing configured agents that are not in the registry", async () => {
    const defaultAgent: StubAgent = {
      id: "support-agent",
      purpose: "Default registry agent",
      generateText: vi.fn(),
      streamText: vi.fn(),
    };

    const configuredGenerate = vi.fn().mockResolvedValue({
      text: "Configured response",
      finishReason: "stop",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
    });
    const configuredAgent: StubAgent = {
      id: "shadow-agent",
      purpose: "Configured agent",
      generateText: configuredGenerate,
      streamText: vi.fn(),
    };

    const server = createServer(defaultAgent, new InMemoryTaskStore(), {
      agents: {
        "shadow-agent": configuredAgent as unknown as Agent,
      },
    });

    const response = (await server.handleRequest(
      "shadow-agent",
      createSendRequest(),
    )) as JsonRpcResponse<TaskRecord>;

    expect(response.error).toBeUndefined();
    expect(response.result?.history.at(-1)?.parts[0]?.text).toBe("Configured response");
    expect(configuredGenerate).toHaveBeenCalled();
  });

  it("applies the agent filter to combined agent lists", async () => {
    const defaultAgent: StubAgent = {
      id: "support-agent",
      purpose: "Default registry agent",
      generateText: vi.fn(),
      streamText: vi.fn(),
    };

    const configuredAgent: StubAgent = {
      id: "shadow-agent",
      purpose: "Configured agent",
      generateText: vi.fn().mockResolvedValue({ text: "ok" }),
      streamText: vi.fn(),
    };

    const server = createServer(defaultAgent, new InMemoryTaskStore(), {
      agents: {
        "shadow-agent": configuredAgent as unknown as Agent,
      },
      filterAgents: ({ items }) => items.filter((agent) => agent.id === "shadow-agent"),
    });

    expect(() => server.getAgentCard("support-agent")).toThrowError();
    expect(() => server.getAgentCard("shadow-agent")).not.toThrow();

    const response = (await server.handleRequest(
      "support-agent",
      createSendRequest(),
    )) as JsonRpcResponse<TaskRecord>;
    expect(response.error?.code).toBe(-32600);

    const allowed = (await server.handleRequest(
      "shadow-agent",
      createSendRequest(),
    )) as JsonRpcResponse<TaskRecord>;
    expect(allowed.error).toBeUndefined();
  });
});
