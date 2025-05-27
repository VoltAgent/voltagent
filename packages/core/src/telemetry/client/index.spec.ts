import {
  TelemetryServiceApiClient,
  type ExportAgentHistoryPayload,
  type ExportTimelineEventPayload,
  type AgentHistoryUpdatableFields,
} from "./index";
import type { VoltAgentExporterOptions } from "../exporter"; // Adjust path as necessary
import type { HistoryStep } from "../../agent/history"; // Adjust path as necessary

global.fetch = jest.fn();

const mockOptions: VoltAgentExporterOptions = {
  baseUrl: "http://localhost:8000/functions/v1",
  publicKey: "test-public-key",
  secretKey: "test-secret-key",
  fetch: global.fetch,
};

describe("TelemetryServiceApiClient", () => {
  let apiClient: TelemetryServiceApiClient;

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    apiClient = new TelemetryServiceApiClient(mockOptions);
  });

  describe("constructor", () => {
    it("should throw an error if fetch is not available and not provided", () => {
      const originalFetch = globalThis.fetch;
      //@ts-expect-error - Temporarily removing fetch to test error handling
      globalThis.fetch = undefined;
      try {
        expect(() => new TelemetryServiceApiClient({ ...mockOptions, fetch: undefined })).toThrow(
          "Fetch API is not available. Please provide a fetch implementation via VoltAgentExporterOptions.",
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("should use provided fetch implementation", async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "test-id" }),
      });
      const clientWithMockFetch = new TelemetryServiceApiClient({
        ...mockOptions,
        fetch: mockFetch,
      });
      await clientWithMockFetch.exportAgentHistory({
        agent_id: "test-agent",
        project_id: "test-project",
        history_id: "test-history",
        startTime: new Date().toISOString(),
        status: "completed",
        input: {},
      } as ExportAgentHistoryPayload);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("request", () => {
    it("should make a request with correct headers and body", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const client = apiClient as any;
      await client.request("POST", "/test", { data: "test" });

      expect(global.fetch).toHaveBeenCalledWith(`${mockOptions.baseUrl}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-public-key": mockOptions.publicKey,
          "x-secret-key": mockOptions.secretKey,
        },
        body: JSON.stringify({ data: "test" }),
      });
    });

    it("should throw an error if response is not ok", async () => {
      const errorResponse = { status: 500, statusText: "Internal Server Error" };
      const errorBody = { message: "Something went wrong" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        ...errorResponse,
        json: async () => errorBody,
        text: async () => JSON.stringify(errorBody),
      });

      const client = apiClient as any;

      await expect(client.request("POST", "/test-error", { data: "test" })).rejects.toThrow(
        `API request failed: ${errorResponse.status} ${errorResponse.statusText} - ${JSON.stringify(errorBody)}`,
      );
    });

    it("should handle non-JSON error response text", async () => {
      const errorResponse = { status: 500, statusText: "Internal Server Error" };
      const errorText = "Non-JSON error output";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        ...errorResponse,
        json: async () => {
          throw new Error("Not JSON");
        },
        text: async () => errorText,
      });

      const client = apiClient as any;

      await expect(client.request("POST", "/test-text-error", { data: "test" })).rejects.toThrow(
        `API request failed: ${errorResponse.status} ${errorResponse.statusText} - ${JSON.stringify(errorText)}`,
      );
    });

    it("should re-throw network or other errors", async () => {
      const networkError = new Error("Network failed");
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const client = apiClient as any;

      await expect(client.request("POST", "/test-network-error", { data: "test" })).rejects.toThrow(
        networkError,
      );
    });
  });

  describe("exportAgentHistory", () => {
    it('should call request with "POST /history" and the payload', async () => {
      const mockResult = { id: "new-id" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockResult });
      const historyData: ExportAgentHistoryPayload = {
        agent_id: "agent-1",
        project_id: "proj-1",
        history_id: "hist-1",
        startTime: new Date().toISOString(),
        status: "completed",
        input: { text: "hello" },
      };
      const result = await apiClient.exportAgentHistory(historyData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/history"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-public-key": mockOptions.publicKey,
            "x-secret-key": mockOptions.secretKey,
          }),
          body: expect.stringContaining('"id":"hist-1"'),
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("exportTimelineEvent", () => {
    it('should call request with "POST /history-events" and the payload', async () => {
      const mockResult = { id: "event-id-1" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockResult });
      const eventData: ExportTimelineEventPayload = {
        history_id: "hist-1",
        event_id: "evt-1",
        agent_id: "agent-1",
        event: {
          id: "evt-1",
          startTime: new Date().toISOString(),
          type: "agent",
          name: "agent:start",
          status: "running",
          level: "INFO",
          version: "1.0.0",
          traceId: "hist-1",
          input: { input: "test input" },
          metadata: {
            id: "evt-1",
            agentId: "agent-1",
          },
        },
      };
      const result = await apiClient.exportTimelineEvent(eventData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/history-events"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-public-key": mockOptions.publicKey,
            "x-secret-key": mockOptions.secretKey,
          }),
          body: expect.stringContaining('"id":"evt-1"'),
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("exportHistorySteps", () => {
    it('should call request with "PATCH /history/{id}" and the steps in metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const history_id = "hist-1";
      const steps: HistoryStep[] = [{ type: "text", content: "Step 1" }];
      await apiClient.exportHistorySteps(history_id, steps);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/history/${history_id}`),
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-public-key": mockOptions.publicKey,
            "x-secret-key": mockOptions.secretKey,
          }),
          body: expect.stringContaining('"steps"'),
        }),
      );
    });
  });

  describe("updateAgentHistory", () => {
    it('should call request with "PATCH /history/{id}" and the updates', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const history_id = "hist-1";
      const updates: AgentHistoryUpdatableFields = { output: "new output" };
      await apiClient.updateAgentHistory(history_id, updates);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/history/${history_id}`),
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-public-key": mockOptions.publicKey,
            "x-secret-key": mockOptions.secretKey,
          }),
          body: expect.stringContaining('"output"'),
        }),
      );
    });
  });
});
