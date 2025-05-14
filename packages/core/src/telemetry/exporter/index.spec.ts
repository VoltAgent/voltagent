import { VoltAgentExporter, type VoltAgentExporterOptions } from "./index";
import type {
  ExportAgentHistoryPayload,
  ExportTimelineEventPayload,
  AgentHistoryUpdatableFields,
  TimelineEventUpdatableFields,
} from "../client"; // Adjust path as necessary for types
import type { HistoryStep } from "../../agent/history"; // Adjust path as necessary

// Define top-level mocks for each method of TelemetryServiceApiClient
const mockExportAgentHistory = jest.fn();
const mockExportTimelineEvent = jest.fn();
const mockExportHistorySteps = jest.fn();
const mockUpdateAgentHistory = jest.fn();
const mockUpdateTimelineEvent = jest.fn();

// Mock TelemetryServiceApiClient
// The actual TelemetryServiceApiClient class is not imported directly for mocking purposes here,
// as jest.mock handles the module replacement.
jest.mock("../client", () => ({
  TelemetryServiceApiClient: jest.fn().mockImplementation(() => ({
    exportAgentHistory: mockExportAgentHistory,
    exportTimelineEvent: mockExportTimelineEvent,
    exportHistorySteps: mockExportHistorySteps,
    updateAgentHistory: mockUpdateAgentHistory,
    updateTimelineEvent: mockUpdateTimelineEvent,
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
    mockUpdateTimelineEvent.mockReset();

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

    it("should append /functions/v1 to baseUrl if it contains https://server.voltagent.dev", () => {
      const optionsWithSpecificBaseUrl: VoltAgentExporterOptions = {
        ...mockOptions,
        baseUrl: "https://server.voltagent.dev/some/path",
      };
      // eslint-disable-next-line no-new
      new VoltAgentExporter(optionsWithSpecificBaseUrl);
      const MockedTelemetryServiceApiClient = require("../client").TelemetryServiceApiClient;
      expect(MockedTelemetryServiceApiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "https://server.voltagent.dev/some/path/functions/v1",
        }),
      );
    });
  });

  describe("exportHistoryEntry", () => {
    it("should call apiClient.exportAgentHistory with the provided data", async () => {
      const historyData: ExportAgentHistoryPayload = {
        project_id: "proj-1",
        history_id: "hist-1",
        timestamp: new Date().toISOString(),
        type: "agent_run",
        status: "completed",
        input: { text: "hello" },
        agent_id: "agent-1",
      };
      const mockResponse = { historyEntryId: "entry-123" };
      mockExportAgentHistory.mockResolvedValueOnce(mockResponse);

      const result = await exporter.exportHistoryEntry(historyData);

      expect(mockExportAgentHistory).toHaveBeenCalledWith(historyData);
      expect(result).toEqual(mockResponse);
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
        event: {
          timestamp: new Date().toISOString(),
          type: "agent" as any,
          name: "start",
        },
      };
      const mockResponse = { timelineEventId: "event-456" };
      mockExportTimelineEvent.mockResolvedValueOnce(mockResponse);

      const result = await exporter.exportTimelineEvent(eventData);

      expect(mockExportTimelineEvent).toHaveBeenCalledWith(eventData);
      expect(result).toEqual(mockResponse);
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
      const project_id = "proj-1";
      const history_id = "hist-1";
      const steps: HistoryStep[] = [{ type: "text", content: "Step 1" }];
      mockExportHistorySteps.mockResolvedValueOnce(undefined as any);

      await exporter.exportHistorySteps(project_id, history_id, steps);

      expect(mockExportHistorySteps).toHaveBeenCalledWith(project_id, history_id, steps);
    });

    it("should re-throw errors from apiClient.exportHistorySteps", async () => {
      const error = new Error("API client failed");
      mockExportHistorySteps.mockRejectedValueOnce(error);

      await expect(exporter.exportHistorySteps("p1", "h1", [])).rejects.toThrow(error);
    });
  });

  describe("updateHistoryEntry", () => {
    it("should call apiClient.updateAgentHistory with the provided data", async () => {
      const project_id = "proj-1";
      const history_id = "hist-1";
      const updates: Partial<AgentHistoryUpdatableFields> = {
        output: "new output",
      };
      mockUpdateAgentHistory.mockResolvedValueOnce(undefined as any);

      await exporter.updateHistoryEntry(project_id, history_id, updates);

      expect(mockUpdateAgentHistory).toHaveBeenCalledWith(project_id, history_id, updates);
    });

    it("should re-throw errors from apiClient.updateAgentHistory", async () => {
      const error = new Error("API client failed");
      mockUpdateAgentHistory.mockRejectedValueOnce(error);

      await expect(exporter.updateHistoryEntry("p1", "h1", {})).rejects.toThrow(error);
    });
  });

  describe("updateTimelineEvent", () => {
    it("should call apiClient.updateTimelineEvent with the provided data", async () => {
      const history_id = "hist-1";
      const event_id = "evt-1";
      const updates: TimelineEventUpdatableFields = { status: "completed" };
      mockUpdateTimelineEvent.mockResolvedValueOnce(undefined as any);

      await exporter.updateTimelineEvent(history_id, event_id, updates);

      expect(mockUpdateTimelineEvent).toHaveBeenCalledWith(history_id, event_id, updates);
    });

    it("should re-throw errors from apiClient.updateTimelineEvent if apiClient is present", async () => {
      const error = new Error("API client failed");
      mockUpdateTimelineEvent.mockRejectedValueOnce(error);

      await expect(
        exporter.updateTimelineEvent("h1", "e1", { status: "completed" }),
      ).rejects.toThrow(error);
    });
  });
});
