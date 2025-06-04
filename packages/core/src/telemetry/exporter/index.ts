/**
 * Options for configuring the VoltAgentExporter.
 */
export interface VoltAgentExporterOptions {
  /**
   * The base URL for the VoltAgent Edge Functions.
   */
  baseUrl: string;

  /**
   * The public API key for the project, used to identify the project
   * when sending telemetry data.
   */
  publicKey: string;

  /**
   * The client's secret key (obtained once during project creation)
   * used for authenticating requests to the telemetry Edge Functions.
   * This will be sent as 'clientSecretKey' in the request body.
   */
  secretKey: string;

  /**
   * Optional fetch implementation. Defaults to global fetch.
   * Useful for environments where global fetch might not be available or needs to be polyfilled (e.g., some Node.js versions).
   */
  fetch?: typeof fetch;
}

import {
  TelemetryServiceApiClient,
  type ExportAgentHistoryPayload,
  type ExportTimelineEventPayload,
  type AgentHistoryUpdatableFields,
} from "../client";
import type { HistoryStep } from "../../agent/history";

export class VoltAgentExporter {
  private apiClient: TelemetryServiceApiClient;
  public readonly publicKey: string;

  constructor(options: VoltAgentExporterOptions) {
    let baseUrl = options.baseUrl;
    if (baseUrl.includes("https://server.voltagent.dev")) {
      baseUrl = "https://api.voltagent.dev";
    }
    this.apiClient = new TelemetryServiceApiClient({ ...options, baseUrl });
    this.publicKey = options.publicKey;
  }

  /**
   * Exports a single agent history entry.
   * @param historyEntryData - The agent history data to export.
   *                           This should conform to ExportAgentHistoryPayload.
   * @returns A promise that resolves with the response from the telemetry service,
   *          typically including the ID of the created history entry.
   */
  public async exportHistoryEntry(
    historyEntryData: ExportAgentHistoryPayload,
  ): Promise<{ historyEntryId: string }> {
    // TODO: Add any transformation or validation logic here if needed
    // before sending to the API client.
    // For example, ensuring event_timestamp is correctly formatted if it's a Date object.
    // const payload: ExportAgentHistoryPayload = {
    //   ...historyEntryData,
    //   event_timestamp: typeof historyEntryData.event_timestamp === 'string'
    //     ? historyEntryData.event_timestamp
    //     : (historyEntryData.event_timestamp as Date).toISOString(), // Example: Convert Date to ISO string
    // };

    const result = await this.apiClient.exportAgentHistory(historyEntryData); // Pass directly if already formatted
    return {
      historyEntryId: result.id,
    };
  }

  /**
   * Exports a single timeline event.
   * (Placeholder for when the 'export-timeline-event' Edge Function is ready)
   * @param timelineEventData - The timeline event data to export.
   *                            This should conform to ExportTimelineEventPayload.
   * @returns A promise that resolves with the response from the telemetry service.
   */
  public async exportTimelineEvent(
    timelineEventData: ExportTimelineEventPayload,
  ): Promise<{ timelineEventId: string }> {
    // TODO: Add any transformation or validation logic here if needed.
    // const payload: ExportTimelineEventPayload = {
    //   ...timelineEventData,
    //   event_timestamp: typeof timelineEventData.event_timestamp === 'string'
    //    ? timelineEventData.event_timestamp
    //    : (timelineEventData.event_timestamp as Date).toISOString(), // Example
    // };

    const result = await this.apiClient.exportTimelineEvent(timelineEventData); // Pass directly if already formatted
    return {
      timelineEventId: result.id,
    };
  }

  /**
   * Exports history steps for a specific agent history entry.
   * @param project_id - The project ID associated with the history entry.
   * @param history_id - The ID of the history entry to export steps for.
   * @param steps - The steps data to export.
   * @returns A promise that resolves with the response from the telemetry service.
   */
  public async exportHistorySteps(history_id: string, steps: HistoryStep[]): Promise<void> {
    await this.apiClient.exportHistorySteps(history_id, steps);
    // No specific result to return for void methods
  }

  /**
   * Updates specific fields of an agent history entry.
   * @param project_id - The project ID associated with the history entry.
   * @param history_id - The ID of the history entry to update.
   * @param updates - An object containing the fields to update.
   *                  Should conform to Partial<AgentHistoryUpdatableFields>.
   * @returns A promise that resolves with the response from the telemetry service.
   */
  public async updateHistoryEntry(
    history_id: string,
    updates: Partial<AgentHistoryUpdatableFields>,
  ): Promise<void> {
    await this.apiClient.updateAgentHistory(history_id, updates);
    // No specific result to return for void methods
  }
}
