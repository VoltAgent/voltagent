import { VoltAgentCoreAPI } from "./index";

// Mock global fetch
globalThis.fetch = vi.fn() as unknown as typeof globalThis.fetch;

// Timer and AbortController mocks
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalAbortController = globalThis.AbortController;

beforeEach(() => {
  // Set up necessary mocks for Mock API
  globalThis.setTimeout = vi.fn() as unknown as typeof globalThis.setTimeout;
  globalThis.clearTimeout = vi.fn() as unknown as typeof globalThis.clearTimeout;
  globalThis.AbortController = vi.fn(() => ({
    abort: vi.fn(),
  })) as unknown as typeof globalThis.AbortController;
});

afterEach(() => {
  // Restore original functions after test
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  globalThis.AbortController = originalAbortController;
});

describe("VoltAgentCoreAPI", () => {
  let api: VoltAgentCoreAPI;

  beforeEach(() => {
    vi.resetAllMocks();
    api = new VoltAgentCoreAPI({
      baseUrl: "http://test-api",
      publicKey: "test-public-key",
      secretKey: "test-secret-key",
    });
  });

  describe("getAgent", () => {
    it("should fetch agent data successfully", async () => {
      const mockAgent = { id: "test-agent", name: "Test Agent" };
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgent,
      });

      const result = await api.getAgent("test-agent");

      expect(result).toEqual(mockAgent);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://test-api/agents/test-agent",
        expect.any(Object),
      );
    });

    it("should handle API errors", async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(api.getAgent("test-agent")).rejects.toThrow("Failed to fetch agent");
    });

    it("should handle network errors", async () => {
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error"),
      );

      await expect(api.getAgent("test-agent")).rejects.toThrow("Network error");
    });
  });

  describe("addHistory", () => {
    it("should create a new history", async () => {
      const mockResponse = {
        data: {
          id: "123",
          name: "Test History",
          projectId: "project-1",
          startTime: "2023-01-01T00:00:00Z",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        status: 200,
        message: "Success",
      };

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.addHistory({
        agent_id: "agent-123",
        userId: "user-123",
        status: "working",
        input: { query: "test query" },
        metadata: { source: "test" },
      });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://test-api/history",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-public-key": "test-public-key",
            "x-secret-key": "test-secret-key",
          }),
          body: JSON.stringify({
            agent_id: "agent-123",
            userId: "user-123",
            status: "working",
            input: { query: "test query" },
            metadata: { source: "test" },
          }),
        }),
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateHistory", () => {
    it("should update an existing history", async () => {
      const mockResponse = {
        data: {
          id: "123",
          name: "Updated History",
          projectId: "project-1",
          startTime: "2023-01-01T00:00:00Z",
          endTime: "2023-01-01T01:00:00Z",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T01:00:00Z",
        },
        status: 200,
        message: "Success",
      };

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateHistory({
        id: "123",
        status: "completed",
        output: { result: "success" },
        endTime: "2023-01-01T01:00:00Z",
      });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://test-api/history/123",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-public-key": "test-public-key",
            "x-secret-key": "test-secret-key",
          }),
          body: JSON.stringify({
            status: "completed",
            output: { result: "success" },
            endTime: "2023-01-01T01:00:00Z",
          }),
        }),
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe("addEvent", () => {
    it("should add an event to history", async () => {
      const mockResponse = {
        data: {
          id: "event-123",
          historyId: "history-123",
          name: "test:event",
          type: "tool",
          startTime: "2023-01-01T00:00:00Z",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        status: 200,
        message: "Success",
      };

      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.addEvent({
        historyId: "history-123",
        event: {
          id: "event-123",
          name: "tool:start",
          type: "tool",
          startTime: "2023-01-01T00:00:00Z",
          traceId: "history-123",
          metadata: {
            id: "event-metadata-123",
          },
        },
      });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });
});
