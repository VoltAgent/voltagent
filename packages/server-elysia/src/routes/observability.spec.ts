import * as serverCore from "@voltagent/server-core";
import { Elysia } from "elysia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerObservabilityRoutes } from "./observability";

// Mock server-core handlers
vi.mock("@voltagent/server-core", async () => {
  const actual = await vi.importActual("@voltagent/server-core");
  return {
    ...actual,
    setupObservabilityHandler: vi.fn(),
    getTracesHandler: vi.fn(),
    getTraceByIdHandler: vi.fn(),
    getSpanByIdHandler: vi.fn(),
    getObservabilityStatusHandler: vi.fn(),
    getLogsByTraceIdHandler: vi.fn(),
    getLogsBySpanIdHandler: vi.fn(),
    queryLogsHandler: vi.fn(),
    getConversationMessagesHandler: vi.fn(),
    getConversationStepsHandler: vi.fn(),
    getWorkingMemoryHandler: vi.fn(),
    listMemoryConversationsHandler: vi.fn(),
    listMemoryUsersHandler: vi.fn(),
    OBSERVABILITY_ROUTES: actual.OBSERVABILITY_ROUTES,
    OBSERVABILITY_MEMORY_ROUTES: actual.OBSERVABILITY_MEMORY_ROUTES,
  };
});

