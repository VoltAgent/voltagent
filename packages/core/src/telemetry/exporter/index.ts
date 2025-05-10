/**
 * Options for configuring the VoltAgentExporter.
 */
export interface VoltAgentExporterOptions {
  /**
   * The base URL for the Supabase Edge Functions.
   * e.g., "https://<your-project-id>.supabase.co/functions/v1"
   */
  edgeFunctionBaseUrl: string;

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
   * Optional Supabase anonymous key.
   * This might be needed if your Edge Functions require an Authorization: Bearer token
   * for invocation, even if they use service_role internally for database operations.
   * Typically, service_role functions don't strictly need this for invocation if called
   * directly via the functions URL, but it depends on your Supabase project's RLS
   * and function security settings (e.g., if you've set up JWT verification for functions).
   * For functions using `service_role` key internally and accessed via `supabase.functions.invoke`,
   * this might not be needed for the `Authorization` header for the invocation itself,
   * but the Supabase client might still require it for initialization.
   */
  supabaseAnonKey?: string;

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
  type TimelineEventUpdatableFields,
} from "../client";
import type { HistoryStep } from "../../agent/history";

export class VoltAgentExporter {
  private apiClient: TelemetryServiceApiClient;
  public readonly publicKey: string;

  constructor(options: VoltAgentExporterOptions) {
    this.apiClient = new TelemetryServiceApiClient(options);
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
    try {
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
      console.info(
        "[VoltAgentExporter] History entry exported successfully:",
        result.historyEntryId,
      );
      return result;
    } catch (error) {
      console.error("[VoltAgentExporter] Failed to export history entry:", error);
      // Decide on error handling: re-throw, return a specific error object, or silently fail.
      // For now, re-throwing to let the caller (HistoryManager) decide.
      throw error;
    }
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
    try {
      // TODO: Add any transformation or validation logic here if needed.
      // const payload: ExportTimelineEventPayload = {
      //   ...timelineEventData,
      //   event_timestamp: typeof timelineEventData.event_timestamp === 'string'
      //    ? timelineEventData.event_timestamp
      //    : (timelineEventData.event_timestamp as Date).toISOString(), // Example
      // };

      const result = await this.apiClient.exportTimelineEvent(timelineEventData); // Pass directly if already formatted
      console.info(
        "[VoltAgentExporter] Timeline event exported successfully:",
        result.timelineEventId,
      );
      return result;
    } catch (error) {
      console.error("[VoltAgentExporter] Failed to export timeline event:", error);
      throw error;
    }
  }

  /**
   * Exports history steps for a specific agent history entry.
   * @param project_id - The project ID associated with the history entry.
   * @param history_id - The ID of the history entry to export steps for.
   * @param steps - The steps data to export.
   * @returns A promise that resolves with the response from the telemetry service.
   */
  public async exportHistorySteps(
    project_id: string,
    history_id: string,
    steps: HistoryStep[],
  ): Promise<void> {
    try {
      await this.apiClient.exportHistorySteps(project_id, history_id, steps);
      console.info(
        `[VoltAgentExporter] History steps exported successfully for entry: ${history_id}`,
      );
      // No specific result to return for void methods
    } catch (error) {
      console.error(
        `[VoltAgentExporter] Failed to export history steps for entry ${history_id}:`,
        error,
      );
      throw error;
    }
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
    project_id: string,
    history_id: string,
    updates: Partial<AgentHistoryUpdatableFields>,
  ): Promise<void> {
    try {
      await this.apiClient.updateAgentHistory(project_id, history_id, updates);
      console.info(`[VoltAgentExporter] History entry ${history_id} updated successfully.`);
      // No specific result to return for void methods
    } catch (error) {
      console.error(`[VoltAgentExporter] Failed to update history entry ${history_id}:`, error);
      throw error;
    }
  }

  /**
   * Updates specific fields of a timeline event.
   * @param project_id - The project ID associated with the timeline event.
   * @param history_id - The ID of the parent history entry.
   * @param event_id - The ID of the timeline event to update.
   * @param updates - An object containing the fields to update.
   *                  Should conform to Partial<TimelineEventUpdatableFields>.
   * @returns A promise that resolves when the operation is complete.
   */
  public async updateTimelineEvent(
    history_id: string,
    event_id: string,
    updates: TimelineEventUpdatableFields,
  ): Promise<void> {
    if (!this.apiClient) {
      console.warn(
        "[VoltAgentExporter] TelemetryServiceApiClient is not initialized. Cannot update timeline event.",
      );
      return;
    }
    await this.apiClient.updateTimelineEvent(history_id, event_id, updates);
  }

  // TODO: Add methods for batch export if needed in the future.
  // public async exportBatch(entries: ExportAgentHistoryPayload[]): Promise<void> { ... }
}
