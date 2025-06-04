import { VoltAgentCoreAPI } from ".";

// Mock global fetch
globalThis.fetch = jest.fn() as jest.Mock;

// Timer ve AbortController mock'ları
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalAbortController = globalThis.AbortController;

beforeEach(() => {
  // Mock API için gerekli mock'ları ayarla
  globalThis.setTimeout = jest.fn() as unknown as typeof globalThis.setTimeout;
  globalThis.clearTimeout = jest.fn() as unknown as typeof globalThis.clearTimeout;
  globalThis.AbortController = jest.fn(() => ({
    abort: jest.fn(),
    signal: {},
  })) as unknown as typeof AbortController;
});

afterEach(() => {
  // Test sonrası orijinal fonksiyonları geri yükle
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  globalThis.AbortController = originalAbortController;
});

describe("VoltAgentCoreAPI", () => {
  let client: VoltAgentCoreAPI;

  beforeEach(() => {
    jest.resetAllMocks();

    client = new VoltAgentCoreAPI({
      baseUrl: "https://api.example.com",
      publicKey: "test-public-key",
      secretKey: "test-secret-key",
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

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.addHistory({
        agent_id: "agent-123",
        userId: "user-123",
        status: "working",
        input: { query: "test query" },
        metadata: { source: "test" },
      });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.example.com/history",
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

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.updateHistory({
        id: "123",
        status: "completed",
        output: { result: "success" },
        endTime: "2023-01-01T01:00:00Z",
      });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.example.com/history/123",
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

      (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.addEvent({
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