describe("Observability Routes", () => {
  let app: Elysia;
  const mockDeps = {} as any;
  const mockLogger = {
    trace: vi.fn(),
    error: vi.fn(),
  } as any;

  beforeEach(() => {
    app = new Elysia();
    registerObservabilityRoutes(app, mockDeps, mockLogger);
    vi.clearAllMocks();
  });

  it("should setup observability", async () => {
    vi.mocked(serverCore.setupObservabilityHandler).mockResolvedValue({ success: true });

    const response = await app.handle(
      new Request("http://localhost/setup-observability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: "pk", secretKey: "sk" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(serverCore.setupObservabilityHandler).toHaveBeenCalledWith(
      { publicKey: "pk", secretKey: "sk" },
      mockDeps,
    );
  });

  it("should handle setup observability failure (missing keys)", async () => {
    vi.mocked(serverCore.setupObservabilityHandler).mockResolvedValue({
      success: false,
      error: "Missing keys",
    });

    const response = await app.handle(
      new Request("http://localhost/setup-observability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should get traces", async () => {
    vi.mocked(serverCore.getTracesHandler).mockResolvedValue({ success: true, traces: [] } as any);

    const response = await app.handle(
      new Request("http://localhost/observability/traces?agentId=agent1"),
    );

    expect(response.status).toBe(200);
    expect(serverCore.getTracesHandler).toHaveBeenCalledWith(mockDeps, { agentId: "agent1" });
  });

  it("should get trace by id", async () => {
    vi.mocked(serverCore.getTraceByIdHandler).mockResolvedValue({
      success: true,
      trace: {},
    } as any);

    const response = await app.handle(new Request("http://localhost/observability/traces/123"));

    expect(response.status).toBe(200);
    expect(serverCore.getTraceByIdHandler).toHaveBeenCalledWith("123", mockDeps);
  });

  it("should return 404 if trace not found", async () => {
    vi.mocked(serverCore.getTraceByIdHandler).mockResolvedValue({
      success: false,
      error: "Not found",
    });

    const response = await app.handle(new Request("http://localhost/observability/traces/123"));

    expect(response.status).toBe(404);
  });

  it("should get span by id", async () => {
    vi.mocked(serverCore.getSpanByIdHandler).mockResolvedValue({ success: true, span: {} } as any);

    const response = await app.handle(new Request("http://localhost/observability/spans/456"));

    expect(response.status).toBe(200);
    expect(serverCore.getSpanByIdHandler).toHaveBeenCalledWith("456", mockDeps);
  });

  it("should get observability status", async () => {
    vi.mocked(serverCore.getObservabilityStatusHandler).mockResolvedValue({
      success: true,
      configured: true,
    } as any);

    const response = await app.handle(new Request("http://localhost/observability/status"));

    expect(response.status).toBe(200);
    expect(serverCore.getObservabilityStatusHandler).toHaveBeenCalledWith(mockDeps);
  });

  it("should get logs by trace id", async () => {
    vi.mocked(serverCore.getLogsByTraceIdHandler).mockResolvedValue({
      success: true,
      logs: [],
    } as any);

    const response = await app.handle(
      new Request("http://localhost/observability/traces/123/logs"),
    );

    expect(response.status).toBe(200);
    expect(serverCore.getLogsByTraceIdHandler).toHaveBeenCalledWith("123", mockDeps);
  });

  it("should get logs by span id", async () => {
    vi.mocked(serverCore.getLogsBySpanIdHandler).mockResolvedValue({
      success: true,
      logs: [],
    } as any);

    const response = await app.handle(new Request("http://localhost/observability/spans/456/logs"));

    expect(response.status).toBe(200);
    expect(serverCore.getLogsBySpanIdHandler).toHaveBeenCalledWith("456", mockDeps);
  });

  it("should query logs", async () => {
    vi.mocked(serverCore.queryLogsHandler).mockResolvedValue({ success: true, logs: [] } as any);

    const response = await app.handle(
      new Request("http://localhost/observability/logs?level=error"),
    );

    expect(response.status).toBe(200);
    expect(serverCore.queryLogsHandler).toHaveBeenCalledWith({ level: "error" }, mockDeps);
  });

  it("should get conversation messages", async () => {
    vi.mocked(serverCore.getConversationMessagesHandler).mockResolvedValue({
      success: true,
      messages: [],
    } as any);

    const response = await app.handle(
      new Request("http://localhost/observability/memory/conversations/123/messages"),
    );

    expect(response.status).toBe(200);
    expect(serverCore.getConversationMessagesHandler).toHaveBeenCalledWith(
      mockDeps,
      "123",
      expect.objectContaining({
        agentId: undefined,
        limit: undefined,
        before: undefined,
        after: undefined,
        roles: undefined,
      }),
    );
  });

  it("should get conversation steps", async () => {
    vi.mocked(serverCore.getConversationStepsHandler).mockResolvedValue({
      success: true,
      steps: [],
    } as any);

    const response = await app.handle(
      new Request("http://localhost/observability/memory/conversations/123/steps"),
    );

    expect(response.status).toBe(200);
    expect(serverCore.getConversationStepsHandler).toHaveBeenCalledWith(
      mockDeps,
      "123",
      expect.objectContaining({
        agentId: undefined,
        limit: undefined,
        operationId: undefined,
      }),
    );
  });

  it("should get working memory", async () => {
    vi.mocked(serverCore.getWorkingMemoryHandler).mockResolvedValue({
      success: true,
      memory: {},
    } as any);

    const response = await app.handle(
      new Request(
        "http://localhost/observability/memory/working-memory?scope=conversation&agentId=agent1",
      ),
    );

    expect(response.status).toBe(200);
    expect(serverCore.getWorkingMemoryHandler).toHaveBeenCalledWith(
      mockDeps,
      expect.objectContaining({
        agentId: "agent1",
        scope: "conversation",
      }),
    );
  });

  it("should list memory conversations", async () => {
    vi.mocked(serverCore.listMemoryConversationsHandler).mockResolvedValue({
      success: true,
      conversations: [],
    } as any);

    const response = await app.handle(
      new Request("http://localhost/observability/memory/conversations?agentId=agent1"),
    );

    expect(response.status).toBe(200);
    expect(serverCore.listMemoryConversationsHandler).toHaveBeenCalledWith(
      mockDeps,
      expect.objectContaining({
        agentId: "agent1",
      }),
    );
  });

  it("should list memory users", async () => {
    vi.mocked(serverCore.listMemoryUsersHandler).mockResolvedValue({
      success: true,
      users: [],
    } as any);

    const response = await app.handle(new Request("http://localhost/observability/memory/users"));

    expect(response.status).toBe(200);
    expect(serverCore.listMemoryUsersHandler).toHaveBeenCalledWith(
      mockDeps,
      expect.objectContaining({
        agentId: undefined,
        limit: undefined,
        offset: undefined,
        search: undefined,
      }),
    );
  });
});
