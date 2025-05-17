import {
  TelemetryServiceApiClient,
  type ExportAgentHistoryPayload,
  type ExportTimelineEventPayload,
  type AgentHistoryUpdatableFields,
  type TimelineEventUpdatableFields,
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
      const mockFetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const clientWithMockFetch = new TelemetryServiceApiClient({
        ...mockOptions,
        fetch: mockFetch,
      });
      await clientWithMockFetch.exportAgentHistory({} as ExportAgentHistoryPayload); // Trigger a call
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("_callEdgeFunction", () => {
    it("should make a POST request with correct headers and body", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      const functionName = "test-function";
      const payload = { data: "test" };
      const client = apiClient as any;
      await client._callEdgeFunction(functionName, payload);

      expect(global.fetch).toHaveBeenCalledWith(`${mockOptions.baseUrl}/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: mockOptions.publicKey,
          clientSecretKey: mockOptions.secretKey,
          payload,
        }),
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
      const functionName = "test-error-function";
      const payload = { data: "test" };
      const client = apiClient as any;

      await expect(client._callEdgeFunction(functionName, payload)).rejects.toThrow(
        `Failed to call VoltAgentExporter Function ${functionName}: ${errorResponse.status} ${errorResponse.statusText} - ${JSON.stringify(errorBody)}`,
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
      const functionName = "test-text-error-function";
      const payload = { data: "test" };
      const client = apiClient as any;

      await expect(client._callEdgeFunction(functionName, payload)).rejects.toThrow(
        `Failed to call VoltAgentExporter Function ${functionName}: ${errorResponse.status} ${errorResponse.statusText} - ${JSON.stringify(errorText)}`,
      );
    });

    it("should re-throw network or other errors", async () => {
      const networkError = new Error("Network failed");
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);
      const functionName = "test-network-error";
      const payload = { data: "test" };
      const client = apiClient as any;

      await expect(client._callEdgeFunction(functionName, payload)).rejects.toThrow(networkError);
    });
  });

  describe("exportAgentHistory", () => {
    it('should call _callEdgeFunction with "export-agent-history" and the payload', async () => {
      const mockResult = { historyEntryId: "new-id" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockResult });
      const historyData: ExportAgentHistoryPayload = {
        agent_id: "agent-1",
        project_id: "proj-1",
        history_id: "hist-1",
        timestamp: new Date().toISOString(),
        type: "agent_run",
        status: "completed",
        input: { text: "hello" },
      };
      const result = await apiClient.exportAgentHistory(historyData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/export-agent-history"),
        expect.objectContaining({
          body: JSON.stringify({
            publicKey: mockOptions.publicKey,
            clientSecretKey: mockOptions.secretKey,
            payload: historyData,
          }),
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("exportTimelineEvent", () => {
    it('should call _callEdgeFunction with "export-timeline-event" and the payload', async () => {
      const mockResult = { timelineEventId: "event-id-1" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockResult });
      const eventData: ExportTimelineEventPayload = {
        history_id: "hist-1",
        event_id: "evt-1",
        event: {
          timestamp: new Date().toISOString(),
          type: "agent",
          name: "start",
        },
      };
      const result = await apiClient.exportTimelineEvent(eventData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/export-timeline-event"),
        expect.objectContaining({
          body: JSON.stringify({
            publicKey: mockOptions.publicKey,
            clientSecretKey: mockOptions.secretKey,
            payload: eventData,
          }),
        }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("exportHistorySteps", () => {
    it('should call _callEdgeFunction with "export-history-steps" and the payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // Returns void
      const project_id = "proj-1";
      const history_id = "hist-1";
      const steps: HistoryStep[] = [{ type: "text", content: "Step 1" }];
      await apiClient.exportHistorySteps(project_id, history_id, steps);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/export-history-steps"),
        expect.objectContaining({
          body: JSON.stringify({
            publicKey: mockOptions.publicKey,
            clientSecretKey: mockOptions.secretKey,
            payload: { project_id, history_id, steps },
          }),
        }),
      );
    });
  });

  describe("updateAgentHistory", () => {
    it('should call _callEdgeFunction with "update-agent-history" and the payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // Returns void
      const project_id = "proj-1";
      const history_id = "hist-1";
      const updates: AgentHistoryUpdatableFields = { output: "new output" };
      await apiClient.updateAgentHistory(project_id, history_id, updates);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/update-agent-history"),
        expect.objectContaining({
          body: JSON.stringify({
            publicKey: mockOptions.publicKey,
            clientSecretKey: mockOptions.secretKey,
            payload: { project_id, history_id, updates },
          }),
        }),
      );
    });
  });

  describe("updateTimelineEvent", () => {
    it('should call _callEdgeFunction with "update-timeline-event" and the payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // Returns void
      const history_id = "hist-1";
      const event_id = "evt-1";
      const updates: TimelineEventUpdatableFields = {
        timestamp: new Date().toISOString(),
        type: "agent",
        name: "completed",
        status: "completed",
      };
      await apiClient.updateTimelineEvent(history_id, event_id, updates);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/update-timeline-event"),
        expect.objectContaining({
          body: JSON.stringify({
            publicKey: mockOptions.publicKey,
            clientSecretKey: mockOptions.secretKey,
            payload: { history_id, event_id, event: updates },
          }),
        }),
      );
    });
  });
});
