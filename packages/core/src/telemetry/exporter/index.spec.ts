import { VoltAgentExporter, type VoltAgentExporterOptions } from "./index";
import type {
  ExportAgentHistoryPayload,
  ExportTimelineEventPayload,
  AgentHistoryUpdatableFields,
} from "../client"; // Adjust path as necessary for types
import type { HistoryStep } from "../../agent/history"; // Adjust path as necessary

// Define top-level mocks for each method of TelemetryServiceApiClient
const mockExportAgentHistory = jest.fn();
const mockExportTimelineEvent = jest.fn();
const mockExportHistorySteps = jest.fn();
const mockUpdateAgentHistory = jest.fn();

// Mock TelemetryServiceApiClient
// The actual TelemetryServiceApiClient class is not imported directly for mocking purposes here,
// as jest.mock handles the module replacement.
jest.mock("../client", () => ({
  TelemetryServiceApiClient: jest.fn().mockImplementation(() => ({
    exportAgentHistory: mockExportAgentHistory,
    exportTimelineEvent: mockExportTimelineEvent,
    exportHistorySteps: mockExportHistorySteps,
    updateAgentHistory: mockUpdateAgentHistory,
  })),
}));

const mockOptions: VoltAgentExporterOptions = {
  baseUrl: "http://localhost:8000/functions/v1",
  publicKey: "test-public-key",
  secretKey: "test-secret-key",
};

describe("VoltAgentExporter", () => {
  let exporter: VoltAgentExporter;

  beforeEach(() => {
    // Reset all top-level mock functions before each test
    mockExportAgentHistory.mockReset();
    mockExportTimelineEvent.mockReset();
    mockExportHistorySteps.mockReset();
    mockUpdateAgentHistory.mockReset();

    exporter = new VoltAgentExporter(mockOptions);
  });

  describe("constructor", () => {
    it("should create an instance of TelemetryServiceApiClient with options", () => {
      // Access the mocked constructor directly via require, as jest.mock replaces the module.
      const MockedTelemetryServiceApiClient = require("../client").TelemetryServiceApiClient;
      expect(MockedTelemetryServiceApiClient).toHaveBeenCalledWith(mockOptions);
    });

    it("should expose the publicKey from options", () => {
      expect(exporter.publicKey).toBe(mockOptions.publicKey);
    });

    it("should replace server.voltagent.dev with api.voltagent.dev", () => {
      const optionsWithSpecificBaseUrl: VoltAgentExporterOptions = {
        ...mockOptions,
        baseUrl: "https://server.voltagent.dev/some/path",
      };
      // eslint-disable-next-line no-new
      new VoltAgentExporter(optionsWithSpecificBaseUrl);
      const MockedTelemetryServiceApiClient = require("../client").TelemetryServiceApiClient;
      expect(MockedTelemetryServiceApiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "https://api.voltagent.dev",
        }),
      );
    });
  });

  describe("exportHistoryEntry", () => {
    it("should call apiClient.exportAgentHistory with the provided data", async () => {
      const historyData: ExportAgentHistoryPayload = {
        project_id: "proj-1",
        history_id: "hist-1",
        startTime: new Date().toISOString(),
        status: "completed",
        input: { text: "hello" },
        agent_id: "agent-1",
      };
      const mockResponse = { id: "entry-123" };
      mockExportAgentHistory.mockResolvedValueOnce(mockResponse);

      const result = await exporter.exportHistoryEntry(historyData);

      expect(mockExportAgentHistory).toHaveBeenCalledWith(historyData);
      expect(result).toEqual({ historyEntryId: "entry-123" });
    });

    it("should re-throw errors from apiClient.exportAgentHistory", async () => {
      const historyData: ExportAgentHistoryPayload = {} as any;
      const error = new Error("API client failed");
      mockExportAgentHistory.mockRejectedValueOnce(error);

      await expect(exporter.exportHistoryEntry(historyData)).rejects.toThrow(error);
    });
  });

  describe("exportTimelineEvent", () => {
    it("should call apiClient.exportTimelineEvent with the provided data", async () => {
      const eventData: ExportTimelineEventPayload = {
        history_id: "hist-1",
        event_id: "evt-1",
        agent_id: "agent-1",
        event: {
          id: "evt-1",
          name: "agent:start",
          type: "agent",
          startTime: new Date().toISOString(),
          traceId: "hist-1",
          metadata: {
            id: "evt-1",
          },
          input: { input: "test input" },
        },
      };
      const mockResponse = { id: "event-456" };
      mockExportTimelineEvent.mockResolvedValueOnce(mockResponse);

      const result = await exporter.exportTimelineEvent(eventData);

      expect(mockExportTimelineEvent).toHaveBeenCalledWith(eventData);
      expect(result).toEqual({ timelineEventId: "event-456" });
    });

    it("should re-throw errors from apiClient.exportTimelineEvent", async () => {
      const eventData: ExportTimelineEventPayload = {} as any;
      const error = new Error("API client failed");
      mockExportTimelineEvent.mockRejectedValueOnce(error);

      await expect(exporter.exportTimelineEvent(eventData)).rejects.toThrow(error);
    });
  });

  describe("exportHistorySteps", () => {
    it("should call apiClient.exportHistorySteps with the provided data", async () => {
      const history_id = "hist-1";
      const steps: HistoryStep[] = [{ type: "text", content: "Step 1" }];
      mockExportHistorySteps.mockResolvedValueOnce(undefined as any);

      await exporter.exportHistorySteps(history_id, steps);

      expect(mockExportHistorySteps).toHaveBeenCalledWith(history_id, steps);
    });

    it("should re-throw errors from apiClient.exportHistorySteps", async () => {
      const error = new Error("API client failed");
      mockExportHistorySteps.mockRejectedValueOnce(error);

      await expect(exporter.exportHistorySteps("h1", [])).rejects.toThrow(error);
    });
  });

  describe("updateHistoryEntry", () => {
    it("should call apiClient.updateAgentHistory with the provided data", async () => {
      const history_id = "hist-1";
      const updates: Partial<AgentHistoryUpdatableFields> = {
        output: "new output",
      };
      mockUpdateAgentHistory.mockResolvedValueOnce(undefined as any);

      await exporter.updateHistoryEntry(history_id, updates);

      expect(mockUpdateAgentHistory).toHaveBeenCalledWith(history_id, updates);
    });

    it("should re-throw errors from apiClient.updateAgentHistory", async () => {
      const error = new Error("API client failed");
      mockUpdateAgentHistory.mockRejectedValueOnce(error);

      await expect(exporter.updateHistoryEntry("h1", {})).rejects.toThrow(error);
    });
  });
});
